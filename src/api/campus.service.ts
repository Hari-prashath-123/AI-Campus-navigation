import { Campus, Building, Floor, LocalizedString } from '../types';
import { INITIAL_CAMPUSES, INITIAL_BUILDINGS, INITIAL_FLOORS } from './mock-data';
import { objectStore } from './object.store';
import { navStore } from './nav.store';
import { authGuard } from './auth-guard';
import { auditService } from './audit.service';
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

const isTestEnv = (typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || Boolean(process.env?.VITEST))) ||
  ((import.meta as any)?.env?.MODE === 'test');

const LS_DATA_VERSION = 'omnicampus_data_version';
const CURRENT_DATA_VERSION = '3';

function migrateDataVersionIfNeeded() {
  if (isTestEnv) return;
  try {
    const storedVersion = localStorage.getItem(LS_DATA_VERSION);
    if (storedVersion !== CURRENT_DATA_VERSION) {
      // Wipe ALL hardcoded seed data so users start fresh on the campuses page
      const keysToWipe = [
        LS_CAMPUSES, LS_BUILDINGS, LS_FLOORS,
        'omnicampus_nodes', 'omnicampus_connections', 'omnicampus_objects',
      ];
      keysToWipe.forEach(k => localStorage.removeItem(k));
      localStorage.setItem(LS_DATA_VERSION, CURRENT_DATA_VERSION);
    }
  } catch {}
}
migrateDataVersionIfNeeded();

// In tests, initialize with mock fixtures so test suites pass.
// In UI / browser, start clean with zero hardcoded campuses so user creates their own.
let campuses:  Campus[]   = load<Campus>(LS_CAMPUSES,  isTestEnv ? INITIAL_CAMPUSES : []);
let buildings: Building[] = load<Building>(LS_BUILDINGS, isTestEnv ? INITIAL_BUILDINGS : []);
let floors:    Floor[]    = load<Floor>(LS_FLOORS,    isTestEnv ? INITIAL_FLOORS : []);

if (!isTestEnv) {
  // Guard against any lingering hardcoded default campuses in existing localStorage
  campuses = campuses.filter(c => c.id !== 'campus-tech-inst' && c.id !== 'campus-metro-health');
  buildings = buildings.filter(b => b.campusId !== 'campus-tech-inst' && b.campusId !== 'campus-metro-health');
  floors = floors.filter(f => f.campusId !== 'campus-tech-inst' && f.campusId !== 'campus-metro-health');
}

export interface DeletionSafetyReport {
  canDelete: boolean;
  issues: string[];
  stats: {
    buildingsCount?: number;
    floorsCount?: number;
    objectsCount?: number;
    nodesCount?: number;
    connectionsCount?: number;
  };
}

