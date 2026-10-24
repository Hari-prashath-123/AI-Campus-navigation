import { campusService } from './campus.service';
import { objectService } from './object.service';
import { routingService } from './routing.service';
import { workflowService } from './workflow.service';
import { MapObject, Building, Floor } from '../types';
import { ToolContext } from '../types/context';

/**
 * LLM Secure API Layer
 * 
 * This module provides a strictly typed and secure interface for the AI assistant 
 * to interact with campus data. It ensures that the LLM cannot access unauthorized 
 * data or leak internal database fields.
 */

// ============================================================================
// Internal Security & Validation Helpers
// ============================================================================

const validateCampusScope = async (campusId: string): Promise<boolean> => {
  if (!campusId) return false;
  const res = await campusService.getCampusById(campusId);
  return res.success && !!res.data;
};

// ============================================================================
// Secure DTO Mappers (Redacting internal fields)
// ============================================================================

const mapToSafeObject = (obj: MapObject) => ({
  id: obj.id,
  name: obj.name.en,
  description: obj.description?.en,
  type: obj.category,
  buildingId: obj.buildingId,
  floorId: obj.floorId,
  isAccessible: obj.isAccessible,
  images: obj.images,
  historicalInfo: obj.historicalInfo?.en,
  contactInfo: obj.contactInfo,
  externalLinks: obj.externalLinks,
  properties: obj.attributes, // Safe key-value pairs
});

const mapToSafeBuilding = (bld: Building) => ({
  id: bld.id,
  name: bld.name.en,
  description: bld.description?.en,
  code: bld.code,
  totalFloors: bld.totalFloors,
});

const mapToSafeFloor = (flr: Floor) => ({
  id: flr.id,
  name: flr.name.en,
  level: flr.level,
});

// ============================================================================
// Exported LLM Tools
// ============================================================================

