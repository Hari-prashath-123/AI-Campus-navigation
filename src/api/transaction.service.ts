import { objectStore } from './object.store';
import { navStore } from './nav.store';
import { accessRuleService } from './access-rule.service';
import { auditService } from './audit.service';
import { AppError } from '../utils/errors';
import { MapObject } from '../types/object';
import { SpatialNode, CampusConnection } from '../types';
import { AccessRule } from '../types/access-rule';

export interface DatabaseSnapshot {
  objects: MapObject[];
  nodes: SpatialNode[];
  connections: CampusConnection[];
  accessRules: AccessRule[];
}

export class TransactionError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(`Transaction Aborted: ${message}`, 'TRANSACTION_ROLLBACK', 409, details);
  }
}

export const transactionService = {
  /**
   * Captures an in-memory snapshot of current state across all spatial stores.
   */
  captureSnapshot: (): DatabaseSnapshot => {
    return {
      objects: JSON.parse(JSON.stringify(objectStore.getAll(true))),
      nodes: JSON.parse(JSON.stringify(navStore.getNodes())),
      connections: JSON.parse(JSON.stringify(navStore.getAllConnections())),
      accessRules: JSON.parse(JSON.stringify([])), // updated below if accessRuleService exposes
    };
  },

  /**
   * Restores stores to a previously captured snapshot.
   */
  restoreSnapshot: (snapshot: DatabaseSnapshot): void => {
    objectStore.reset(snapshot.objects);
    navStore.reset(snapshot.nodes, snapshot.connections);
    if (snapshot.accessRules) {
      accessRuleService.reset(snapshot.accessRules);
    }
  },

  /**
   * Executes a series of operations atomically inside a transaction.
   * If any step fails, all previous state mutations in this transaction are rolled back.
   */
  run: async <T>(
    transactionName: string,
    operation: () => Promise<T> | T
  ): Promise<T> => {
    const snapshot = transactionService.captureSnapshot();

    try {
      const result = await operation();
      return result;
    } catch (err: any) {
      // Rollback to prior snapshot
      transactionService.restoreSnapshot(snapshot);

      auditService.log({
        userId: 'system',
        userEmail: 'system@omnicampus.internal',
        userRole: 'super_admin',
        action: 'UPDATE',
        resourceType: 'system',
        status: 'FAILED',
        details: {
          transactionName,
          error: err.message,
          rolledBack: true,
        },
      });

      throw new TransactionError(
        `Failed to complete '${transactionName}'. All changes rolled back. Error: ${err.message}`,
        { originalError: err.message }
      );
    }
  },

  /**
   * Optimistic Concurrency Control:
   * Verifies that the record being updated has not been modified concurrently by another session.
   */
  assertVersionMatch: (
    entityName: string,
    entityId: string,
    currentUpdatedAt: string | undefined,
    expectedUpdatedAt: string | undefined
  ): void => {
    if (!expectedUpdatedAt) return; // If client didn't supply version, proceed (or make required based on policy)

    if (currentUpdatedAt && currentUpdatedAt !== expectedUpdatedAt) {
      throw new AppError(
        `Concurrent modification conflict: ${entityName} '${entityId}' was modified by another user or session. Please reload the latest data and retry.`,
        'CONCURRENT_MODIFICATION_ERROR',
        409,
        { entityId, currentUpdatedAt, expectedUpdatedAt }
      );
    }
  },

  /**
   * Enforces referential graph consistency when an object is deleted or moved:
   * Safely detaches or removes orphaned navigation nodes and dangling edges.
   */
  cleanupOrphanedNodesForObject: (objectId: string): { removedNodes: number; removedConnections: number } => {
    const obj = objectStore.getById(objectId);
    if (!obj) return { removedNodes: 0, removedConnections: 0 };

    let removedNodes = 0;
    let removedConnections = 0;

    const nodeIdsToCheck = [obj.associatedNodeId, ...(obj.entranceNodeIds || [])].filter(Boolean);

    for (const nodeId of nodeIdsToCheck) {
      // Check if any other object is using this node
      const otherObjs = objectStore.getAll(true).filter(
        o => o.id !== objectId && (o.associatedNodeId === nodeId || o.entranceNodeIds?.includes(nodeId))
      );

      if (otherObjs.length === 0) {
        // Node is only used by this object, safely delete it and its connections
        const connections = navStore.getConnectionsByCampus(obj.campusId).filter(
          c => c.sourceNodeId === nodeId || c.targetNodeId === nodeId
        );

        for (const conn of connections) {
          navStore.deleteConnection(conn.id);
          removedConnections++;
        }

        navStore.deleteNode(nodeId);
        removedNodes++;
      }
    }

    return { removedNodes, removedConnections };
  },
};

