import { Campus, Building, Floor } from '../types';
import { INITIAL_CAMPUSES, INITIAL_BUILDINGS, INITIAL_FLOORS } from './mock-data';
import { v4 as uuidv4 } from 'uuid';

// ── localStorage persistence helpers ──────────────────────────────────────────
const LS_CAMPUSES  = 'omnicampus_campuses';
const LS_BUILDINGS = 'omnicampus_buildings';
const LS_FLOORS    = 'omnicampus_floors';

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

// Initialise from localStorage, seeding with mock-data only on first visit
let campuses:  Campus[]   = load<Campus>(LS_CAMPUSES,  INITIAL_CAMPUSES);
let buildings: Building[] = load<Building>(LS_BUILDINGS, INITIAL_BUILDINGS);
let floors:    Floor[]    = load<Floor>(LS_FLOORS,    INITIAL_FLOORS);

export const campusService = {
  // === CAMPUS ===
  getCampuses: async (): Promise<{ success: boolean; data: Campus[] }> => {
    return new Promise(resolve => setTimeout(() => resolve({ success: true, data: campuses }), 200));
  },

  getCampusById: async (id: string): Promise<{ success: boolean; data?: Campus; message?: string }> => {
    return new Promise(resolve => setTimeout(() => {
      const campus = campuses.find(c => c.id === id);
      if (campus) resolve({ success: true, data: campus });
      else resolve({ success: false, message: 'Campus not found' });
    }, 200));
  },

  createCampus: async (data: Partial<Campus>): Promise<{ success: boolean; data?: Campus; message?: string }> => {
    return new Promise(resolve => setTimeout(() => {
      const newCampus: Campus = {
        id: uuidv4(),
        slug: data.slug || `campus-${Date.now()}`,
        name: data.name || { en: 'New Campus' },
        code: data.code || 'CMP',
        description: data.description || { en: '' },
        center: data.center || { lat: 0, lng: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      campuses = [...campuses, newCampus];
      save(LS_CAMPUSES, campuses);
      resolve({ success: true, data: newCampus });
    }, 300));
  },

  updateCampus: async (id: string, data: Partial<Campus>): Promise<{ success: boolean; message?: string }> => {
    return new Promise(resolve => setTimeout(() => {
      const idx = campuses.findIndex(c => c.id === id);
      if (idx === -1) { resolve({ success: false, message: 'Not found' }); return; }
      campuses = campuses.map((c, i) => i === idx ? { ...c, ...data, updatedAt: new Date().toISOString() } : c);
      save(LS_CAMPUSES, campuses);
      resolve({ success: true });
    }, 300));
  },

  deleteCampus: async (id: string): Promise<{ success: boolean; message?: string }> => {
    return new Promise(resolve => setTimeout(() => {
      campuses  = campuses.filter(c => c.id !== id);
      buildings = buildings.filter(b => b.campusId !== id);
      floors    = floors.filter(f => f.campusId !== id);
      save(LS_CAMPUSES, campuses);
      save(LS_BUILDINGS, buildings);
      save(LS_FLOORS, floors);
      resolve({ success: true });
    }, 300));
  },

  // === BUILDING ===
  getBuildingsByCampus: async (campusId: string): Promise<{ success: boolean; data: Building[] }> => {
    return new Promise(resolve => setTimeout(() => {
      resolve({ success: true, data: buildings.filter(b => b.campusId === campusId) });
    }, 200));
  },

  getBuildingById: async (id: string): Promise<{ success: boolean; data?: Building; message?: string }> => {
    return new Promise(resolve => setTimeout(() => {
      const bld = buildings.find(b => b.id === id);
      if (bld) resolve({ success: true, data: bld });
      else resolve({ success: false, message: 'Building not found' });
    }, 200));
  },

  createBuilding: async (data: Partial<Building>): Promise<{ success: boolean; data?: Building; message?: string }> => {
    return new Promise(resolve => setTimeout(() => {
      if (!data.campusId) return resolve({ success: false, message: 'campusId required' });
      const newBuilding: Building = {
        id: uuidv4(),
        campusId: data.campusId,
        code: data.code || 'BLD',
        name: data.name || { en: 'New Building' },
        description: data.description,
        totalFloors: data.totalFloors || 1,
        entranceNodeIds: data.entranceNodeIds || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      buildings = [...buildings, newBuilding];
      save(LS_BUILDINGS, buildings);
      resolve({ success: true, data: newBuilding });
    }, 300));
  },

  updateBuilding: async (id: string, data: Partial<Building>): Promise<{ success: boolean; message?: string }> => {
    return new Promise(resolve => setTimeout(() => {
      const idx = buildings.findIndex(b => b.id === id);
      if (idx === -1) { resolve({ success: false, message: 'Not found' }); return; }
      buildings = buildings.map((b, i) => i === idx ? { ...b, ...data, updatedAt: new Date().toISOString() } : b);
      save(LS_BUILDINGS, buildings);
      resolve({ success: true });
    }, 300));
  },

  deleteBuilding: async (id: string): Promise<{ success: boolean; message?: string }> => {
    return new Promise(resolve => setTimeout(() => {
      buildings = buildings.filter(b => b.id !== id);
      floors    = floors.filter(f => f.buildingId !== id);
      save(LS_BUILDINGS, buildings);
      save(LS_FLOORS, floors);
      resolve({ success: true });
    }, 300));
  },

  // === FLOOR ===
  getFloorsByBuilding: async (buildingId: string): Promise<{ success: boolean; data: Floor[] }> => {
    return new Promise(resolve => setTimeout(() => {
      resolve({ success: true, data: floors.filter(f => f.buildingId === buildingId).sort((a, b) => a.level - b.level) });
    }, 200));
  },

  getFloorById: async (id: string): Promise<{ success: boolean; data?: Floor; message?: string }> => {
    return new Promise(resolve => setTimeout(() => {
      const flr = floors.find(f => f.id === id);
      if (flr) resolve({ success: true, data: flr });
      else resolve({ success: false, message: 'Floor not found' });
    }, 200));
  },

  createFloor: async (data: Partial<Floor>): Promise<{ success: boolean; data?: Floor; message?: string }> => {
    return new Promise(resolve => setTimeout(() => {
      if (!data.campusId || !data.buildingId) return resolve({ success: false, message: 'campusId and buildingId required' });
      const newFloor: Floor = {
        id: uuidv4(),
        buildingId: data.buildingId,
        campusId: data.campusId,
        level: data.level ?? 0,
        code: data.code || 'FL',
        name: data.name || { en: 'New Floor' },
        dimensions: data.dimensions || { widthMeters: 100, heightMeters: 100 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      floors = [...floors, newFloor];
      save(LS_FLOORS, floors);
      resolve({ success: true, data: newFloor });
    }, 300));
  },

  updateFloor: async (id: string, data: Partial<Floor>): Promise<{ success: boolean; message?: string }> => {
    return new Promise(resolve => setTimeout(() => {
      const idx = floors.findIndex(f => f.id === id);
      if (idx === -1) { resolve({ success: false, message: 'Not found' }); return; }
      floors = floors.map((f, i) => i === idx ? { ...f, ...data, updatedAt: new Date().toISOString() } : f);
      save(LS_FLOORS, floors);
      resolve({ success: true });
    }, 300));
  },

  deleteFloor: async (id: string): Promise<{ success: boolean; message?: string }> => {
    return new Promise(resolve => setTimeout(() => {
      floors = floors.filter(f => f.id !== id);
      save(LS_FLOORS, floors);
      resolve({ success: true });
    }, 300));
  },
};