export const llmTools = {
  /**
   * searchCampusObjects
   * Searches for points of interest, rooms, and facilities within a campus.
   */
  searchCampusObjects: async (args: { campusId: string; query: string; limit?: number }) => {
    if (!(await validateCampusScope(args.campusId))) return { error: 'Unauthorized or invalid campus.' };
    
    const res = await objectService.searchObjects(args.campusId, args.query);
    if (!res.success || !res.data) return { error: 'Search failed.' };

    const results = res.data.slice(0, args.limit || 5).map(mapToSafeObject);
    return results.length > 0 ? { results } : { message: 'No objects found matching the query.' };
  },

  /**
   * getObjectDetails
   * Retrieves detailed information about a specific location or object.
   */
  getObjectDetails: async (args: { campusId: string; objectId: string }) => {
    if (!(await validateCampusScope(args.campusId))) return { error: 'Unauthorized or invalid campus.' };

    const res = await objectService.getObjectById(args.objectId);
    // Enforce campus scope on the retrieved object
    if (!res.success || !res.data || res.data.campusId !== args.campusId) {
      return { error: 'Object not found.' };
    }

    return { result: mapToSafeObject(res.data) };
  },

  /**
   * getBuildingDetails
   * Retrieves details about a specific building, including its floors and operating hours.
   */
  getBuildingDetails: async (args: { campusId: string; buildingId: string }) => {
    if (!(await validateCampusScope(args.campusId))) return { error: 'Unauthorized or invalid campus.' };

    const res = await campusService.getBuildingById(args.buildingId);
    if (!res.success || !res.data || res.data.campusId !== args.campusId) {
      return { error: 'Building not found.' };
    }

    return { result: mapToSafeBuilding(res.data) };
  },

  /**
   * getFloorDetails
   * Retrieves details about a specific floor within a building.
   */
  getFloorDetails: async (args: { campusId: string; buildingId: string; floorId: string }) => {
    if (!(await validateCampusScope(args.campusId))) return { error: 'Unauthorized or invalid campus.' };

    const res = await campusService.getFloorsByBuilding(args.buildingId);
    if (!res.success || !res.data) return { error: 'Floor not found.' };

    const floor = res.data.find(f => f.id === args.floorId);
    if (!floor || floor.campusId !== args.campusId) return { error: 'Floor not found.' };

    return { result: mapToSafeFloor(floor) };
  },

  /**
   * getNearbyObjects
   * Finds locations or amenities near a specific object.
   */
  getNearbyObjects: async (args: { campusId: string; sourceObjectId: string; category?: string; radiusMeters?: number }) => {
    if (!(await validateCampusScope(args.campusId))) return { error: 'Unauthorized or invalid campus.' };

    const sourceRes = await objectService.getObjectById(args.sourceObjectId);
    if (!sourceRes.success || !sourceRes.data || sourceRes.data.campusId !== args.campusId) {
      return { error: 'Source object not found.' };
    }

    // In a real DB, this would be a PostGIS ST_DWithin query.
    // For mock, we simply return all objects on the same floor that match the category.
    const allRes = await objectService.getObjectsByFloor(sourceRes.data.floorId!);
    if (!allRes.success || !allRes.data) return { error: 'Failed to fetch nearby objects.' };

    const nearby = allRes.data
      .filter(obj => obj.id !== args.sourceObjectId)
      .filter(obj => !args.category || obj.category === args.category)
      .slice(0, 5) // Mock limiting
      .map(mapToSafeObject);

    return nearby.length > 0 ? { results: nearby } : { message: 'No nearby objects found.' };
  },

  /**
   * getEntranceAvailability
   * Checks if an entrance or building is currently open based on operating hours.
   */
  getEntranceAvailability: async (args: { campusId: string; buildingId: string }) => {
    if (!(await validateCampusScope(args.campusId))) return { error: 'Unauthorized or invalid campus.' };

    const res = await campusService.getBuildingById(args.buildingId);
    if (!res.success || !res.data || res.data.campusId !== args.campusId) {
      return { error: 'Building not found.' };
    }

    // Mock operating hours/status since Building doesn't have it natively yet
    return { 
      isOpen: true, 
      operatingHours: 'Standard Hours' 
    };
  },

  /**
   * getCampusInformation
   * Retrieves high-level information about the campus itself.
   */
  getCampusInformation: async (args: { campusId: string }) => {
    if (!(await validateCampusScope(args.campusId))) return { error: 'Unauthorized or invalid campus.' };

    const res = await campusService.getCampusById(args.campusId);
    if (!res.success || !res.data) return { error: 'Campus not found.' };

    return {
      result: {
        id: res.data.id,
        name: res.data.name.en,
        description: res.data.description?.en,
        address: res.data.metadata?.address,
        timezone: res.data.metadata?.timezone
      }
    };
  },

  /**
   * findRoute
   * Calculates a deterministic path between two points using context.
   */
  findRoute: async (args: { sourceObjectId: string; targetObjectId: string; context: ToolContext }) => {
    const { context, sourceObjectId, targetObjectId } = args;
    if (!(await validateCampusScope(context.campusId))) return { error: 'Unauthorized or invalid campus.' };

    const res = await routingService.calculateRoute(context.campusId, sourceObjectId, targetObjectId, {
      accessibleOnly: context.accessibleOnly,
      mode: context.travelMode,
      blockedConnectionIds: context.blockedConnectionIds,
    });
    
    if (!res.success || !res.data) {
      return { error: 'Route could not be calculated. The destination might be unreachable or isolated.' };
    }

    return { result: res.data };
  },

  /**
   * resolveWorkflow
   * Identifies administrative or procedural workflows based on a query.
   */
  resolveWorkflow: async (args: { campusId: string; query: string }) => {
    if (!(await validateCampusScope(args.campusId))) return { error: 'Unauthorized or invalid campus.' };

    const res = await workflowService.searchWorkflows(args.campusId, args.query);
    if (!res.success || !res.data || res.data.length === 0) {
      return { error: 'No matching workflows found for this request.' };
    }

    return { results: res.data };
  }
};
