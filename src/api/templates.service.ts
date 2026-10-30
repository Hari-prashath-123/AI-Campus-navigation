import { ObjectType, ObjectTypeFormData, Campus } from '../types';
import { objectTypeService } from './object-type.service';
import { campusService } from './campus.service';
import { authGuard } from './auth-guard';
import { auditService } from './audit.service';
import { NotFoundError } from '../utils/errors';

export interface IndoorTemplateMeta {
  id: string;
  name: string;
  description: string;
  domain: 'academic' | 'corporate' | 'healthcare' | 'transit' | 'commercial';
  iconName: string;
  objectTypeCount: number;
}

export interface IndoorDomainTemplate extends IndoorTemplateMeta {
  objectTypes: ObjectTypeFormData[];
}

export const COMMON_INDOOR_TEMPLATES: IndoorDomainTemplate[] = [
  {
    id: 'template-academic',
    name: 'Academic & Higher Education',
    description: 'Standard indoor spaces for colleges, universities, and educational training campuses.',
    domain: 'academic',
    iconName: 'GraduationCap',
    objectTypeCount: 6,
    objectTypes: [
      {
        slug: 'lecture-hall',
        name: 'Lecture Hall',
        description: 'Large tiered seating auditorium for lectures and seminars.',
        category: 'room',
        iconName: 'Presentation',
        color: '#2563eb',
        isNavigable: true,
        isBarrier: false,
        isConnector: false,
        propertyDefinitions: [
          { id: 'p-lh-1', key: 'room_number', label: 'Room Number', type: 'text', required: true, isVisibleOnCard: true, isSearchable: true, sortOrder: 1 },
          { id: 'p-lh-2', key: 'capacity', label: 'Seating Capacity', type: 'number', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 2, min: 20, max: 1000 },
          { id: 'p-lh-3', key: 'has_av_system', label: 'Smart AV System', type: 'boolean', required: false, isVisibleOnCard: false, isSearchable: false, sortOrder: 3, defaultValue: true },
        ],
      },
      {
        slug: 'research-lab',
        name: 'Research Laboratory',
        description: 'Specialized lab space equipped for scientific and engineering research.',
        category: 'room',
        iconName: 'FlaskConical',
        color: '#0891b2',
        isNavigable: true,
        isBarrier: false,
        isConnector: false,
        propertyDefinitions: [
          { id: 'p-rl-1', key: 'room_number', label: 'Lab Number', type: 'text', required: true, isVisibleOnCard: true, isSearchable: true, sortOrder: 1 },
          { id: 'p-rl-2', key: 'safety_level', label: 'Biosafety Level', type: 'select', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 2, options: [{ value: 'bsl1', label: 'BSL-1' }, { value: 'bsl2', label: 'BSL-2' }, { value: 'cleanroom', label: 'Cleanroom' }] },
          { id: 'p-rl-3', key: 'supervisor', label: 'Principal Investigator', type: 'text', required: false, isVisibleOnCard: true, isSearchable: true, sortOrder: 3 },
        ],
      },
      {
        slug: 'faculty-cabin',
        name: 'Faculty Cabin / Office',
        description: 'Private consultation and study office for teaching staff and professors.',
        category: 'room',
        iconName: 'Briefcase',
        color: '#475569',
        isNavigable: true,
        isBarrier: false,
        isConnector: false,
        propertyDefinitions: [
          { id: 'p-fc-1', key: 'room_number', label: 'Cabin Number', type: 'text', required: true, isVisibleOnCard: true, isSearchable: true, sortOrder: 1 },
          { id: 'p-fc-2', key: 'faculty_name', label: 'Faculty Name', type: 'text', required: false, isVisibleOnCard: true, isSearchable: true, sortOrder: 2 },
          { id: 'p-fc-3', key: 'office_hours', label: 'Consultation Hours', type: 'text', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 3 },
        ],
      },
      {
        slug: 'study-lounge',
        name: 'Student Study Lounge',
        description: 'Quiet collaborative work zone for students with charging ports and desks.',
        category: 'amenity',
        iconName: 'BookOpen',
        color: '#8b5cf6',
        isNavigable: true,
        isBarrier: false,
        isConnector: false,
        propertyDefinitions: [
          { id: 'p-sl-1', key: 'desks_count', label: 'Study Desks', type: 'number', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 1, min: 1 },
          { id: 'p-sl-2', key: 'is_silent_zone', label: 'Silent Zone', type: 'boolean', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 2, defaultValue: false },
        ],
      },
      {
        slug: 'seminar-hall',
        name: 'Seminar Hall',
        description: 'Medium-sized conference and symposium room.',
        category: 'room',
        iconName: 'Users',
        color: '#3b82f6',
        isNavigable: true,
        isBarrier: false,
        isConnector: false,
        propertyDefinitions: [
          { id: 'p-sh-1', key: 'room_number', label: 'Hall Number', type: 'text', required: true, isVisibleOnCard: true, isSearchable: true, sortOrder: 1 },
          { id: 'p-sh-2', key: 'capacity', label: 'Capacity', type: 'number', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 2, min: 10, max: 300 },
        ],
      },
      {
        slug: 'campus-library',
        name: 'Library & Reading Room',
        description: 'Academic library, archive collection, and reference book section.',
        category: 'amenity',
        iconName: 'Library',
        color: '#0d9488',
        isNavigable: true,
        isBarrier: false,
        isConnector: false,
        propertyDefinitions: [
          { id: 'p-cl-1', key: 'collection_focus', label: 'Collection / Subject', type: 'text', required: false, isVisibleOnCard: true, isSearchable: true, sortOrder: 1 },
          { id: 'p-cl-2', key: 'has_printers', label: 'Printing Available', type: 'boolean', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 2, defaultValue: true },
        ],
      },
    ],
  },
  {
    id: 'template-corporate',
    name: 'Corporate & Tech Enterprise',
    description: 'Modern office buildings, tech campuses, meeting suites, and developer bays.',
    domain: 'corporate',
    iconName: 'Building2',
    objectTypeCount: 5,
    objectTypes: [
      {
        slug: 'workstation-bay',
        name: 'Workstation Bay / Pod',
        description: 'Open-plan desk clusters for development and operational teams.',
        category: 'room',
        iconName: 'Monitor',
        color: '#0284c7',
        isNavigable: true,
        isBarrier: false,
        isConnector: false,
        propertyDefinitions: [
          { id: 'p-wb-1', key: 'bay_code', label: 'Bay Code', type: 'text', required: true, isVisibleOnCard: true, isSearchable: true, sortOrder: 1 },
          { id: 'p-wb-2', key: 'seat_count', label: 'Number of Desks', type: 'number', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 2, min: 1, max: 200 },
          { id: 'p-wb-3', key: 'department', label: 'Allocated Department', type: 'text', required: false, isVisibleOnCard: true, isSearchable: true, sortOrder: 3 },
        ],
      },
      {
        slug: 'conference-room',
        name: 'Conference Room',
        description: 'Video-conferencing room for team discussions and client presentations.',
        category: 'room',
        iconName: 'Video',
        color: '#4f46e5',
        isNavigable: true,
        isBarrier: false,
        isConnector: false,
        propertyDefinitions: [
          { id: 'p-cr-1', key: 'room_name', label: 'Room Identifier', type: 'text', required: true, isVisibleOnCard: true, isSearchable: true, sortOrder: 1 },
          { id: 'p-cr-2', key: 'seating_capacity', label: 'Seating Capacity', type: 'number', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 2, min: 2, max: 100 },
          { id: 'p-cr-3', key: 'has_telepresence', label: 'VC Hardware Installed', type: 'boolean', required: false, isVisibleOnCard: false, isSearchable: false, sortOrder: 3, defaultValue: true },
        ],
      },
      {
        slug: 'phone-booth',
        name: 'Quiet Phone Booth',
        description: 'Single-occupancy soundproof booth for private calls.',
        category: 'room',
        iconName: 'PhoneCall',
        color: '#6366f1',
        isNavigable: true,
        isBarrier: false,
        isConnector: false,
        propertyDefinitions: [
          { id: 'p-pb-1', key: 'booth_number', label: 'Booth ID', type: 'text', required: true, isVisibleOnCard: true, isSearchable: true, sortOrder: 1 },
        ],
      },
      {
        slug: 'server-room',
        name: 'Server Room & IT Hub',
        description: 'Restricted critical infrastructure housing server racks and network switches.',
        category: 'infrastructure',
        iconName: 'Server',
        color: '#dc2626',
        isNavigable: false,
        isBarrier: true,
        isConnector: false,
        propertyDefinitions: [
          { id: 'p-sr-1', key: 'rack_capacity', label: 'Rack Units', type: 'number', required: false, isVisibleOnCard: false, isSearchable: false, sortOrder: 1 },
          { id: 'p-sr-2', key: 'fire_suppression', label: 'Gas Fire Suppression', type: 'boolean', required: false, isVisibleOnCard: false, isSearchable: false, sortOrder: 2, defaultValue: true },
        ],
      },
      {
        slug: 'pantry-cafeteria',
        name: 'Breakout Pantry',
        description: 'Coffee machine, beverage cooler, snacks, and dining area for employees.',
        category: 'amenity',
        iconName: 'Coffee',
        color: '#ea580c',
        isNavigable: true,
        isBarrier: false,
        isConnector: false,
        propertyDefinitions: [
          { id: 'p-pc-1', key: 'microwave_count', label: 'Microwaves Available', type: 'number', required: false, isVisibleOnCard: false, isSearchable: false, sortOrder: 1 },
        ],
      },
    ],
  },
  {
    id: 'template-healthcare',
    name: 'Healthcare & Hospital Center',
    description: 'Clinical consultation rooms, diagnostic areas, patient wards, and sterile facilities.',
    domain: 'healthcare',
    iconName: 'Activity',
    objectTypeCount: 5,
    objectTypes: [
      {
        slug: 'consultation-clinic',
        name: 'Consultation Clinic',
        description: 'Doctor examination and patient consultation cabin.',
        category: 'room',
        iconName: 'Stethoscope',
        color: '#059669',
        isNavigable: true,
        isBarrier: false,
        isConnector: false,
        propertyDefinitions: [
          { id: 'p-cc-1', key: 'room_number', label: 'Clinic Room Number', type: 'text', required: true, isVisibleOnCard: true, isSearchable: true, sortOrder: 1 },
          { id: 'p-cc-2', key: 'specialty', label: 'Medical Specialty', type: 'text', required: false, isVisibleOnCard: true, isSearchable: true, sortOrder: 2 },
          { id: 'p-cc-3', key: 'physician', label: 'Consultant Doctor', type: 'text', required: false, isVisibleOnCard: true, isSearchable: true, sortOrder: 3 },
        ],
      },
      {
        slug: 'patient-ward',
        name: 'Inpatient Ward',
        description: 'General or semi-private inpatient care room with beds.',
        category: 'room',
        iconName: 'Bed',
        color: '#10b981',
        isNavigable: true,
        isBarrier: false,
        isConnector: false,
        propertyDefinitions: [
          { id: 'p-pw-1', key: 'ward_code', label: 'Ward Code', type: 'text', required: true, isVisibleOnCard: true, isSearchable: true, sortOrder: 1 },
          { id: 'p-pw-2', key: 'bed_count', label: 'Total Beds', type: 'number', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 2, min: 1, max: 50 },
        ],
      },
      {
        slug: 'nurse-station',
        name: 'Nurse Station',
        description: 'Floor nursing desk for triage, patient chart dispatch, and emergency paging.',
        category: 'amenity',
        iconName: 'HeartPulse',
        color: '#e11d48',
        isNavigable: true,
        isBarrier: false,
        isConnector: false,
        propertyDefinitions: [
          { id: 'p-ns-1', key: 'station_phone', label: 'Station Ext / Phone', type: 'text', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 1 },
        ],
      },
      {
        slug: 'diagnostic-imaging',
        name: 'Diagnostic Imaging (X-Ray / MRI)',
        description: 'Radiation-shielded imaging suite for CT, MRI, Ultrasound, and X-Ray.',
        category: 'room',
        iconName: 'ScanLine',
        color: '#d97706',
        isNavigable: true,
        isBarrier: false,
        isConnector: false,
        propertyDefinitions: [
          { id: 'p-di-1', key: 'modality', label: 'Imaging Modality', type: 'select', required: false, isVisibleOnCard: true, isSearchable: true, sortOrder: 1, options: [{ value: 'mri', label: 'MRI' }, { value: 'ct', label: 'CT Scan' }, { value: 'xray', label: 'X-Ray' }, { value: 'ultrasound', label: 'Ultrasound' }] },
        ],
      },
      {
        slug: 'hospital-pharmacy',
        name: 'Hospital Pharmacy',
        description: 'Medication dispensary for inpatient and outpatient prescription fulfillment.',
        category: 'amenity',
        iconName: 'Pill',
        color: '#0891b2',
        isNavigable: true,
        isBarrier: false,
        isConnector: false,
        propertyDefinitions: [
          { id: 'p-hp-1', key: 'dispensary_counter', label: 'Counter Number', type: 'text', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 1 },
        ],
      },
    ],
  },
  {
    id: 'template-transit',
    name: 'Transit Terminal & Public Hub',
    description: 'Airports, railway stations, metro interchanges, and bus transit terminals.',
    domain: 'transit',
    iconName: 'Plane',
    objectTypeCount: 4,
    objectTypes: [
      {
        slug: 'ticket-counter',
        name: 'Ticketing & Service Counter',
        description: 'Passenger ticket sales, reservation changes, and customer support windows.',
        category: 'amenity',
        iconName: 'Ticket',
        color: '#2563eb',
        isNavigable: true,
        isBarrier: false,
        isConnector: false,
        propertyDefinitions: [
          { id: 'p-tc-1', key: 'counter_range', label: 'Counter Numbers', type: 'text', required: false, isVisibleOnCard: true, isSearchable: true, sortOrder: 1 },
        ],
      },
      {
        slug: 'security-checkpoint',
        name: 'Security Checkpoint & Screening',
        description: 'Mandatory baggage screening and passenger metal detector checkpoint.',
        category: 'transit',
        iconName: 'ShieldCheck',
        color: '#dc2626',
        isNavigable: true,
        isBarrier: false,
        isConnector: false,
        propertyDefinitions: [
          { id: 'p-sc-1', key: 'checkpoint_lane', label: 'Lane ID', type: 'text', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 1 },
        ],
      },
      {
        slug: 'boarding-gate',
        name: 'Boarding Gate / Platform',
        description: 'Departure lounge and embarkation gate for scheduled departures.',
        category: 'transit',
        iconName: 'DoorOpen',
        color: '#16a34a',
        isNavigable: true,
        isBarrier: false,
        isConnector: false,
        propertyDefinitions: [
          { id: 'p-bg-1', key: 'gate_number', label: 'Gate / Platform Number', type: 'text', required: true, isVisibleOnCard: true, isSearchable: true, sortOrder: 1 },
        ],
      },
      {
        slug: 'information-kiosk',
        name: 'Information & Assistance Kiosk',
        description: 'Helpdesk providing wayfinding, schedule queries, and accessibility escorts.',
        category: 'amenity',
        iconName: 'HelpCircle',
        color: '#7c3aed',
        isNavigable: true,
        isBarrier: false,
        isConnector: false,
        propertyDefinitions: [
          { id: 'p-ik-1', key: 'is_staffed', label: 'Staffed Desk', type: 'boolean', required: false, isVisibleOnCard: true, isSearchable: false, sortOrder: 1, defaultValue: true },
        ],
      },
    ],
  },
];

