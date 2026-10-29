import { MapObject } from '../types/object';
import { INITIAL_MAP_OBJECTS } from './mock-data';
import { v4 as uuidv4 } from 'uuid';

const LS_OBJECTS = 'omnicampus_objects';

function load<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch {}
  return fallback;
}
function save<T>(key: string, data: T[]) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

let objects: MapObject[] = load<MapObject>(LS_OBJECTS, INITIAL_MAP_OBJECTS);

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach(fn => fn()); }

export const objectStore = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  getAll(): MapObject[] { return objects; },

  getByCampus(campusId: string): MapObject[] {
    return objects.filter(o => o.campusId === campusId);
  },
  getByBuilding(buildingId: string): MapObject[] {
    return objects.filter(o => o.buildingId === buildingId);
  },
  getByFloor(floorId: string): MapObject[] {
    return objects.filter(o => o.floorId === floorId);
  },
  getById(id: string): MapObject | undefined {
    return objects.find(o => o.id === id);
  },

  search(campusId: string, query: string): MapObject[] {
    const q = query.toLowerCase().trim();
    return objects.filter(o => {
      if (o.campusId !== campusId) return false;
      if (!q) return true;
      const name = typeof o.name === 'string' ? o.name : (o.name as any).en || '';
      return (
        name.toLowerCase().includes(q) ||
        o.code?.toLowerCase().includes(q) ||
        o.category?.toLowerCase().includes(q)
      );
    });
  },

  create(data: Partial<MapObject>): MapObject {
    const now = new Date().toISOString();
    const obj: MapObject = {
      id: uuidv4(),
      campusId: data.campusId || '',
      buildingId: data.buildingId || '',
      floorId: data.floorId || '',
      code: data.code || `OBJ-${Math.floor(Math.random() * 9000 + 1000)}`,
      name: data.name || { en: 'New Object' },
      category: data.category || 'room',
      coordinates: data.coordinates || { x: 0, y: 0 },
      associatedNodeId: data.associatedNodeId || '',
      isAccessible: data.isAccessible ?? true,
      tags: data.tags || [],
      attributes: data.attributes || {},
      objectTypeId: data.objectTypeId,
      geometry: data.geometry,
      geometryType: data.geometryType,
      entranceNodeIds: data.entranceNodeIds || [],
      createdAt: now,
      updatedAt: now,
    };
    objects = [...objects, obj];
    save(LS_OBJECTS, objects);
    notify();
    return obj;
  },

  update(id: string, patch: Partial<MapObject>): MapObject | null {
    const idx = objects.findIndex(o => o.id === id);
    if (idx === -1) return null;
    const updated = { ...objects[idx], ...patch, updatedAt: new Date().toISOString() };
    objects = objects.map(o => o.id === id ? updated : o);
    save(LS_OBJECTS, objects);
    notify();
    return updated;
  },

  delete(id: string): boolean {
    if (!objects.some(o => o.id === id)) return false;
    objects = objects.filter(o => o.id !== id);
    save(LS_OBJECTS, objects);
    notify();
    return true;
  },

  deleteByFloor(floorId: string): void {
    objects = objects.filter(o => o.floorId !== floorId);
    save(LS_OBJECTS, objects);
    notify();
  },

  reset(): void {
    objects = [...INITIAL_MAP_OBJECTS];
    save(LS_OBJECTS, objects);
    notify();
  },
};
