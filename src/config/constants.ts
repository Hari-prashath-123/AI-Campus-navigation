import { LanguageOption } from '../types';

/**
 * Application Constants
 */

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flagEmoji: '🇺🇸' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flagEmoji: '🇮🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flagEmoji: '🇮🇳' },
];

export const DEFAULT_LANGUAGE = 'en';

export const OBJECT_CATEGORY_METADATA: Record<string, { labelKey: string; icon: string; color: string }> = {
  classroom: { labelKey: 'Classroom', icon: 'BookOpen', color: '#3b82f6' },
  auditorium: { labelKey: 'Auditorium', icon: 'Volume2', color: '#8b5cf6' },
  lab: { labelKey: 'Laboratory', icon: 'FlaskConical', color: '#06b6d4' },
  office: { labelKey: 'Office', icon: 'Briefcase', color: '#64748b' },
  restroom: { labelKey: 'Restroom', icon: 'Restroom', color: '#10b981' },
  accessible_restroom: { labelKey: 'Accessible Restroom', icon: 'Accessibility', color: '#10b981' },
  elevator: { labelKey: 'Elevator', icon: 'ArrowUpDown', color: '#f59e0b' },
  stairs: { labelKey: 'Stairs', icon: 'Footprints', color: '#eab308' },
  entrance: { labelKey: 'Main Entrance', icon: 'DoorOpen', color: '#22c55e' },
  emergency_exit: { labelKey: 'Emergency Exit', icon: 'AlertTriangle', color: '#ef4444' },
  cafeteria: { labelKey: 'Cafeteria', icon: 'Utensils', color: '#f97316' },
  helpdesk: { labelKey: 'Helpdesk / Info', icon: 'Info', color: '#a855f7' },
  library: { labelKey: 'Library', icon: 'Library', color: '#3b82f6' },
  parking: { labelKey: 'Parking', icon: 'SquareP', color: '#475569' },
};
