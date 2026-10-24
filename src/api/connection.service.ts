import { CampusConnection } from '../types/connection';
import { v4 as uuidv4 } from 'uuid';

let connections: CampusConnection[] = [];

export const connectionService = {
  getConnectionsByCampus: async (campusId: string): Promise<{ success: boolean; data: CampusConnection[] }> => {
    return new Promise(resolve => setTimeout(() => {
      resolve({ success: true, data: connections.filter(c => c.campusId === campusId) });
    }, 200));
  },

  createConnection: async (data: Partial<CampusConnection>): Promise<{ success: boolean; data?: CampusConnection; message?: string }> => {
    return new Promise(resolve => setTimeout(() => {
      if (!data.campusId || !data.sourceNodeId || !data.targetNodeId || !data.connectionType) {
        return resolve({ success: false, message: 'Missing required connection fields.' });
      }

      // Basic validation
      if (data.sourceNodeId === data.targetNodeId) {
        return resolve({ success: false, message: 'Source and target cannot be the same.' });
      }

      const newConn: CampusConnection = {
        id: uuidv4(),
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      connections.push(newConn);
      resolve({ success: true, data: newConn });
    }, 300));
  },

  updateConnection: async (id: string, data: Partial<CampusConnection>): Promise<{ success: boolean; message?: string }> => {
    return new Promise(resolve => setTimeout(() => {
      const idx = connections.findIndex(c => c.id === id);
      if (idx === -1) return resolve({ success: false, message: 'Connection not found.' });

      if (data.sourceNodeId && data.targetNodeId && data.sourceNodeId === data.targetNodeId) {
         return resolve({ success: false, message: 'Source and target cannot be the same.' });
      }

      connections[idx] = { ...connections[idx], ...data, updatedAt: new Date().toISOString() };
      resolve({ success: true });
    }, 300));
  },

  deleteConnection: async (id: string): Promise<{ success: boolean; message?: string }> => {
    return new Promise(resolve => setTimeout(() => {
      connections = connections.filter(c => c.id !== id);
      resolve({ success: true });
    }, 300));
  }
};
