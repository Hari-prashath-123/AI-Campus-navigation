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

  const nodes: SpatialNode[] = options?.floorId
    ? navStore.getNodesByFloor(options.floorId)
    : options?.campusId
    ? navStore.getNodesByCampus(options.campusId)
    : navStore.getNodes();

  const connections: CampusConnection[] = options?.campusId
    ? navStore.getConnectionsByCampus(options.campusId)
    : navStore.getConnections();

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
