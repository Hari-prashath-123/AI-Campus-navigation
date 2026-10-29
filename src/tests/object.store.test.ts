import { describe, it, expect, beforeEach } from 'vitest';
import { objectStore } from '../api/object.store';

describe('objectStore (Unified Map Object Storage)', () => {
  beforeEach(() => {
    objectStore.reset();
  });

  it('initializes with seed map objects', () => {
    const all = objectStore.getAll();
    expect(all.length).toBeGreaterThan(0);
  });

  it('supports full CRUD lifecycle for map objects', () => {
    const created = objectStore.create({
      campusId: 'camp-1',
      buildingId: 'b-1',
      floorId: 'fl-1',
      code: 'CONF-402',
      name: { en: 'Innovation Room' },
      category: 'room',
      coordinates: { x: 25, y: 30 },
      isAccessible: true,
      geometryType: 'polygon',
    });

    expect(created.id).toBeDefined();
    expect(objectStore.getById(created.id)).toBeDefined();

    const updated = objectStore.update(created.id, {
      code: 'CONF-402-B',
    });
    expect(updated?.code).toBe('CONF-402-B');

    const searchResults = objectStore.search('camp-1', 'Innovation');
    expect(searchResults.some(o => o.id === created.id)).toBe(true);

    const deleted = objectStore.delete(created.id);
    expect(deleted).toBe(true);
    expect(objectStore.getById(created.id)).toBeUndefined();
  });
});
