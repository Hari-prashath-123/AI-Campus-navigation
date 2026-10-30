import { Point2D } from '../types/common';
import { ObjectType } from '../types/object-type';
import { campusService } from '../api/campus.service';
import { navStore } from '../api/nav.store';
import { objectStore } from '../api/object.store';
import { objectTypeService } from '../api/object-type.service';
import { ValidationError } from './errors';

export interface CoordinateBounds {
  maxWidth?: number;
  maxHeight?: number;
}

export interface ReferenceIntegrityInput {
  campusId: string;
  buildingId?: string;
  floorId?: string;
  associatedNodeId?: string;
  entranceNodeIds?: string[];
  parentObjectId?: string;
  objectTypeId?: string;
}

export const securityValidation = {
  /**
   * Validates 2D planar map coordinates.
   */
  validateCoordinates: (point: Point2D, bounds?: CoordinateBounds): void => {
    if (!point || typeof point !== 'object') {
      throw new ValidationError('Coordinates must be provided as an object with numeric x and y.');
    }
    const { x, y } = point;
    if (typeof x !== 'number' || isNaN(x) || !isFinite(x)) {
      throw new ValidationError(`Invalid X coordinate: expected a finite number, received '${x}'.`);
    }
    if (typeof y !== 'number' || isNaN(y) || !isFinite(y)) {
      throw new ValidationError(`Invalid Y coordinate: expected a finite number, received '${y}'.`);
    }

    if (x < 0 || y < 0) {
      throw new ValidationError(`Coordinates must be non-negative: received (${x}, ${y}).`);
    }

    if (bounds?.maxWidth !== undefined && x > bounds.maxWidth) {
      throw new ValidationError(`X coordinate ${x} exceeds floor plan width ${bounds.maxWidth}.`);
    }
    if (bounds?.maxHeight !== undefined && y > bounds.maxHeight) {
      throw new ValidationError(`Y coordinate ${y} exceeds floor plan height ${bounds.maxHeight}.`);
    }
  },

  /**
   * Validates GeoJSON geometry structure and linear ring closure.
   */
  validateGeoJson: (geometry: any): void => {
    if (!geometry) return;
    if (typeof geometry !== 'object' || !geometry.type) {
      throw new ValidationError('GeoJSON geometry must be an object with a valid type.');
    }

    const validTypes = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'];
    if (!validTypes.includes(geometry.type)) {
      throw new ValidationError(`Unsupported GeoJSON geometry type '${geometry.type}'.`);
    }

    if (!Array.isArray(geometry.coordinates)) {
      throw new ValidationError('GeoJSON coordinates must be an array.');
    }

    if (geometry.type === 'Point') {
      const [x, y] = geometry.coordinates;
      if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
        throw new ValidationError('Point coordinates must be two finite numbers.');
      }
    }

    if (geometry.type === 'Polygon') {
      for (const ring of geometry.coordinates) {
        if (!Array.isArray(ring) || ring.length < 4) {
          throw new ValidationError('Polygon linear ring must contain at least 4 coordinate positions.');
        }

        for (const pos of ring) {
          if (!Array.isArray(pos) || pos.length < 2 || typeof pos[0] !== 'number' || typeof pos[1] !== 'number' || !isFinite(pos[0]) || !isFinite(pos[1])) {
            throw new ValidationError('Polygon positions must be arrays of finite numbers.');
          }
        }

        // Verify closure: first position equals last position
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          throw new ValidationError('Polygon linear ring must be closed (first and last coordinate must match).');
        }
      }
    }
  },

  /**
   * Validates dynamic object properties against the ObjectType property definitions schema.
   */
  validateObjectProperties: (properties: Record<string, unknown> = {}, objectType: ObjectType): void => {
    if (!objectType.propertyDefinitions) return;

    for (const def of objectType.propertyDefinitions) {
      const val = properties[def.key];

      // 1. Required check
      if (def.required && (val === undefined || val === null || val === '')) {
        throw new ValidationError(`Missing required property '${def.label || def.key}' for object type '${objectType.name}'.`);
      }

      if (val === undefined || val === null) continue;

      // 2. Type checks
      switch (def.type) {
        case 'text':
          if (typeof val !== 'string') {
            throw new ValidationError(`Property '${def.key}' must be a string.`);
          }
          break;
        case 'number':
          if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
            throw new ValidationError(`Property '${def.key}' must be a valid number.`);
          }
          if (def.min !== undefined && val < def.min) {
            throw new ValidationError(`Property '${def.key}' value ${val} is below minimum allowed ${def.min}.`);
          }
          if (def.max !== undefined && val > def.max) {
            throw new ValidationError(`Property '${def.key}' value ${val} exceeds maximum allowed ${def.max}.`);
          }
          break;
        case 'boolean':
          if (typeof val !== 'boolean') {
            throw new ValidationError(`Property '${def.key}' must be a boolean.`);
          }
          break;
        case 'select':
          if (typeof val !== 'string') {
            throw new ValidationError(`Property '${def.key}' must be a string select value.`);
          }
          if (def.options && def.options.length > 0 && !def.options.some(o => o.value === val)) {
            throw new ValidationError(
              `Property '${def.key}' value '${val}' is not one of the allowed options: [${def.options.map(o => o.value).join(', ')}].`
            );
          }
          break;
        case 'multi_select':
          if (!Array.isArray(val)) {
            throw new ValidationError(`Property '${def.key}' must be an array of selected options.`);
          }
          if (def.options && def.options.length > 0) {
            for (const item of val) {
              if (!def.options.some(o => o.value === item)) {
                throw new ValidationError(`Property '${def.key}' item '${item}' is not an allowed option.`);
              }
            }
          }
          break;
      }
    }
  },

  /**
   * Validates foreign-key referential integrity across campuses, buildings, floors, and graph nodes.
   */
  validateReferenceIntegrity: async (refs: ReferenceIntegrityInput): Promise<void> => {
    // 1. Campus existence
    const campusRes = await campusService.getCampusById(refs.campusId);
    if (!campusRes.success || !campusRes.data) {
      throw new ValidationError(`Foreign-key reference error: Campus '${refs.campusId}' does not exist.`);
    }

    // 2. Building existence & campus association
    if (refs.buildingId) {
      const bldRes = await campusService.getBuildingById(refs.buildingId);
      if (!bldRes.success || !bldRes.data) {
        throw new ValidationError(`Foreign-key reference error: Building '${refs.buildingId}' does not exist.`);
      }
      if (bldRes.data.campusId !== refs.campusId) {
        throw new ValidationError(
          `Referential mismatch: Building '${refs.buildingId}' belongs to campus '${bldRes.data.campusId}', not '${refs.campusId}'.`
        );
      }
    }

    // 3. Floor existence & building association
    if (refs.floorId) {
      const flrRes = await campusService.getFloorById(refs.floorId);
      if (!flrRes.success || !flrRes.data) {
        throw new ValidationError(`Foreign-key reference error: Floor '${refs.floorId}' does not exist.`);
      }
      if (flrRes.data.campusId !== refs.campusId) {
        throw new ValidationError(
          `Referential mismatch: Floor '${refs.floorId}' belongs to campus '${flrRes.data.campusId}', not '${refs.campusId}'.`
        );
      }
      if (refs.buildingId && flrRes.data.buildingId !== refs.buildingId) {
        throw new ValidationError(
          `Referential mismatch: Floor '${refs.floorId}' belongs to building '${flrRes.data.buildingId}', not '${refs.buildingId}'.`
        );
      }
    }

    // 4. Associated navigation node existence
    if (refs.associatedNodeId) {
      const node = navStore.getNodeById(refs.associatedNodeId);
      if (!node) {
        throw new ValidationError(`Foreign-key reference error: Navigation node '${refs.associatedNodeId}' does not exist.`);
      }
      if (node.campusId !== refs.campusId) {
        throw new ValidationError(
          `Referential mismatch: Associated node '${refs.associatedNodeId}' belongs to campus '${node.campusId}', not '${refs.campusId}'.`
        );
      }
      if (refs.floorId && node.floorId && node.floorId !== refs.floorId) {
        throw new ValidationError(
          `Referential mismatch: Associated node '${refs.associatedNodeId}' is on floor '${node.floorId}', not '${refs.floorId}'.`
        );
      }
    }

    // 5. Entrance node IDs existence
    if (refs.entranceNodeIds && refs.entranceNodeIds.length > 0) {
      for (const entranceId of refs.entranceNodeIds) {
        const node = navStore.getNodeById(entranceId);
        if (!node) {
          throw new ValidationError(`Foreign-key reference error: Entrance node '${entranceId}' does not exist.`);
        }
      }
    }

    // 6. Parent object existence
    if (refs.parentObjectId) {
      const parent = objectStore.getById(refs.parentObjectId);
      if (!parent) {
        throw new ValidationError(`Foreign-key reference error: Parent object '${refs.parentObjectId}' does not exist.`);
      }
      if (refs.floorId && parent.floorId !== refs.floorId) {
        throw new ValidationError(
          `Referential mismatch: Parent object '${refs.parentObjectId}' is on floor '${parent.floorId}', not '${refs.floorId}'.`
        );
      }
    }

    // 7. Object type template existence
    if (refs.objectTypeId) {
      const typeRes = await objectTypeService.getById(refs.objectTypeId);
      if (!typeRes.success || !typeRes.data) {
        throw new ValidationError(`Foreign-key reference error: ObjectType '${refs.objectTypeId}' does not exist.`);
      }
    }
  },
};

