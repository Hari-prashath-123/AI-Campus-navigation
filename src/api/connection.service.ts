import { CampusConnection, ConnectionType } from '../types/connection';
import { navStore } from './nav.store';
import { authGuard } from './auth-guard';
import { auditService } from './audit.service';

export interface VerticalTransitionInput {
  campusId: string;
  buildingId: string;
  connectorType: 'elevator' | 'staircase' | 'ramp' | 'escalator';
  shaftName: string;
  floorNodePairs: { floorId: string; nodeId: string }[];
  isAccessible?: boolean;
}

export interface InterBuildingConnectionInput {
  campusId: string;
  name: string;
  sourceBuildingId: string;
  sourceFloorId?: string;
  sourceNodeId: string;
  targetBuildingId: string;
  targetFloorId?: string;
  targetNodeId: string;
  connectionType: 'bridge' | 'building_to_building';
  distanceMeters: number;
  isCovered?: boolean;
  isAccessible?: boolean;
  isBidirectional?: boolean;
  description?: string;
}

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
    if (!data.campusId || !data.sourceNodeId || !data.targetNodeId || !data.connectionType) {
      return { success: false, message: 'Missing required connection fields.' };
    }

    if (data.sourceNodeId === data.targetNodeId) {
      return { success: false, message: 'Source and target cannot be the same.' };
    }

    const user = await authGuard.enforce('create', 'connection', { campusId: data.campusId });

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
      isRestricted: data.isRestricted ?? false,
      requiredPermissions: data.requiredPermissions,
      distanceMeters: data.distanceMeters || 10,
      weightMultiplier: data.weightMultiplier || 1.0,
      availability: data.availability,
    });

    if ('error' in res) {
      return { success: false, message: res.error };
    }

    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'CREATE',
      resourceType: 'connection',
      resourceId: res.id,
      campusId: res.campusId,
      status: 'SUCCESS',
    });

    return { success: true, data: res };
  },

  /**
   * Connects multiple floors through a shared vertical transition (staircase, elevator shaft, or ramp).
   * Automatically creates sequential edges between consecutive floors in the provided array.
   */
  createVerticalTransition: async (input: VerticalTransitionInput): Promise<{ success: boolean; data: CampusConnection[]; message?: string }> => {
    const { campusId, buildingId, connectorType, shaftName, floorNodePairs } = input;
    if (floorNodePairs.length < 2) {
      return { success: false, data: [], message: 'Vertical transition requires at least 2 floor-node pairs.' };
    }

    const createdConnections: CampusConnection[] = [];
    const isAccessible = input.isAccessible ?? (connectorType === 'elevator' || connectorType === 'ramp');
    const weightMultiplier = connectorType === 'staircase' ? 2.0 : connectorType === 'elevator' ? 1.2 : 1.5;

    for (let i = 0; i < floorNodePairs.length - 1; i++) {
      const current = floorNodePairs[i];
      const next = floorNodePairs[i + 1];

      const res = await connectionService.createConnection({
        campusId,
        sourceBuildingId: buildingId,
        sourceFloorId: current.floorId,
        sourceNodeId: current.nodeId,
        targetBuildingId: buildingId,
        targetFloorId: next.floorId,
        targetNodeId: next.nodeId,
        connectionType: connectorType as ConnectionType,
        name: `${shaftName} (${connectorType})`,
        isBidirectional: true,
        isAccessible,
        isWalkable: true,
        isVehicleAccessible: false,
        distanceMeters: 4.0, // standard vertical floor height in meters
        weightMultiplier,
      });

      if (res.success && res.data) {
        createdConnections.push(res.data);
      } else {
        return { success: false, data: createdConnections, message: res.message || 'Failed to create transition edge.' };
      }
    }

    return { success: true, data: createdConnections };
  },

  /**
   * Connects two buildings via an outdoor walkway, road, or elevated bridge.
   */
  createInterBuildingConnection: async (input: InterBuildingConnectionInput): Promise<{ success: boolean; data?: CampusConnection; message?: string }> => {
    return connectionService.createConnection({
      campusId: input.campusId,
      sourceBuildingId: input.sourceBuildingId,
      sourceFloorId: input.sourceFloorId,
      sourceNodeId: input.sourceNodeId,
      targetBuildingId: input.targetBuildingId,
      targetFloorId: input.targetFloorId,
      targetNodeId: input.targetNodeId,
      connectionType: input.connectionType as ConnectionType,
      name: input.name,
      description: input.description,
      distanceMeters: input.distanceMeters,
      isAccessible: input.isAccessible ?? true,
      isBidirectional: input.isBidirectional ?? true,
      isWalkable: true,
      weightMultiplier: 1.0,
    });
  },

  updateConnection: async (id: string, data: Partial<CampusConnection>): Promise<{ success: boolean; message?: string }> => {
    const existing = navStore.getConnectionById(id);
    const user = await authGuard.enforce('update', 'connection', { campusId: existing?.campusId });

    const updated = navStore.updateConnection(id, data);
    if (!updated) {
      return { success: false, message: 'Connection not found or invalid.' };
    }

    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'UPDATE',
      resourceType: 'connection',
      resourceId: id,
      campusId: existing?.campusId,
      status: 'SUCCESS',
    });

    return { success: true };
  },

  deleteConnection: async (id: string): Promise<{ success: boolean; message?: string }> => {
    const existing = navStore.getConnectionById(id);
    const user = await authGuard.enforce('delete', 'connection', { campusId: existing?.campusId });

    const deleted = navStore.deleteConnection(id);
    if (!deleted) {
      return { success: false, message: 'Connection not found' };
    }

    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'DELETE',
      resourceType: 'connection',
      resourceId: id,
      campusId: existing?.campusId,
      status: 'SUCCESS',
    });

    return { success: true };
  }
};
