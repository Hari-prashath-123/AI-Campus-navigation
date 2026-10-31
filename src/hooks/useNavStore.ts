import { useCallback, useEffect, useReducer } from 'react';
import { navStore } from '../api/nav.store';
import { SpatialNode, CampusConnection } from '../types/connection';

/**
 * React hook that exposes navStore and re-renders on any store change.
 * Optionally filters by campusId or floorId.
 */
export function useNavStore(options?: { campusId?: string; floorId?: string }) {
  // Force re-render whenever navStore notifies
  const [, rerender] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const unsub = navStore.subscribe(rerender);
    return unsub;
  }, []);

  const nodes: SpatialNode[] = (() => {
    if (options && 'floorId' in options) {
      return options.floorId ? navStore.getNodesByFloor(options.floorId) : [];
    }
    if (options && 'campusId' in options) {
      return options.campusId ? navStore.getNodesByCampus(options.campusId) : [];
    }
    return navStore.getNodes();
  })();

  const connections: CampusConnection[] = (() => {
    if (options && 'floorId' in options) {
      return options.floorId ? navStore.getConnectionsByFloor(options.floorId) : [];
    }
    if (options && 'campusId' in options) {
      return options.campusId ? navStore.getConnectionsByCampus(options.campusId) : [];
    }
    return navStore.getConnections();
  })();

  const createNode = useCallback(
    (data: Omit<SpatialNode, 'id'>) => navStore.createNode(data),
    []
  );

  const updateNode = useCallback(
    (id: string, patch: Partial<Omit<SpatialNode, 'id'>>) => navStore.updateNode(id, patch),
    []
  );

  const deleteNode = useCallback(
    (id: string) => navStore.deleteNode(id),
    []
  );

  const createConnection = useCallback(
    (data: Omit<CampusConnection, 'id' | 'createdAt' | 'updatedAt'>) =>
      navStore.createConnection(data),
    []
  );

  const updateConnection = useCallback(
    (id: string, patch: Partial<Omit<CampusConnection, 'id' | 'createdAt'>>) =>
      navStore.updateConnection(id, patch),
    []
  );

  const deleteConnection = useCallback(
    (id: string) => navStore.deleteConnection(id),
    []
  );

  return {
    nodes,
    connections,
    createNode,
    updateNode,
    deleteNode,
    createConnection,
    updateConnection,
    deleteConnection,
  };
}
