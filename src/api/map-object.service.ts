import { MapObject } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Mock DB
let mockObjects: MapObject[] = [];

export const mapObjectService = {
  getAll: async (floorId?: string): Promise<{ success: boolean; data: MapObject[]; message?: string }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const filtered = floorId ? mockObjects.filter(o => o.floorId === floorId) : mockObjects;
        resolve({ success: true, data: filtered });
      }, 300);
    });
  },

  getById: async (id: string): Promise<{ success: boolean; data: MapObject; message?: string }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const obj = mockObjects.find(o => o.id === id);
        if (obj) {
          resolve({ success: true, data: obj });
        } else {
          resolve({ success: false, data: null as any, message: 'Object not found' });
        }
      }, 300);
    });
  },

  create: async (data: Partial<MapObject>): Promise<{ success: boolean; data: MapObject; message?: string }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newObj: MapObject = {
          id: data.id || uuidv4(),
          campusId: data.campusId || 'default-campus',
          buildingId: data.buildingId || 'default-building',
          floorId: data.floorId || 'default-floor',
          code: data.code || `OBJ-${Math.floor(Math.random() * 1000)}`,
          name: data.name || { en: 'New Object' },
          description: data.description,
          category: data.category || 'room',
          coordinates: data.coordinates || { x: 0, y: 0 },
          associatedNodeId: data.associatedNodeId || '',
          isAccessible: data.isAccessible ?? true,
          tags: data.tags || [],
          attributes: data.attributes || {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockObjects.push(newObj);
        resolve({ success: true, data: newObj });
      }, 400);
    });
  },

  update: async (id: string, data: Partial<MapObject>): Promise<{ success: boolean; data: MapObject; message?: string }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = mockObjects.findIndex(o => o.id === id);
        if (index === -1) {
          resolve({ success: false, data: null as any, message: 'Object not found' });
          return;
        }

        mockObjects[index] = {
          ...mockObjects[index],
          ...data,
          updatedAt: new Date().toISOString(),
        };

        resolve({ success: true, data: mockObjects[index] });
      }, 400);
    });
  },

  delete: async (id: string): Promise<{ success: boolean; message?: string }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        mockObjects = mockObjects.filter(o => o.id !== id);
        resolve({ success: true });
      }, 300);
    });
  }
};
