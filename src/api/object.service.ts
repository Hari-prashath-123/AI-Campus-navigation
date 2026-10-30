import { apiClient } from './client';
import { objectStore, ObjectDeletionSafetyReport } from './object.store';
import { authGuard } from './auth-guard';
import { auditService } from './audit.service';
import { MapObject, CreateMapObjectInput, ApiResponse } from '../types';

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

    const tokens = q.split(/\s+/).filter(t => t.length > 1);
    const campusObjs = objectStore.getByCampus(campusId, includeArchived);
    const matches = campusObjs.filter((obj) => {
      const codeMatch = obj.code?.toLowerCase().includes(q);

      const nameValues = typeof obj.name === 'string'
        ? [obj.name]
        : Object.values(obj.name || {});
      const nameMatch = nameValues.some(v => typeof v === 'string' && v.toLowerCase().includes(q));

      const descValues = obj.description
        ? (typeof obj.description === 'string' ? [obj.description] : Object.values(obj.description || {}))
        : [];
      const descMatch = descValues.some(v => typeof v === 'string' && v.toLowerCase().includes(q));

      const historyValues = obj.historicalInfo
        ? (typeof obj.historicalInfo === 'string' ? [obj.historicalInfo] : Object.values(obj.historicalInfo || {}))
        : [];
      const historyMatch = historyValues.some(v => typeof v === 'string' && v.toLowerCase().includes(q));

      const tagsMatch = obj.tags?.some(tag => tag.toLowerCase().includes(q));
      const categoryMatch = String(obj.category || '').toLowerCase().includes(q);
      const zoneMatch = obj.subZoneType?.toLowerCase().includes(q);

      // Multi-token match across all fields (e.g. "Robotics lab" matches "Robotics & Vision Lab 201")
      const combinedText = [
        obj.code || '',
        ...nameValues.filter((v): v is string => typeof v === 'string'),
        ...descValues.filter((v): v is string => typeof v === 'string'),
        ...(obj.tags || []),
        String(obj.category || ''),
      ].join(' ').toLowerCase();
      const allTokensMatch = tokens.length > 1 && tokens.every(token => combinedText.includes(token));

      return codeMatch || nameMatch || descMatch || historyMatch || tagsMatch || categoryMatch || zoneMatch || allTokensMatch;
    });

    // Sort by relevance: exact match in name/code first, then prefix, then general inclusion
    matches.sort((a, b) => {
      const aRaw = a.name as unknown;
      const bRaw = b.name as unknown;
      const aNames: string[] = typeof aRaw === 'string'
        ? [aRaw.toLowerCase()]
        : Object.values(a.name || {}).map(v => String(v).toLowerCase());
      const bNames: string[] = typeof bRaw === 'string'
        ? [bRaw.toLowerCase()]
        : Object.values(b.name || {}).map(v => String(v).toLowerCase());
      
      const aExact = aNames.includes(q) || a.code?.toLowerCase() === q;
      const bExact = bNames.includes(q) || b.code?.toLowerCase() === q;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStarts = aNames.some(n => n.startsWith(q));
      const bStarts = bNames.some(n => n.startsWith(q));
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return 0;
    });

    return apiClient.simulateNetwork(matches);
  }

  public async createObject(input: CreateMapObjectInput): Promise<ApiResponse<MapObject>> {
    const user = await authGuard.enforce('create', 'object', { campusId: input.campusId });
    const newObj = objectStore.create(input);
    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'CREATE',
      resourceType: 'object',
      resourceId: newObj.id,
      campusId: newObj.campusId,
      status: 'SUCCESS',
    });
    return apiClient.simulateNetwork(newObj);
  }

  public async createChildZone(parentObjectId: string, zoneData: Partial<MapObject>): Promise<ApiResponse<MapObject>> {
    const parent = objectStore.getById(parentObjectId);
    const user = await authGuard.enforce('create', 'object', { campusId: parent?.campusId });
    const newZone = objectStore.createChildZone(parentObjectId, zoneData);
    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'CREATE',
      resourceType: 'object',
      resourceId: newZone.id,
      campusId: newZone.campusId,
      status: 'SUCCESS',
    });
    return apiClient.simulateNetwork(newZone);
  }

  public async duplicateObject(id: string, overrides: Partial<MapObject> = {}): Promise<ApiResponse<MapObject>> {
    try {
      const original = objectStore.getById(id);
      const user = await authGuard.enforce('create', 'object', { campusId: original?.campusId });
      const duplicated = objectStore.duplicate(id, overrides);
      auditService.log({
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'CREATE',
        resourceType: 'object',
        resourceId: duplicated.id,
        campusId: duplicated.campusId,
        status: 'SUCCESS',
      });
      return apiClient.simulateNetwork(duplicated);
    } catch (err: any) {
      return { success: false, message: err.message, data: null as any, timestamp: new Date().toISOString() };
    }
  }

  public async archiveObject(id: string): Promise<ApiResponse<MapObject>> {
    const existing = objectStore.getById(id);
    const user = await authGuard.enforce('update', 'object', { campusId: existing?.campusId });
    const archived = objectStore.archive(id);
    if (!archived) {
      return { success: false, message: 'Object not found', data: null as any, timestamp: new Date().toISOString() };
    }
    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'ARCHIVE',
      resourceType: 'object',
      resourceId: id,
      campusId: existing?.campusId,
      status: 'SUCCESS',
    });
    return apiClient.simulateNetwork(archived);
  }

  public async unarchiveObject(id: string): Promise<ApiResponse<MapObject>> {
    const existing = objectStore.getById(id);
    const user = await authGuard.enforce('update', 'object', { campusId: existing?.campusId });
    const unarchived = objectStore.unarchive(id);
    if (!unarchived) {
      return { success: false, message: 'Object not found', data: null as any, timestamp: new Date().toISOString() };
    }
    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'UNARCHIVE',
      resourceType: 'object',
      resourceId: id,
      campusId: existing?.campusId,
      status: 'SUCCESS',
    });
    return apiClient.simulateNetwork(unarchived);
  }

  public async canDeleteObject(id: string): Promise<ApiResponse<ObjectDeletionSafetyReport>> {
    const report = objectStore.canDelete(id);
    return apiClient.simulateNetwork(report);
  }

  public async updateObject(id: string, patch: Partial<MapObject>): Promise<ApiResponse<MapObject>> {
    const existing = objectStore.getById(id);
    const user = await authGuard.enforce('update', 'object', { campusId: existing?.campusId });
    const updated = objectStore.update(id, patch);
    if (!updated) {
      return { success: false, message: 'Object not found', data: null as any, timestamp: new Date().toISOString() };
    }
    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'UPDATE',
      resourceType: 'object',
      resourceId: id,
      campusId: existing?.campusId,
      status: 'SUCCESS',
    });
    return apiClient.simulateNetwork(updated);
  }

  public async deleteObject(id: string, force = false): Promise<ApiResponse<boolean>> {
    const existing = objectStore.getById(id);
    const user = await authGuard.enforce('delete', 'object', { campusId: existing?.campusId });
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
    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'DELETE',
      resourceType: 'object',
      resourceId: id,
      campusId: existing?.campusId,
      status: 'SUCCESS',
    });
    return apiClient.simulateNetwork(success);
  }
}

export const objectService = ObjectService.getInstance();