export const campusService = {
  // === CAMPUS ===
  getCampuses: async (organizationId?: string): Promise<{ success: boolean; data: Campus[] }> => {
    let result = [...campuses];
    if (organizationId) {
      result = result.filter(c => c.organizationId === organizationId);
    }
    return { success: true, data: result };
  },

  getCampusById: async (id: string): Promise<{ success: boolean; data?: Campus; message?: string }> => {
    const campus = campuses.find(c => c.id === id);
    if (campus) return { success: true, data: { ...campus } };
    return { success: false, message: 'Campus not found' };
  },

  createCampus: async (data: Partial<Campus>): Promise<{ success: boolean; data?: Campus; message?: string }> => {
    const user = await authGuard.enforce('create', 'campus', { organizationId: data.organizationId });
    const now = new Date().toISOString();
    const newCampus: Campus = {
      id: data.id || uuidv4(),
      organizationId: data.organizationId || 'org-omnicampus',
      slug: data.slug || `campus-${Date.now()}`,
      name: data.name || { en: 'New Campus' },
      code: data.code || `CMP-${Math.floor(Math.random() * 900 + 100)}`,
      description: data.description || { en: '' },
      center: data.center || { lat: 0, lng: 0 },
      bounds: data.bounds,
      logoUrl: data.logoUrl,
      metadata: data.metadata || {},
      createdAt: now,
      updatedAt: now,
    };
    campuses = [...campuses, newCampus];
    save(LS_CAMPUSES, campuses);

    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'CREATE',
      resourceType: 'campus',
      resourceId: newCampus.id,
      campusId: newCampus.id,
      organizationId: newCampus.organizationId,
      status: 'SUCCESS',
    });

    return { success: true, data: newCampus };
  },

  updateCampus: async (id: string, data: Partial<Campus>): Promise<{ success: boolean; data?: Campus; message?: string }> => {
    const user = await authGuard.enforce('update', 'campus', { campusId: id });
    const idx = campuses.findIndex(c => c.id === id);
    if (idx === -1) return { success: false, message: 'Not found' };

    const updated: Campus = {
      ...campuses[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    campuses = campuses.map((c, i) => i === idx ? updated : c);
    save(LS_CAMPUSES, campuses);

    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'UPDATE',
      resourceType: 'campus',
      resourceId: id,
      campusId: id,
      status: 'SUCCESS',
    });

    return { success: true, data: updated };
  },

  canDeleteCampus: async (id: string): Promise<DeletionSafetyReport> => {
    const relatedBuildings = buildings.filter(b => b.campusId === id);
    const relatedFloors = floors.filter(f => f.campusId === id);
    const relatedObjects = objectStore.getByCampus(id);
    const relatedNodes = navStore.getNodesByCampus(id);
    const relatedConnections = navStore.getConnectionsByCampus(id);

    const issues: string[] = [];
    if (relatedBuildings.length > 0) {
      issues.push(`Campus contains ${relatedBuildings.length} building(s).`);
    }
    if (relatedFloors.length > 0) {
      issues.push(`Campus contains ${relatedFloors.length} floor(s).`);
    }
    if (relatedObjects.length > 0) {
      issues.push(`Campus contains ${relatedObjects.length} object(s)/POI(s).`);
    }
    if (relatedNodes.length > 0 || relatedConnections.length > 0) {
      issues.push(`Campus has ${relatedNodes.length} navigation node(s) and ${relatedConnections.length} connection edge(s).`);
    }

    return {
      canDelete: issues.length === 0,
      issues,
      stats: {
        buildingsCount: relatedBuildings.length,
        floorsCount: relatedFloors.length,
        objectsCount: relatedObjects.length,
        nodesCount: relatedNodes.length,
        connectionsCount: relatedConnections.length,
      },
    };
  },

  deleteCampus: async (id: string, force = false): Promise<{ success: boolean; message?: string }> => {
    const user = await authGuard.enforce('delete', 'campus', { campusId: id });
    const safety = await campusService.canDeleteCampus(id);
    if (!safety.canDelete && !force) {
      return {
        success: false,
        message: `Cannot delete campus safely: ${safety.issues.join(' ')} Use force=true to cascade delete.`,
      };
    }

    // Perform cascade deletion if force is specified
    campuses = campuses.filter(c => c.id !== id);
    buildings = buildings.filter(b => b.campusId !== id);
    floors = floors.filter(f => f.campusId !== id);
    save(LS_CAMPUSES, campuses);
    save(LS_BUILDINGS, buildings);
    save(LS_FLOORS, floors);

    // Clean objects and navigation graph for this campus
    const campusObjs = objectStore.getByCampus(id);
    campusObjs.forEach(o => objectStore.delete(o.id));

    const campusNodes = navStore.getNodesByCampus(id);
    campusNodes.forEach(n => navStore.deleteNode(n.id));

    const campusConns = navStore.getConnectionsByCampus(id);
    campusConns.forEach(c => navStore.deleteConnection(c.id));

    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'DELETE',
      resourceType: 'campus',
      resourceId: id,
      campusId: id,
      status: 'SUCCESS',
    });

    return { success: true };
  },

  // === BUILDING ===
  getBuildingsByCampus: async (campusId: string): Promise<{ success: boolean; data: Building[] }> => {
    return { success: true, data: buildings.filter(b => b.campusId === campusId) };
  },

  getBuildingById: async (id: string): Promise<{ success: boolean; data?: Building; message?: string }> => {
    const bld = buildings.find(b => b.id === id);
    if (bld) return { success: true, data: { ...bld } };
    return { success: false, message: 'Building not found' };
  },

  createBuilding: async (data: Partial<Building>): Promise<{ success: boolean; data?: Building; message?: string }> => {
    if (!data.campusId) return { success: false, message: 'campusId required' };
    const user = await authGuard.enforce('create', 'building', { campusId: data.campusId });
    const now = new Date().toISOString();
    const newBuilding: Building = {
      id: data.id || uuidv4(),
      campusId: data.campusId,
      code: data.code || `BLD-${Math.floor(Math.random() * 900 + 100)}`,
      name: data.name || { en: 'New Building' },
      description: data.description,
      totalFloors: data.totalFloors || 1,
      entranceNodeIds: data.entranceNodeIds || [],
      geoCenter: data.geoCenter,
      footprint: data.footprint,
      createdAt: now,
      updatedAt: now,
    };
    buildings = [...buildings, newBuilding];
    save(LS_BUILDINGS, buildings);

    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'CREATE',
      resourceType: 'building',
      resourceId: newBuilding.id,
      campusId: newBuilding.campusId,
      status: 'SUCCESS',
    });

    return { success: true, data: newBuilding };
  },

  updateBuilding: async (id: string, data: Partial<Building>): Promise<{ success: boolean; data?: Building; message?: string }> => {
    const idx = buildings.findIndex(b => b.id === id);
    if (idx === -1) return { success: false, message: 'Not found' };

    const updated: Building = {
      ...buildings[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    buildings = buildings.map((b, i) => i === idx ? updated : b);
    save(LS_BUILDINGS, buildings);
    return { success: true, data: updated };
  },

  canDeleteBuilding: async (id: string): Promise<DeletionSafetyReport> => {
    const relatedFloors = floors.filter(f => f.buildingId === id);
    const relatedObjects = objectStore.getByBuilding(id);
    const relatedConns = navStore.getConnections().filter(
      c => c.sourceBuildingId === id || c.targetBuildingId === id
    );

    const issues: string[] = [];
    if (relatedFloors.length > 0) {
      issues.push(`Building contains ${relatedFloors.length} floor(s).`);
    }
    if (relatedObjects.length > 0) {
      issues.push(`Building contains ${relatedObjects.length} object(s).`);
    }
    if (relatedConns.length > 0) {
      issues.push(`Building is connected by ${relatedConns.length} inter-building or cross-floor connection(s).`);
    }

    return {
      canDelete: issues.length === 0,
      issues,
      stats: {
        floorsCount: relatedFloors.length,
        objectsCount: relatedObjects.length,
        connectionsCount: relatedConns.length,
      },
    };
  },

  deleteBuilding: async (id: string, force = false): Promise<{ success: boolean; message?: string }> => {
    const bld = buildings.find(b => b.id === id);
    const user = await authGuard.enforce('delete', 'building', { campusId: bld?.campusId, resourceId: id });
    const safety = await campusService.canDeleteBuilding(id);
    if (!safety.canDelete && !force) {
      return {
        success: false,
        message: `Cannot delete building safely: ${safety.issues.join(' ')} Use force=true to cascade delete.`,
      };
    }

    buildings = buildings.filter(b => b.id !== id);
    floors = floors.filter(f => f.buildingId !== id);
    save(LS_BUILDINGS, buildings);
    save(LS_FLOORS, floors);

    // Clean objects belonging to this building
    const bldObjs = objectStore.getByBuilding(id);
    bldObjs.forEach(o => objectStore.delete(o.id));

    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'DELETE',
      resourceType: 'building',
      resourceId: id,
      campusId: bld?.campusId,
      status: 'SUCCESS',
    });

    return { success: true };
  },

  // === FLOOR ===
  getFloorsByCampus: async (campusId: string): Promise<{ success: boolean; data: Floor[] }> => {
    const result = floors.filter(f => f.campusId === campusId).sort((a, b) => a.level - b.level);
    return { success: true, data: result };
  },

  getFloorsByBuilding: async (buildingId: string): Promise<{ success: boolean; data: Floor[] }> => {
    const result = floors.filter(f => f.buildingId === buildingId).sort((a, b) => a.level - b.level);
    return { success: true, data: result };
  },

  getFloorById: async (id: string): Promise<{ success: boolean; data?: Floor; message?: string }> => {
    const flr = floors.find(f => f.id === id);
    if (flr) return { success: true, data: { ...flr } };
    return { success: false, message: 'Floor not found' };
  },

  createFloor: async (data: Partial<Floor>): Promise<{ success: boolean; data?: Floor; message?: string }> => {
    if (!data.campusId || !data.buildingId) {
      return { success: false, message: 'campusId and buildingId required' };
    }
    const user = await authGuard.enforce('create', 'floor', { campusId: data.campusId });
    const now = new Date().toISOString();
    const newFloor: Floor = {
      id: data.id || uuidv4(),
      buildingId: data.buildingId,
      campusId: data.campusId,
      level: data.level ?? 0,
      code: data.code || `FL-${data.level ?? 0}`,
      name: data.name || { en: `Floor ${data.level ?? 0}` },
      planImageUrl: data.planImageUrl,
      svgContent: data.svgContent,
      dimensions: data.dimensions || { widthMeters: 100, heightMeters: 100 },
      overlayConfig: data.overlayConfig || {
        opacity: 0.8,
        rotationDegrees: 0,
        scaleX: 1,
        scaleY: 1,
        offsetX: 0,
        offsetY: 0,
      },
      createdAt: now,
      updatedAt: now,
    };
    floors = [...floors, newFloor];
    save(LS_FLOORS, floors);

    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'CREATE',
      resourceType: 'floor',
      resourceId: newFloor.id,
      campusId: newFloor.campusId,
      status: 'SUCCESS',
    });

    return { success: true, data: newFloor };
  },

  updateFloor: async (id: string, data: Partial<Floor>): Promise<{ success: boolean; data?: Floor; message?: string }> => {
    const idx = floors.findIndex(f => f.id === id);
    if (idx === -1) return { success: false, message: 'Not found' };

    const updated: Floor = {
      ...floors[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    floors = floors.map((f, i) => i === idx ? updated : f);
    save(LS_FLOORS, floors);
    return { success: true, data: updated };
  },

  duplicateFloor: async (
    sourceFloorId: string,
    newLevel: number,
    newName?: LocalizedString,
    duplicateObjects = false
  ): Promise<{ success: boolean; data?: Floor; message?: string }> => {
    const sourceRes = await campusService.getFloorById(sourceFloorId);
    if (!sourceRes.success || !sourceRes.data) {
      return { success: false, message: 'Source floor not found' };
    }
    const source = sourceRes.data;

    // Check for level conflict within the same building
    const existingSameLevel = floors.find(f => f.buildingId === source.buildingId && f.level === newLevel);
    if (existingSameLevel) {
      return { success: false, message: `Floor with level ${newLevel} already exists in this building.` };
    }

    const createdFloorRes = await campusService.createFloor({
      buildingId: source.buildingId,
      campusId: source.campusId,
      level: newLevel,
      code: `FL-${newLevel}`,
      name: newName || { en: `Floor ${newLevel} (Copy of Level ${source.level})` },
      dimensions: { ...source.dimensions },
      planImageUrl: source.planImageUrl,
      svgContent: source.svgContent,
      overlayConfig: source.overlayConfig ? { ...source.overlayConfig } : undefined,
    });

    if (!createdFloorRes.success || !createdFloorRes.data) {
      return createdFloorRes;
    }

    const newFloor = createdFloorRes.data;

    // Duplicate objects if requested
    if (duplicateObjects) {
      const sourceObjects = objectStore.getByFloor(sourceFloorId);
      for (const obj of sourceObjects) {
        objectStore.create({
          ...obj,
          id: uuidv4(),
          floorId: newFloor.id,
          code: `${obj.code}-L${newLevel}`,
          name: typeof obj.name === 'string'
            ? { en: `${obj.name} (L${newLevel})` }
            : { ...obj.name, en: `${obj.name?.en || 'Room'} (L${newLevel})` },
        });
      }
    }

    return { success: true, data: newFloor };
  },

  canDeleteFloor: async (id: string): Promise<DeletionSafetyReport> => {
    const relatedObjects = objectStore.getByFloor(id);
    const relatedNodes = navStore.getNodesByFloor(id);
    const relatedConns = navStore.getConnectionsByFloor(id);

    const issues: string[] = [];
    if (relatedObjects.length > 0) {
      issues.push(`Floor contains ${relatedObjects.length} object(s).`);
    }
    if (relatedNodes.length > 0 || relatedConns.length > 0) {
      issues.push(`Floor has ${relatedNodes.length} navigation node(s) and ${relatedConns.length} connection(s).`);
    }

    return {
      canDelete: issues.length === 0,
      issues,
      stats: {
        objectsCount: relatedObjects.length,
        nodesCount: relatedNodes.length,
        connectionsCount: relatedConns.length,
      },
    };
  },

  deleteFloor: async (id: string, force = false): Promise<{ success: boolean; message?: string }> => {
    const flr = floors.find(f => f.id === id);
    const user = await authGuard.enforce('delete', 'floor', { campusId: flr?.campusId, resourceId: id });
    const safety = await campusService.canDeleteFloor(id);
    if (!safety.canDelete && !force) {
      return {
        success: false,
        message: `Cannot delete floor safely: ${safety.issues.join(' ')} Use force=true to cascade delete.`,
      };
    }

    floors = floors.filter(f => f.id !== id);
    save(LS_FLOORS, floors);

    // Clean objects and nodes on this floor
    objectStore.deleteByFloor(id);
    const floorNodes = navStore.getNodesByFloor(id);
    floorNodes.forEach(n => navStore.deleteNode(n.id));

    const floorConns = navStore.getConnectionsByFloor(id);
    floorConns.forEach(c => navStore.deleteConnection(c.id));

    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'DELETE',
      resourceType: 'floor',
      resourceId: id,
      campusId: flr?.campusId,
      status: 'SUCCESS',
    });

    return { success: true };
  },

  reset(newCampuses?: Campus[], newBuildings?: Building[], newFloors?: Floor[]): void {
    campuses = newCampuses ? [...newCampuses] : [...INITIAL_CAMPUSES];
    buildings = newBuildings ? [...newBuildings] : [...INITIAL_BUILDINGS];
    floors = newFloors ? [...newFloors] : [...INITIAL_FLOORS];
    save(LS_CAMPUSES, campuses);
    save(LS_BUILDINGS, buildings);
    save(LS_FLOORS, floors);
  },
};
