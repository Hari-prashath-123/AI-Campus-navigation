import { apiClient } from './client';
import { INITIAL_FLOORS } from './mock-data';
import { Floor, CreateFloorInput, ApiResponse } from '../types';
import { NotFoundError } from '../utils/errors';
import { generateEntityId } from '../utils/validation';

/**
 * Floor Service Abstraction
 */
export class FloorService {
  private static instance: FloorService;
  private floors: Floor[] = [...INITIAL_FLOORS];

  private constructor() {}

  public static getInstance(): FloorService {
    if (!FloorService.instance) {
      FloorService.instance = new FloorService();
    }
    return FloorService.instance;
  }

  public async getFloorsByBuilding(buildingId: string): Promise<ApiResponse<Floor[]>> {
    const list = this.floors
      .filter((f) => f.buildingId === buildingId)
      .sort((a, b) => a.level - b.level);
    return apiClient.simulateNetwork(list);
  }

  public async getFloorById(id: string): Promise<ApiResponse<Floor>> {
    const floor = this.floors.find((f) => f.id === id);
    if (!floor) {
      throw new NotFoundError('Floor', id);
    }
    return apiClient.simulateNetwork(floor);
  }

  public async createFloor(input: CreateFloorInput): Promise<ApiResponse<Floor>> {
    const newFloor: Floor = {
      id: generateEntityId('floor'),
      buildingId: input.buildingId,
      campusId: input.campusId,
      level: input.level,
      code: input.code,
      name: input.name,
      dimensions: input.dimensions,
      planImageUrl: input.planImageUrl,
      nodeCount: 0,
      objectCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.floors.push(newFloor);
    return apiClient.simulateNetwork(newFloor);
  }
}

export const floorService = FloorService.getInstance();