export const templatesService = {
  /**
   * Returns metadata for all available common indoor environment templates.
   */
  getAvailableTemplates: (): IndoorTemplateMeta[] => {
    return COMMON_INDOOR_TEMPLATES.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      domain: t.domain,
      iconName: t.iconName,
      objectTypeCount: t.objectTypes.length,
    }));
  },

  /**
   * Retrieves a domain template with full object type definitions.
   */
  getTemplateById: (templateId: string): IndoorDomainTemplate | undefined => {
    return COMMON_INDOOR_TEMPLATES.find(t => t.id === templateId);
  },

  /**
   * Registers all reusable object types from a template into the active system,
   * without requiring any specific organization map to be hardcoded.
   */
  applyTemplate: async (
    templateId: string
  ): Promise<{ applied: number; skipped: number; registeredTypes: ObjectType[] }> => {
    const user = await authGuard.enforce('create', 'object_type');
    const template = templatesService.getTemplateById(templateId);
    if (!template) {
      throw new NotFoundError('IndoorTemplate', templateId);
    }

    const allTypesRes = await objectTypeService.getAll();
    const existingSlugs = new Set((allTypesRes.data || []).map(t => t.slug));

    const registeredTypes: ObjectType[] = [];
    let applied = 0;
    let skipped = 0;

    for (const typeData of template.objectTypes) {
      if (existingSlugs.has(typeData.slug)) {
        skipped++;
        continue;
      }

      const res = await objectTypeService.create(typeData);
      if (res.success && res.data) {
        registeredTypes.push(res.data);
        existingSlugs.add(typeData.slug);
        applied++;
      }
    }

    auditService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'CREATE',
      resourceType: 'object_type',
      status: 'SUCCESS',
      details: {
        templateId,
        templateName: template.name,
        appliedTypes: applied,
        skippedTypes: skipped,
      },
    });

    return { applied, skipped, registeredTypes };
  },

  /**
   * Bootstraps a clean, unpopulated starter site with building and floor records
   * pre-configured with reusable indoor object types, ready for spatial mapping.
   */
  createStarterSite: async (
    templateId: string,
    options: {
      name: Record<string, string> | string;
      code: string;
      slug: string;
      organizationId?: string;
    }
  ): Promise<{ campus: Campus; buildingId: string; floorId: string }> => {
    const template = templatesService.getTemplateById(templateId);
    if (!template) {
      throw new NotFoundError('IndoorTemplate', templateId);
    }

    // 1. Ensure object types from template are installed
    await templatesService.applyTemplate(templateId);

    // 2. Create blank starter campus
    const localizedName = typeof options.name === 'string' ? { en: options.name } : options.name;
    const campusRes = await campusService.createCampus({
      organizationId: options.organizationId || 'org-omnicampus',
      slug: options.slug,
      code: options.code,
      name: localizedName,
      description: { en: `Starter site configured using '${template.name}' indoor template.` },
    });

    const campus = campusRes.data!;

    // 3. Create a starter building
    const bldRes = await campusService.createBuilding({
      campusId: campus.id,
      code: 'MAIN',
      name: { en: 'Main Facility' },
      totalFloors: 2,
    });

    const building = bldRes.data!;

    // 4. Create starter Ground Floor (Level 0)
    const floorRes = await campusService.createFloor({
      campusId: campus.id,
      buildingId: building.id,
      level: 0,
      code: 'L0',
      name: { en: 'Ground Floor' },
      dimensions: { widthMeters: 60, heightMeters: 40 },
    });

    return {
      campus,
      buildingId: building.id,
      floorId: floorRes.data!.id,
    };
  },
};

