import { useCallback, useEffect, useReducer } from 'react';
import { objectStore } from '../api/object.store';
import { MapObject } from '../types/object';

/**
 * React hook that exposes objectStore and re-renders on any store change.
 */
export function useObjectStore(options?: { campusId?: string; floorId?: string }) {
  const [, rerender] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const unsub = objectStore.subscribe(rerender);
    return unsub;
  }, []);

  const objects: MapObject[] = options?.floorId
    ? objectStore.getByFloor(options.floorId)
    : options?.campusId
    ? objectStore.getByCampus(options.campusId)
    : objectStore.getAll();

  const createObject = useCallback(
    (data: Partial<MapObject>) => objectStore.create(data),
    []
  );

  const updateObject = useCallback(
    (id: string, patch: Partial<MapObject>) => objectStore.update(id, patch),
    []
  );

  const deleteObject = useCallback(
    (id: string) => objectStore.delete(id),
    []
  );

  return { objects, createObject, updateObject, deleteObject };
}
