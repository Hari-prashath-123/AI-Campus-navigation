import { MapObject } from '../types/object';
import { INITIAL_MAP_OBJECTS } from './mock-data';
import { securityValidation } from '../utils/security-validation';
import { transactionService } from './transaction.service';
import { v4 as uuidv4 } from 'uuid';

const LS_OBJECTS = 'omnicampus_objects';

function load<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch {}
  return fallback;
}
function save<T>(key: string, data: T[]) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

let objects: MapObject[] = load<MapObject>(LS_OBJECTS, INITIAL_MAP_OBJECTS);

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach(fn => fn()); }

export interface ObjectDeletionSafetyReport {
  canDelete: boolean;
  issues: string[];
  childZonesCount: number;
}

export const objectStore = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  getAll(includeArchived = false): MapObject[] {
    if (includeArchived) return [...objects];
    return objects.filter(o => !o.isArchived && o.status !== 'archived');
  },

  getByCampus(campusId: string, includeArchived = false): MapObject[] {
    return objects.filter(o => o.campusId === campusId && (includeArchived || (!o.isArchived && o.status !== 'archived')));
  },

  getByBuilding(buildingId: string, includeArchived = false): MapObject[] {
    return objects.filter(o => o.buildingId === buildingId && (includeArchived || (!o.isArchived && o.status !== 'archived')));
  },

  getByFloor(floorId: string, includeArchived = false): MapObject[] {
    return objects.filter(o => o.floorId === floorId && (includeArchived || (!o.isArchived && o.status !== 'archived')));
  },

  getById(id: string): MapObject | undefined {
    return objects.find(o => o.id === id);
  },

  getChildZones(parentObjectId: string, includeArchived = false): MapObject[] {
    return objects.filter(o => o.parentObjectId === parentObjectId && (includeArchived || (!o.isArchived && o.status !== 'archived')));
  },

  search(campusId: string, query: string, includeArchived = false): MapObject[] {
    const q = query.toLowerCase().trim();
    return objects.filter(o => {
      if (o.campusId !== campusId) return false;
      if (!includeArchived && (o.isArchived || o.status === 'archived')) return false;
      if (!q) return true;
      const name = typeof o.name === 'string' ? o.name : (o.name as any).en || '';
      return (
        name.toLowerCase().includes(q) ||
        o.code?.toLowerCase().includes(q) ||
        o.category?.toLowerCase().includes(q) ||
        o.subZoneType?.toLowerCase().includes(q)
      );
    });
  },

  create(data: Partial<MapObject>): MapObject {
    if (data.coordinates) {
      securityValidation.validateCoordinates(data.coordinates);
    }
    if (data.geometry) {
      securityValidation.validateGeoJson(data.geometry);
    }

    const now = new Date().toISOString();
    const obj: MapObject = {
      id: data.id || uuidv4(),
      campusId: data.campusId || '',
      buildingId: data.buildingId || '',
      floorId: data.floorId || '',
      code: data.code || `OBJ-${Math.floor(Math.random() * 9000 + 1000)}`,
      name: data.name || { en: 'New Object' },
      description: data.description,
      category: data.category || 'room',
      status: data.status || 'active',
      isArchived: data.isArchived ?? false,
      parentObjectId: data.parentObjectId,
      subZoneType: data.subZoneType,
      accessSchedule: data.accessSchedule,
      coordinates: data.coordinates || { x: 0, y: 0 },
      associatedNodeId: data.associatedNodeId || '',
      entranceNodeIds: data.entranceNodeIds || (data.associatedNodeId ? [data.associatedNodeId] : []),
      isAccessible: data.isAccessible ?? true,
      tags: data.tags || [],
      properties: data.properties || {},
      attributes: data.attributes || {},
      objectTypeId: data.objectTypeId,
      geometry: data.geometry,
      geometryType: data.geometryType,
      createdAt: now,
      updatedAt: now,
    };
    objects = [...objects, obj];
    save(LS_OBJECTS, objects);
    notify();
    return obj;
  },

  createChildZone(parentObjectId: string, zoneData: Partial<MapObject>): MapObject {
    const parent = this.getById(parentObjectId);
    if (!parent) {
      throw new Error(`Parent object ${parentObjectId} not found.`);
    }

    return this.create({
      ...zoneData,
      campusId: parent.campusId,
      buildingId: parent.buildingId,
      floorId: parent.floorId,
      parentObjectId,
      category: zoneData.category || 'room',
      subZoneType: zoneData.subZoneType || 'workstation',
      coordinates: zoneData.coordinates || { ...parent.coordinates },
      associatedNodeId: zoneData.associatedNodeId || parent.associatedNodeId,
      entranceNodeIds: zoneData.entranceNodeIds || parent.entranceNodeIds,
    });
  },

  update(id: string, patch: Partial<MapObject>): MapObject | null {
    if (patch.coordinates) {
      securityValidation.validateCoordinates(patch.coordinates);
    }
    if (patch.geometry) {
      securityValidation.validateGeoJson(patch.geometry);
    }
    const idx = objects.findIndex(o => o.id === id);
    if (idx === -1) return null;
    const updated = { ...objects[idx], ...patch, updatedAt: new Date().toISOString() };
    objects = objects.map(o => o.id === id ? updated : o);
    save(LS_OBJECTS, objects);
    notify();
    return updated;
  },

  duplicate(id: string, overrides: Partial<MapObject> = {}): MapObject {
    const original = this.getById(id);
    if (!original) {
      throw new Error(`Cannot duplicate: Object ${id} not found.`);
    }

    const codeBase = original.code || 'OBJ';
    const newCode = overrides.code || `${codeBase}-COPY`;
    const newName = overrides.name || (
      typeof original.name === 'string'
        ? { en: `${original.name} (Copy)` }
        : { ...original.name, en: `${original.name?.en || 'Room'} (Copy)` }
    );

    const duplicated = this.create({
      ...original,
      id: uuidv4(),
      code: newCode,
      name: newName,
      coordinates: overrides.coordinates || {
        x: Math.round(original.coordinates.x + 2),
        y: Math.round(original.coordinates.y + 2),
      },
      status: 'active',
      isArchived: false,
      ...overrides,
    });

    return duplicated;
  },

  archive(id: string): MapObject | null {
    return this.update(id, {
      status: 'archived',
      isArchived: true,
    });
  },

  unarchive(id: string): MapObject | null {
    return this.update(id, {
      status: 'active',
      isArchived: false,
    });
  },

  canDelete(id: string): ObjectDeletionSafetyReport {
    const childZones = objects.filter(o => o.parentObjectId === id);
    const issues: string[] = [];

    if (childZones.length > 0) {
      issues.push(`Object has ${childZones.length} internal child zone(s) / workstation(s) linked to it.`);
    }

    return {
      canDelete: issues.length === 0,
      issues,
      childZonesCount: childZones.length,
    };
  },

  delete(id: string, force = false): boolean {
    const obj = objects.find(o => o.id === id);
    if (!obj) return false;

    const safety = this.canDelete(id);
    if (!safety.canDelete && !force) {
      return false;
    }

    // Clean up orphaned navigation nodes & edges
    transactionService.cleanupOrphanedNodesForObject(id);

    // If force, also clean or detach child zones
    if (force && safety.childZonesCount > 0) {
      objects = objects.filter(o => o.parentObjectId !== id);
    }

    objects = objects.filter(o => o.id !== id);
    save(LS_OBJECTS, objects);
    notify();
    return true;
  },

  deleteByFloor(floorId: string): void {
    objects = objects.filter(o => o.floorId !== floorId);
    save(LS_OBJECTS, objects);
    notify();
  },

  reset(newObjects?: MapObject[]): void {
    objects = newObjects ? [...newObjects] : [...INITIAL_MAP_OBJECTS];
    save(LS_OBJECTS, objects);
    notify();
  },
};
