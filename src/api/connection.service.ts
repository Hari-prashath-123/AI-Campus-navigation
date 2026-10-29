import { CampusConnection } from '../types/connection';
import { navStore } from './nav.store';

/**
 * connectionService — unified adapter over the persistent navStore.
 */
export const connectionService = {
  getConnectionsByCampus: async (campusId: string): Promise<{ success: boolean; data: CampusConnection[] }> => {
    return new Promise(resolve => {
      const data = navStore.getConnectionsByCampus(campusId);
      resolve({ success: true, data });
    });
  },

  getConnectionsByFloor: async (floorId: string): Promise<{ success: boolean; data: CampusConnection[] }> => {
    return new Promise(resolve => {
      const data = navStore.getConnectionsByFloor(floorId);
      resolve({ success: true, data });
    });
  },

  createConnection: async (data: Partial<CampusConnection>): Promise<{ success: boolean; data?: CampusConnection; message?: string }> => {
    return new Promise(resolve => {
      if (!data.campusId || !data.sourceNodeId || !data.targetNodeId || !data.connectionType) {
        return resolve({ success: false, message: 'Missing required connection fields.' });
      }

      if (data.sourceNodeId === data.targetNodeId) {
        return resolve({ success: false, message: 'Source and target cannot be the same.' });
      }

      const res = navStore.createConnection({
        campusId: data.campusId,
        sourceNodeId: data.sourceNodeId,
        sourceBuildingId: data.sourceBuildingId,
        sourceFloorId: data.sourceFloorId,
        targetNodeId: data.targetNodeId,
        targetBuildingId: data.targetBuildingId,
        targetFloorId: data.targetFloorId,
        connectionType: data.connectionType,
        name: data.name || 'Unnamed Connection',
        description: data.description,
        isBidirectional: data.isBidirectional ?? true,
        isAccessible: data.isAccessible ?? true,
        isWalkable: data.isWalkable ?? true,
        isVehicleAccessible: data.isVehicleAccessible ?? false,
        distanceMeters: data.distanceMeters || 10,
        weightMultiplier: data.weightMultiplier || 1.0,
        availability: data.availability,
      });

      if ('error' in res) {
        return resolve({ success: false, message: res.error });
      }

      resolve({ success: true, data: res });
    });
  },

  updateConnection: async (id: string, data: Partial<CampusConnection>): Promise<{ success: boolean; message?: string }> => {
    return new Promise(resolve => {
      const updated = navStore.updateConnection(id, data);
      if (!updated) {
        return resolve({ success: false, message: 'Connection not found or invalid.' });
      }
      resolve({ success: true });
    });
  },

  deleteConnection: async (id: string): Promise<{ success: boolean; message?: string }> => {
    return new Promise(resolve => {
      const deleted = navStore.deleteConnection(id);
      resolve({ success: deleted, message: deleted ? undefined : 'Connection not found' });
    });
  }
};
