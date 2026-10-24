import { apiClient } from './client';
import { INITIAL_BUILDINGS } from './mock-data';
import { Building, CreateBuildingInput, ApiResponse } from '../types';
import { NotFoundError } from '../utils/errors';
import { generateEntityId } from '../utils/validation';

/**
 * Building Service Abstraction
 */
export class BuildingService {
  private static instance: BuildingService;
  private buildings: Building[] = [...INITIAL_BUILDINGS];

  private constructor() {}

  public static getInstance(): BuildingService {
    if (!BuildingService.instance) {
      BuildingService.instance = new BuildingService();
    }
    return BuildingService.instance;
  }

  public async getBuildingsByCampus(campusId: string): Promise<ApiResponse<Building[]>> {
    const filtered = this.buildings.filter((b) => b.campusId === campusId);
    return apiClient.simulateNetwork(filtered);
  }

  public async getBuildingById(id: string): Promise<ApiResponse<Building>> {
    const building = this.buildings.find((b) => b.id === id);
    if (!building) {
      throw new NotFoundError('Building', id);
    }
    return apiClient.simulateNetwork(building);
  }

  public async createBuilding(input: CreateBuildingInput): Promise<ApiResponse<Building>> {
    const newBuilding: Building = {
      id: generateEntityId('bld'),
      campusId: input.campusId,
      code: input.code,
      name: input.name,
      description: input.description,
      totalFloors: input.totalFloors,
      entranceNodeIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.buildings.push(newBuilding);
    return apiClient.simulateNetwork(newBuilding);
  }
}

export const buildingService = BuildingService.getInstance();
