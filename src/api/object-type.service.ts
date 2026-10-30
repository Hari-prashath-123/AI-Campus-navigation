import { apiClient } from './client';
import {
  ObjectType,
  ObjectTypeFormData,
  PropertyDefinition,
} from '../types';
import { NotFoundError, ValidationError } from '../utils/errors';
import { generateEntityId, isValidSlug } from '../utils/validation';
import { objectStore } from './object.store';

const LS_OBJECT_TYPES = 'omnicampus_object_types';

function loadTypes(fallback: ObjectType[]): ObjectType[] {
  try {
    const raw = localStorage.getItem(LS_OBJECT_TYPES);
    if (raw) return JSON.parse(raw) as ObjectType[];
  } catch {}
  return fallback;
}

function saveTypes(data: ObjectType[]) {
  try {
    localStorage.setItem(LS_OBJECT_TYPES, JSON.stringify(data));
  } catch {}
}

// ─── Built-in system object types (seeded; cannot be deleted) ─────────────────

const SYSTEM_TYPES: ObjectType[] = [
  {
    id: 'ot-classroom',
    slug: 'classroom',
    name: 'Classroom',
    description: 'General-purpose teaching room with seating and presentation equipment.',
    category: 'room',
    iconName: 'BookOpen',
    color: '#3b82f6',
    isNavigable: true,
    isBarrier: false,
    isConnector: false,
    isSystem: true,
    sortOrder: 10,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    propertyDefinitions: [
      { id: 'p-cls-1', key: 'room_number', label: 'Room Number', type: 'text', required: true, isVisibleOnCard: true, isSearchable: true, sortOrder: 1, placeholder: 'e.g. 101-A' },
      { id: 'p-cls-2', key: 'capacity', label: 'Seating Capacity', type: 'number', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 2, min: 1, max: 1000, unit: 'seats' },
      { id: 'p-cls-3', key: 'department', label: 'Department', type: 'text', required: false, isVisibleOnCard: true, isSearchable: true, sortOrder: 3 },
      { id: 'p-cls-4', key: 'purpose', label: 'Purpose', type: 'select', required: false, isVisibleOnCard: false, isSearchable: false, sortOrder: 4, options: [{ value: 'lecture', label: 'Lecture Hall' }, { value: 'tutorial', label: 'Tutorial Room' }, { value: 'seminar', label: 'Seminar Room' }, { value: 'exam', label: 'Exam Hall' }] },
      { id: 'p-cls-5', key: 'length', label: 'Length', type: 'number', required: false, isVisibleOnCard: false, isSearchable: false, sortOrder: 5, min: 0, unit: 'm' },
      { id: 'p-cls-6', key: 'width', label: 'Width', type: 'number', required: false, isVisibleOnCard: false, isSearchable: false, sortOrder: 6, min: 0, unit: 'm' },
      { id: 'p-cls-7', key: 'has_projector', label: 'Has Projector', type: 'boolean', required: false, isVisibleOnCard: false, isSearchable: false, sortOrder: 7, defaultValue: false },
      { id: 'p-cls-8', key: 'has_ac', label: 'Air Conditioned', type: 'boolean', required: false, isVisibleOnCard: false, isSearchable: false, sortOrder: 8, defaultValue: false },
    ],
  },
  {
    id: 'ot-lab',
    slug: 'laboratory',
    name: 'Laboratory',
    description: 'Research or teaching laboratory.',
    category: 'room',
    iconName: 'FlaskConical',
    color: '#06b6d4',
    isNavigable: true,
    isBarrier: false,
    isConnector: false,
    isSystem: true,
    sortOrder: 20,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    propertyDefinitions: [
      { id: 'p-lab-1', key: 'room_number', label: 'Room Number', type: 'text', required: true, isVisibleOnCard: true, isSearchable: true, sortOrder: 1 },
      { id: 'p-lab-2', key: 'capacity', label: 'Capacity', type: 'number', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 2, min: 1, unit: 'persons' },
      { id: 'p-lab-3', key: 'lab_type', label: 'Lab Type', type: 'select', required: true, isVisibleOnCard: true, isSearchable: true, sortOrder: 3, options: [{ value: 'ai_ml', label: 'AI / Machine Learning' }, { value: 'robotics', label: 'Robotics' }, { value: 'chemistry', label: 'Chemistry' }, { value: 'physics', label: 'Physics' }, { value: 'biology', label: 'Biology' }, { value: 'electronics', label: 'Electronics' }, { value: 'computer', label: 'Computer Lab' }] },
      { id: 'p-lab-4', key: 'safety_level', label: 'Safety Level', type: 'select', required: false, isVisibleOnCard: false, isSearchable: false, sortOrder: 4, options: [{ value: 'standard', label: 'Standard' }, { value: 'chemical', label: 'Chemical Hazard' }, { value: 'bio2', label: 'Biosafety Level 2' }, { value: 'high_voltage', label: 'High Voltage' }] },
    ],
  },
  {
    id: 'ot-office',
    slug: 'office',
    name: 'Office',
    description: 'Staff, faculty or administrative office.',
    category: 'room',
    iconName: 'Briefcase',
    color: '#64748b',
    isNavigable: true,
    isBarrier: false,
    isConnector: false,
    isSystem: true,
    sortOrder: 30,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    propertyDefinitions: [
      { id: 'p-off-1', key: 'room_number', label: 'Room Number', type: 'text', required: true, isVisibleOnCard: true, isSearchable: true, sortOrder: 1 },
      { id: 'p-off-2', key: 'occupant_name', label: 'Occupant Name', type: 'text', required: false, isVisibleOnCard: true, isSearchable: true, sortOrder: 2 },
      { id: 'p-off-3', key: 'designation', label: 'Designation / Title', type: 'text', required: false, isVisibleOnCard: true, isSearchable: true, sortOrder: 3 },
      { id: 'p-off-4', key: 'department', label: 'Department', type: 'text', required: false, isVisibleOnCard: true, isSearchable: true, sortOrder: 4 },
      { id: 'p-off-5', key: 'phone_extension', label: 'Phone Extension', type: 'text', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 5, placeholder: 'e.g. 4201' },
      { id: 'p-off-6', key: 'is_public', label: 'Open to Public', type: 'boolean', required: false, isVisibleOnCard: false, isSearchable: false, sortOrder: 6, defaultValue: false },
    ],
  },
  {
    id: 'ot-restroom',
    slug: 'restroom',
    name: 'Restroom',
    description: 'Washroom or toilet facility.',
    category: 'amenity',
    iconName: 'Toilet',
    color: '#10b981',
    isNavigable: true,
    isBarrier: false,
    isConnector: false,
    isSystem: true,
    sortOrder: 40,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    propertyDefinitions: [
      { id: 'p-wc-1', key: 'gender', label: 'Gender', type: 'select', required: true, isVisibleOnCard: true, isSearchable: false, sortOrder: 1, options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'all', label: 'All Genders' }, { value: 'accessible', label: 'Accessible / Disability' }] },
      { id: 'p-wc-2', key: 'is_accessible', label: 'Wheelchair Accessible', type: 'boolean', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 2, defaultValue: false },
    ],
  },
  {
    id: 'ot-cafeteria',
    slug: 'cafeteria',
    name: 'Cafeteria / Canteen',
    description: 'Food and beverage service area.',
    category: 'amenity',
    iconName: 'Utensils',
    color: '#f97316',
    isNavigable: true,
    isBarrier: false,
    isConnector: false,
    isSystem: true,
    sortOrder: 50,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    propertyDefinitions: [
      { id: 'p-caf-1', key: 'seating_capacity', label: 'Seating Capacity', type: 'number', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 1, min: 1 },
      { id: 'p-caf-2', key: 'opening_hours', label: 'Opening Hours', type: 'text', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 2, placeholder: 'e.g. 08:00 – 20:00' },
      { id: 'p-caf-3', key: 'cuisine_types', label: 'Cuisine Types', type: 'multi_select', required: false, isVisibleOnCard: false, isSearchable: true, sortOrder: 3, options: [{ value: 'veg', label: 'Vegetarian' }, { value: 'nonveg', label: 'Non-Vegetarian' }, { value: 'vegan', label: 'Vegan' }, { value: 'snacks', label: 'Snacks' }, { value: 'beverages', label: 'Beverages' }] },
    ],
  },
  {
    id: 'ot-elevator',
    slug: 'elevator',
    name: 'Elevator / Lift',
    description: 'Vertical transport between floors.',
    category: 'transit',
    iconName: 'ArrowUpDown',
    color: '#f59e0b',
    isNavigable: true,
    isBarrier: false,
    isConnector: true,
    isSystem: true,
    sortOrder: 60,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    propertyDefinitions: [
      { id: 'p-elv-1', key: 'load_kg', label: 'Load Capacity (kg)', type: 'number', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 1, min: 0, unit: 'kg' },
      { id: 'p-elv-2', key: 'is_accessible', label: 'Wheelchair Accessible', type: 'boolean', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 2, defaultValue: true },
      { id: 'p-elv-3', key: 'floors_served', label: 'Floors Served', type: 'text', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 3, placeholder: 'e.g. G, 1, 2, 3' },
    ],
  },
  {
    id: 'ot-stairs',
    slug: 'staircase',
    name: 'Staircase',
    description: 'Stairway connecting floors.',
    category: 'transit',
    iconName: 'MoveUp',
    color: '#eab308',
    isNavigable: true,
    isBarrier: false,
    isConnector: true,
    isSystem: true,
    sortOrder: 70,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    propertyDefinitions: [
      { id: 'p-st-1', key: 'floors_served', label: 'Floors Served', type: 'text', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 1, placeholder: 'e.g. G, 1, 2' },
      { id: 'p-st-2', key: 'is_accessible', label: 'Accessible (Ramp nearby)', type: 'boolean', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 2, defaultValue: false },
    ],
  },
  {
    id: 'ot-entrance',
    slug: 'entrance',
    name: 'Entrance / Door',
    description: 'Entry point into a building or zone.',
    category: 'entrance',
    iconName: 'DoorOpen',
    color: '#22c55e',
    isNavigable: true,
    isBarrier: false,
    isConnector: false,
    isSystem: true,
    sortOrder: 80,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    propertyDefinitions: [
      { id: 'p-ent-1', key: 'entrance_type', label: 'Entrance Type', type: 'select', required: true, isVisibleOnCard: true, isSearchable: false, sortOrder: 1, options: [{ value: 'main', label: 'Main Entrance' }, { value: 'side', label: 'Side Entrance' }, { value: 'staff', label: 'Staff Only' }, { value: 'emergency', label: 'Emergency Exit' }, { value: 'vehicle', label: 'Vehicle Gate' }] },
      { id: 'p-ent-2', key: 'opening_hours', label: 'Opening Hours', type: 'text', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 2, placeholder: 'e.g. 07:00 – 22:00 or 24/7' },
      { id: 'p-ent-3', key: 'security_required', label: 'Security / Access Control', type: 'boolean', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 3, defaultValue: false },
      { id: 'p-ent-4', key: 'is_accessible', label: 'Wheelchair Accessible', type: 'boolean', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 4, defaultValue: true },
      { id: 'p-ent-5', key: 'is_automatic', label: 'Automatic Door', type: 'boolean', required: false, isVisibleOnCard: false, isSearchable: false, sortOrder: 5, defaultValue: false },
    ],
  },
  {
    id: 'ot-parking',
    slug: 'parking',
    name: 'Parking',
    description: 'Vehicle parking area.',
    category: 'outdoor',
    iconName: 'SquareP',
    color: '#475569',
    isNavigable: true,
    isBarrier: false,
    isConnector: false,
    isSystem: true,
    sortOrder: 90,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    propertyDefinitions: [
      { id: 'p-prk-1', key: 'total_slots', label: 'Total Slots', type: 'number', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 1, min: 1 },
      { id: 'p-prk-2', key: 'vehicle_type', label: 'Vehicle Type', type: 'multi_select', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 2, options: [{ value: 'car', label: 'Car' }, { value: 'bike', label: 'Motorcycle / Bike' }, { value: 'bicycle', label: 'Bicycle' }, { value: 'bus', label: 'Bus / Large Vehicle' }] },
      { id: 'p-prk-3', key: 'is_covered', label: 'Covered Parking', type: 'boolean', required: false, isVisibleOnCard: false, isSearchable: false, sortOrder: 3, defaultValue: false },
    ],
  },
  {
    id: 'ot-corridor',
    slug: 'corridor',
    name: 'Corridor / Walkway',
    description: 'Internal walking passage connecting spaces.',
    category: 'transit',
    iconName: 'Footprints',
    color: '#94a3b8',
    isNavigable: true,
    isBarrier: false,
    isConnector: false,
    isSystem: true,
    sortOrder: 100,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    propertyDefinitions: [
      { id: 'p-cor-1', key: 'width_meters', label: 'Corridor Width (m)', type: 'number', required: false, isVisibleOnCard: false, isSearchable: false, sortOrder: 1, min: 0.5, unit: 'm' },
      { id: 'p-cor-2', key: 'is_accessible', label: 'Wheelchair Accessible', type: 'boolean', required: false, isVisibleOnCard: false, isSearchable: false, sortOrder: 2, defaultValue: true },
    ],
  },
  {
    id: 'ot-landmark',
    slug: 'landmark',
    name: 'Landmark',
    description: 'Notable feature used for navigation reference (statue, fountain, etc.).',
    category: 'outdoor',
    iconName: 'Landmark',
    color: '#a855f7',
    isNavigable: true,
    isBarrier: false,
    isConnector: false,
    isSystem: true,
    sortOrder: 110,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    propertyDefinitions: [
      { id: 'p-lmk-1', key: 'landmark_type', label: 'Type', type: 'select', required: false, isVisibleOnCard: true, isSearchable: true, sortOrder: 1, options: [{ value: 'statue', label: 'Statue' }, { value: 'fountain', label: 'Fountain' }, { value: 'tree', label: 'Tree / Garden' }, { value: 'sign', label: 'Sign / Board' }, { value: 'other', label: 'Other' }] },
      { id: 'p-lmk-2', key: 'description_note', label: 'Description Note', type: 'text', required: false, isVisibleOnCard: true, isSearchable: true, sortOrder: 2, multiline: true },
    ],
  },
  {
    id: 'ot-drinking-water',
    slug: 'drinking-water',
    name: 'Drinking Water',
    description: 'Water cooler, fountain, or purifier.',
    category: 'amenity',
    iconName: 'Droplets',
    color: '#38bdf8',
    isNavigable: true,
    isBarrier: false,
    isConnector: false,
    isSystem: true,
    sortOrder: 120,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    propertyDefinitions: [
      { id: 'p-dw-1', key: 'is_purified', label: 'Purified / Filtered', type: 'boolean', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 1, defaultValue: true },
      { id: 'p-dw-2', key: 'is_accessible', label: 'Accessible Height', type: 'boolean', required: false, isVisibleOnCard: false, isSearchable: false, sortOrder: 2, defaultValue: false },
    ],
  },
  {
    id: 'ot-bridge',
    slug: 'bridge',
    name: 'Bridge / Walkway Link',
    description: 'Elevated or outdoor bridge connecting two buildings.',
    category: 'outdoor',
    iconName: 'ArrowLeftRight',
    color: '#78716c',
    isNavigable: true,
    isBarrier: false,
    isConnector: true,
    isSystem: true,
    sortOrder: 130,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    propertyDefinitions: [
      { id: 'p-br-1', key: 'connects', label: 'Connects', type: 'text', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 1, placeholder: 'e.g. Block A ↔ Block B' },
      { id: 'p-br-2', key: 'is_covered', label: 'Covered Bridge', type: 'boolean', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 2, defaultValue: false },
      { id: 'p-br-3', key: 'is_accessible', label: 'Wheelchair Accessible', type: 'boolean', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 3, defaultValue: false },
    ],
  },
];

