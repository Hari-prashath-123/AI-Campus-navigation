import { RouteResult } from './routing';
import { MapObject } from './object';
import { SupportedLanguage } from './multilingual';

/**
 * AI Tool-Calling & Assistant Types
 */

export type { SupportedLanguage };

export type AIToolName =
  | 'searchCampusObjects'
  | 'getObjectDetails'
  | 'getBuildingDetails'
  | 'getFloorDetails'
  | 'getNearbyObjects'
  | 'getEntranceAvailability'
  | 'findRoute'
  | 'getCampusInformation'
  | 'resolveWorkflow';

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
}

/** Language-independent parsed intent — the navigation engine only sees this */
export interface ParsedIntent {
  type: 'find_location' | 'find_route' | 'check_availability' | 'find_nearby' | 'get_info' | 'workflow' | 'combined_navigation_workflow';
  /** Entity names extracted verbatim from user input — never translated */
  entities: {
    source?: string;
    destination?: string;
    query?: string;
    category?: string;
  };
  isAccessible: boolean;
  detectedLanguage: SupportedLanguage;
  mode: 'walking' | 'vehicle';
}

export interface AIToolCall {
  id: string;
  name: AIToolName;
  arguments: Record<string, any>;
}

export interface AIToolResult {
  toolCallId: string;
  name: AIToolName;
  result: {
    success: boolean;
    data?: MapObject[] | RouteResult | any;
    error?: string;
  };
}

/** A sanitized POI DTO returned by llmTools — not raw MapObject */
export interface SafePOI {
  id: string;
  name: string;
  description?: string;
  type: string;
  buildingId: string;
  floorId: string;
  isAccessible: boolean;
  images?: string[];
  historicalInfo?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
    personName?: string;
  };
  externalLinks?: { title: string; url: string }[];
  properties?: Record<string, any>;
}

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  detectedLanguage?: SupportedLanguage;
  toolCalls?: AIToolCall[];
  toolResults?: AIToolResult[];
  routeResult?: RouteResult;
  poiResults?: SafePOI[];
  isThinking?: boolean;
}
