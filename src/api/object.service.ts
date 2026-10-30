import { apiClient } from './client';
import { objectStore, ObjectDeletionSafetyReport } from './object.store';
import { MapObject, CreateMapObjectInput, ApiResponse } from '../types';
import { resolveLocalizedString } from '../utils/i18n';

/**
 * MapObject / POI Service Abstraction
 * Unified adapter over the authoritative objectStore (localStorage-backed).
 */
export class ObjectService {
  private static instance: ObjectService;

  private constructor() {}

  public static getInstance(): ObjectService {
    if (!ObjectService.instance) {
      ObjectService.instance = new ObjectService();
    }
    return ObjectService.instance;
  }

  public async getObjectsByCampus(campusId: string, includeArchived = false): Promise<ApiResponse<MapObject[]>> {
    const items = objectStore.getByCampus(campusId, includeArchived);
    return apiClient.simulateNetwork(items);
  }

  public async getObjectById(objectId: string): Promise<ApiResponse<MapObject>> {
    const obj = objectStore.getById(objectId);
    if (!obj) {
      return { success: false, message: 'Object not found', data: null as any, timestamp: new Date().toISOString() };
    }
    return apiClient.simulateNetwork(obj);
  }

  public async getObjectsByFloor(floorId: string, includeArchived = false): Promise<ApiResponse<MapObject[]>> {
    const items = objectStore.getByFloor(floorId, includeArchived);
    return apiClient.simulateNetwork(items);
  }

  public async getChildZones(parentObjectId: string, includeArchived = false): Promise<ApiResponse<MapObject[]>> {
    const items = objectStore.getChildZones(parentObjectId, includeArchived);
    return apiClient.simulateNetwork(items);
  }

  public async searchObjects(campusId: string, query: string, includeArchived = false): Promise<ApiResponse<MapObject[]>> {
    const q = query.toLowerCase().trim();
    if (!q) return this.getObjectsByCampus(campusId, includeArchived);

    const campusObjs = objectStore.getByCampus(campusId, includeArchived);
    const matches = campusObjs.filter((obj) => {
      const codeMatch = obj.code?.toLowerCase().includes(q);
      const nameMatch = resolveLocalizedString(obj.name).toLowerCase().includes(q);
      const categoryMatch = String(obj.category || '').toLowerCase().includes(q);
      const zoneMatch = obj.subZoneType?.toLowerCase().includes(q);
      return codeMatch || nameMatch || categoryMatch || zoneMatch;
    });

    return apiClient.simulateNetwork(matches);
  }

  public async createObject(input: CreateMapObjectInput): Promise<ApiResponse<MapObject>> {
    const newObj = objectStore.create(input);
    return apiClient.simulateNetwork(newObj);
  }

  public async createChildZone(parentObjectId: string, zoneData: Partial<MapObject>): Promise<ApiResponse<MapObject>> {
    const newZone = objectStore.createChildZone(parentObjectId, zoneData);
    return apiClient.simulateNetwork(newZone);
  }

  public async duplicateObject(id: string, overrides: Partial<MapObject> = {}): Promise<ApiResponse<MapObject>> {
    try {
      const duplicated = objectStore.duplicate(id, overrides);
      return apiClient.simulateNetwork(duplicated);
    } catch (err: any) {
      return { success: false, message: err.message, data: null as any, timestamp: new Date().toISOString() };
    }
  }

  public async archiveObject(id: string): Promise<ApiResponse<MapObject>> {
    const archived = objectStore.archive(id);
    if (!archived) {
      return { success: false, message: 'Object not found', data: null as any, timestamp: new Date().toISOString() };
    }
    return apiClient.simulateNetwork(archived);
  }

  public async unarchiveObject(id: string): Promise<ApiResponse<MapObject>> {
    const unarchived = objectStore.unarchive(id);
    if (!unarchived) {
      return { success: false, message: 'Object not found', data: null as any, timestamp: new Date().toISOString() };
    }
    return apiClient.simulateNetwork(unarchived);
  }

  public async canDeleteObject(id: string): Promise<ApiResponse<ObjectDeletionSafetyReport>> {
    const report = objectStore.canDelete(id);
    return apiClient.simulateNetwork(report);
  }

  public async updateObject(id: string, patch: Partial<MapObject>): Promise<ApiResponse<MapObject>> {
    const updated = objectStore.update(id, patch);
    if (!updated) {
      return { success: false, message: 'Object not found', data: null as any, timestamp: new Date().toISOString() };
    }
    return apiClient.simulateNetwork(updated);
  }

  public async deleteObject(id: string, force = false): Promise<ApiResponse<boolean>> {
    const safety = objectStore.canDelete(id);
    if (!safety.canDelete && !force) {
      return {
        success: false,
        message: `Cannot safely delete object: ${safety.issues.join(' ')} Use force=true to delete with child sub-zones.`,
        data: false,
        timestamp: new Date().toISOString(),
      };
    }

    const success = objectStore.delete(id, force);
    return apiClient.simulateNetwork(success);
  }
}

export const objectService = ObjectService.getInstance();