/**
 * Full-featured ObjectType Service with CRUD + validation
 */
export class ObjectTypeService {
  private static instance: ObjectTypeService;
  private types: ObjectType[] = loadTypes([...SYSTEM_TYPES]);

  private constructor() {}

  public static getInstance(): ObjectTypeService {
    if (!ObjectTypeService.instance) {
      ObjectTypeService.instance = new ObjectTypeService();
    }
    return ObjectTypeService.instance;
  }

  public async getAll(): Promise<ApiResponse<ObjectType[]>> {
    const sorted = [...this.types].sort((a, b) => a.sortOrder - b.sortOrder);
    return apiClient.simulateNetwork(sorted);
  }

  public async getById(id: string): Promise<ApiResponse<ObjectType>> {
    const t = this.types.find((x) => x.id === id);
    if (!t) throw new NotFoundError('ObjectType', id);
    return apiClient.simulateNetwork({ ...t });
  }

  public async getBySlug(slug: string): Promise<ApiResponse<ObjectType>> {
    const t = this.types.find((x) => x.slug === slug);
    if (!t) throw new NotFoundError('ObjectType', slug);
    return apiClient.simulateNetwork({ ...t });
  }

  public async create(data: ObjectTypeFormData): Promise<ApiResponse<ObjectType>> {
    this.validateForm(data, null);

    const newType: ObjectType = {
      id: generateEntityId('ot'),
      slug: data.slug.trim().toLowerCase(),
      name: data.name.trim(),
      description: data.description.trim(),
      category: data.category,
      iconName: data.iconName,
      color: data.color,
      isNavigable: data.isNavigable,
      isBarrier: data.isBarrier,
      isConnector: data.isConnector,
      isSystem: false,
      propertyDefinitions: data.propertyDefinitions.map((p, i) => ({
        ...p,
        sortOrder: i,
      })),
      sortOrder: this.types.length * 10 + 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.types.push(newType);
    saveTypes(this.types);
    return apiClient.simulateNetwork({ ...newType });
  }

  public async update(id: string, data: ObjectTypeFormData): Promise<ApiResponse<ObjectType>> {
    const idx = this.types.findIndex((x) => x.id === id);
    if (idx === -1) throw new NotFoundError('ObjectType', id);
    if (this.types[idx].isSystem) throw new ValidationError('System object types cannot be renamed. You can only edit their property definitions.');

    this.validateForm(data, id);

    const updated: ObjectType = {
      ...this.types[idx],
      slug: data.slug.trim().toLowerCase(),
      name: data.name.trim(),
      description: data.description.trim(),
      category: data.category,
      iconName: data.iconName,
      color: data.color,
      isNavigable: data.isNavigable,
      isBarrier: data.isBarrier,
      isConnector: data.isConnector,
      propertyDefinitions: data.propertyDefinitions.map((p, i) => ({ ...p, sortOrder: i })),
      updatedAt: new Date().toISOString(),
    };

    this.types[idx] = updated;
    saveTypes(this.types);
    return apiClient.simulateNetwork({ ...updated });
  }

  public async updateSystemProperties(id: string, defs: PropertyDefinition[]): Promise<ApiResponse<ObjectType>> {
    const idx = this.types.findIndex((x) => x.id === id);
    if (idx === -1) throw new NotFoundError('ObjectType', id);

    const updated: ObjectType = {
      ...this.types[idx],
      propertyDefinitions: defs.map((p, i) => ({ ...p, sortOrder: i })),
      updatedAt: new Date().toISOString(),
    };

    this.types[idx] = updated;
    saveTypes(this.types);
    return apiClient.simulateNetwork({ ...updated });
  }

  public async delete(id: string): Promise<ApiResponse<void>> {
    const t = this.types.find((x) => x.id === id);
    if (!t) throw new NotFoundError('ObjectType', id);
    if (t.isSystem) throw new ValidationError('System object types cannot be deleted. They are required for core platform functionality.');

    // Reference validation: check if active objects are using this object type
    const referencingObjects = objectStore.getAll().filter(o => o.objectTypeId === id);
    if (referencingObjects.length > 0) {
      throw new ValidationError(
        `Cannot delete object type "${t.name}": it is currently referenced by ${referencingObjects.length} object(s). Reassign or delete those objects before removing this type.`
      );
    }

    this.types = this.types.filter((x) => x.id !== id);
    saveTypes(this.types);
    return apiClient.simulateNetwork(undefined);
  }

  /**
   * Helper to compute default property values for an object type
   */
  public getDefaultProperties(typeIdOrSlug: string): Record<string, unknown> {
    const t = this.types.find(x => x.id === typeIdOrSlug || x.slug === typeIdOrSlug);
    if (!t) return {};

    const defaults: Record<string, unknown> = {};
    for (const prop of t.propertyDefinitions) {
      if (prop.defaultValue !== undefined && prop.defaultValue !== null) {
        defaults[prop.key] = prop.defaultValue;
      }
    }
    return defaults;
  }

  public reset(): void {
    this.types = [...SYSTEM_TYPES];
    saveTypes(this.types);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private validateForm(data: ObjectTypeFormData, excludeId: string | null): void {
    if (!data.name.trim()) throw new ValidationError('Name is required.');
    if (!data.slug.trim()) throw new ValidationError('Slug is required.');
    if (!isValidSlug(data.slug.trim())) {
      throw new ValidationError('Slug must be lowercase letters, numbers, and hyphens only (e.g. "fire-exit").');
    }

    const slugExists = this.types.some(
      (x) => x.slug === data.slug.trim().toLowerCase() && x.id !== excludeId
    );
    if (slugExists) throw new ValidationError(`An object type with slug "${data.slug}" already exists.`);

    const keysSeen = new Set<string>();
    for (const prop of data.propertyDefinitions) {
      if (!prop.key.trim()) throw new ValidationError(`Property "${prop.label || 'unnamed'}" must have a key.`);
      if (!prop.label.trim()) throw new ValidationError(`A property is missing a display label.`);
      if (!/^[a-z0-9_]+$/.test(prop.key)) {
        throw new ValidationError(`Property key "${prop.key}" must be lowercase letters, numbers, and underscores only.`);
      }
      if (keysSeen.has(prop.key)) throw new ValidationError(`Duplicate property key: "${prop.key}".`);
      keysSeen.add(prop.key);

      if ((prop.type === 'select' || prop.type === 'multi_select') && (!prop.options || prop.options.length === 0)) {
        throw new ValidationError(`Property "${prop.label}" is a select type and must have at least one option.`);
      }
    }
  }
}

export const objectTypeService = ObjectTypeService.getInstance();

// ─── Re-export legacy alias for backward-compat ───────────────────────────────
export const getAllObjectTypes = () => objectTypeService.getAll();

// ─── Internal API response type (local to avoid circular import) ──────────────
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}
