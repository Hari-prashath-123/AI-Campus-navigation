import { SupportedLanguage } from './multilingual';

/**
 * Structured Context Types
 * 
 * Context is explicit and structured — never hidden inside an LLM prompt.
 * Only sanitized, relevant slices are passed to each tool/AI call.
 */

// ─── User Context ─────────────────────────────────────────────────────────────

export type UserType = 'visitor' | 'student' | 'faculty' | 'staff' | 'emergency';
export type TravelMode = 'walking' | 'vehicle';
export type NavigationPreference = 'shortest' | 'accessible' | 'indoor' | 'scenic';

export interface AccessibilityProfile {
  requiresWheelchair: boolean;
  requiresElevator: boolean;
  avoidStairs: boolean;
  avoidRamps: boolean;
  visualImpairment: boolean;
  hearingImpairment: boolean;
}

export interface UserContext {
  userId?: string;
  userType: UserType;
  preferredLanguage: SupportedLanguage;
  accessibility: AccessibilityProfile;
  travelMode: TravelMode;
  navigationPreference: NavigationPreference;
}

// ─── Location Context ─────────────────────────────────────────────────────────

export interface LocationContext {
  campusId: string | null;
  campusName?: string;
  buildingId?: string;
  buildingName?: string;
  floorId?: string;
  floorLevel?: number;
  objectId?: string;
  objectName?: string;
  coordinates?: { x: number; y: number };
}

// ─── Temporal Context ─────────────────────────────────────────────────────────

export interface TemporalContext {
  isoTimestamp: string;
  localTime: string;       // HH:MM format
  localDate: string;       // YYYY-MM-DD
  dayOfWeek: string;       // 'Monday', etc.
  isWeekend: boolean;
  isAfterHours: boolean;   // outside 08:00–18:00
}

// ─── Environmental Context ────────────────────────────────────────────────────

export type RestrictionType = 'closed' | 'blocked' | 'maintenance' | 'event' | 'temporary';

export interface EnvironmentalRestriction {
  id: string;
  type: RestrictionType;
  entityType: 'entrance' | 'path' | 'room' | 'floor' | 'building' | 'connection';
  entityId: string;
  reason?: string;
  until?: string; // ISO timestamp
}

export interface EnvironmentalContext {
  restrictions: EnvironmentalRestriction[];
  blockedConnectionIds: string[];
  unavailableFloorIds: string[];
  closedBuildingIds: string[];
}

// ─── Composite Context ────────────────────────────────────────────────────────

export interface AppContext {
  user: UserContext;
  location: LocationContext;
  temporal: TemporalContext;
  environment: EnvironmentalContext;
}

/** 
 * Sanitized context slice passed to AI/tool layer.
 * Never includes userId or unnecessary personal data.
 */
export interface ToolContext {
  campusId: string;
  preferredLanguage: SupportedLanguage;
  accessibleOnly: boolean;
  travelMode: TravelMode;
  blockedConnectionIds: string[];
  currentBuildingId?: string;
  currentFloorId?: string;
  isAfterHours: boolean;
  restrictions: EnvironmentalRestriction[];
}
