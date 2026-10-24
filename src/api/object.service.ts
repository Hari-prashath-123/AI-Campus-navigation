import { apiClient } from './client';
import { INITIAL_MAP_OBJECTS } from './mock-data';
import { MapObject, CreateMapObjectInput, ApiResponse } from '../types';
import { generateEntityId } from '../utils/validation';
import { resolveLocalizedString } from '../utils/i18n';

/**
 * MapObject / POI Service Abstraction
 */
export class ObjectService {
  private static instance: ObjectService;
  private objects: MapObject[] = [...INITIAL_MAP_OBJECTS];

  private constructor() {}

  public static getInstance(): ObjectService {
    if (!ObjectService.instance) {
      ObjectService.instance = new ObjectService();
    }
    return ObjectService.instance;
  }

  public async getObjectsByCampus(campusId: string): Promise<ApiResponse<MapObject[]>> {
    const items = this.objects.filter((obj) => obj.campusId === campusId);
    return apiClient.simulateNetwork(items);
  }

  public async getObjectById(objectId: string): Promise<ApiResponse<MapObject>> {
    const obj = this.objects.find((o) => o.id === objectId);
    if (!obj) return { success: false, message: 'Object not found', data: null as any, timestamp: new Date().toISOString() };
    return apiClient.simulateNetwork(obj);
  }

  public async getObjectsByFloor(floorId: string): Promise<ApiResponse<MapObject[]>> {
    const items = this.objects.filter((obj) => obj.floorId === floorId);
    return apiClient.simulateNetwork(items);
  }

  public async searchObjects(campusId: string, query: string): Promise<ApiResponse<MapObject[]>> {
    const q = query.toLowerCase().trim();
    if (!q) return this.getObjectsByCampus(campusId);

    const matches = this.objects.filter((obj) => {
      if (obj.campusId !== campusId) return false;
      const codeMatch = obj.code.toLowerCase().includes(q);
      const nameMatch = resolveLocalizedString(obj.name).toLowerCase().includes(q);
      const categoryMatch = obj.category.toLowerCase().includes(q);
      return codeMatch || nameMatch || categoryMatch;
    });

    return apiClient.simulateNetwork(matches);
  }

  public async createObject(input: CreateMapObjectInput): Promise<ApiResponse<MapObject>> {
    const newObj: MapObject = {
      id: generateEntityId('obj'),
      campusId: input.campusId,
      buildingId: input.buildingId,
      floorId: input.floorId,
      code: input.code,
      name: input.name,
      category: input.category,
      coordinates: input.coordinates,
      associatedNodeId: input.associatedNodeId,
      isAccessible: input.isAccessible ?? true,
      attributes: input.attributes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.objects.push(newObj);
    return apiClient.simulateNetwork(newObj);
  }
}

export const objectService = ObjectService.getInstance();
