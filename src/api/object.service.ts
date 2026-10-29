import { apiClient } from './client';
import { objectStore } from './object.store';
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

  public async getObjectsByCampus(campusId: string): Promise<ApiResponse<MapObject[]>> {
    const items = objectStore.getByCampus(campusId);
    return apiClient.simulateNetwork(items);
  }

  public async getObjectById(objectId: string): Promise<ApiResponse<MapObject>> {
    const obj = objectStore.getById(objectId);
    if (!obj) {
      return { success: false, message: 'Object not found', data: null as any, timestamp: new Date().toISOString() };
    }
    return apiClient.simulateNetwork(obj);
  }

  public async getObjectsByFloor(floorId: string): Promise<ApiResponse<MapObject[]>> {
    const items = objectStore.getByFloor(floorId);
    return apiClient.simulateNetwork(items);
  }

  public async searchObjects(campusId: string, query: string): Promise<ApiResponse<MapObject[]>> {
    const q = query.toLowerCase().trim();
    if (!q) return this.getObjectsByCampus(campusId);

    const campusObjs = objectStore.getByCampus(campusId);
    const matches = campusObjs.filter((obj) => {
      const codeMatch = obj.code?.toLowerCase().includes(q);
      const nameMatch = resolveLocalizedString(obj.name).toLowerCase().includes(q);
      const categoryMatch = String(obj.category || '').toLowerCase().includes(q);
      return codeMatch || nameMatch || categoryMatch;
    });

    return apiClient.simulateNetwork(matches);
  }

  public async createObject(input: CreateMapObjectInput): Promise<ApiResponse<MapObject>> {
    const newObj = objectStore.create(input);
    return apiClient.simulateNetwork(newObj);
  }

  public async updateObject(id: string, patch: Partial<MapObject>): Promise<ApiResponse<MapObject>> {
    const updated = objectStore.update(id, patch);
    if (!updated) {
      return { success: false, message: 'Object not found', data: null as any, timestamp: new Date().toISOString() };
    }
    return apiClient.simulateNetwork(updated);
  }

  public async deleteObject(id: string): Promise<ApiResponse<boolean>> {
    const success = objectStore.delete(id);
    return apiClient.simulateNetwork(success);
  }
}

export const objectService = ObjectService.getInstance();
