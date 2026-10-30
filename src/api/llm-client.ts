import { ToolDefinition, AIToolName } from '../types/ai';
import { llmTools } from './llm-tools';
import { contextService } from './context.service';

/**
 * Strict Typed Tool Schemas (OpenAPI / Gemini compatible)
 */
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'searchCampusObjects',
    description: 'Searches for authoritative points of interest, rooms, labs, auditoriums, and facilities by name or keyword across English, Tamil, and Hindi.',
    parameters: {
      type: 'object',
      properties: {
        campusId: { type: 'string', description: 'Authoritative campus ID.' },
        query: { type: 'string', description: 'Search term or location name in any supported language.' },
        limit: { type: 'number', description: 'Maximum number of items to return.' },
      },
      required: ['campusId', 'query'],
    },
  },
  {
    name: 'getObjectDetails',
    description: 'Retrieves canonical details, coordinates, floor, building, and properties for a specific object ID.',
    parameters: {
      type: 'object',
      properties: {
        campusId: { type: 'string', description: 'Campus ID.' },
        objectId: { type: 'string', description: 'Canonical ID of the object.' },
      },
      required: ['campusId', 'objectId'],
    },
  },
  {
    name: 'checkOperatingSchedule',
    description: 'Authoritatively checks whether a room, facility, or entrance is currently open, along with operating hours and temporary closure notices.',
    parameters: {
      type: 'object',
      properties: {
        campusId: { type: 'string', description: 'Campus ID.' },
        objectId: { type: 'string', description: 'Canonical ID of the object.' },
      },
      required: ['campusId', 'objectId'],
    },
  },
  {
    name: 'findRoute',
    description: 'Calculates a deterministic step-by-step route between two canonical map objects, strictly respecting walkability, floor transitions, and accessibility.',
    parameters: {
      type: 'object',
      properties: {
        sourceObjectId: { type: 'string', description: 'Canonical ID of the starting location.' },
        targetObjectId: { type: 'string', description: 'Canonical ID of the destination location.' },
        accessibleOnly: { type: 'boolean', description: 'If true, requires wheelchair-accessible paths, avoiding stairs.' },
        mode: { type: 'string', description: 'Travel mode: walking or vehicle.', enum: ['walking', 'vehicle'] },
      },
      required: ['sourceObjectId', 'targetObjectId'],
    },
  },
  {
    name: 'getEntranceAvailability',
    description: 'Checks building entrance status and accessibility.',
    parameters: {
      type: 'object',
      properties: {
        campusId: { type: 'string', description: 'Campus ID.' },
        buildingId: { type: 'string', description: 'Building ID.' },
      },
      required: ['campusId', 'buildingId'],
    },
  },
  {
    name: 'resolveWorkflow',
    description: 'Looks up procedural workflows (e.g., student ID, transcript requests, lab safety).',
    parameters: {
      type: 'object',
      properties: {
        campusId: { type: 'string', description: 'Campus ID.' },
        query: { type: 'string', description: 'Workflow question or procedure name.' },
      },
      required: ['campusId', 'query'],
    },
  },
];

export interface LLMFunctionCall {
  name: AIToolName;
  args: Record<string, any>;
}

export interface LLMProviderResponse {
  text?: string;
  toolCalls?: LLMFunctionCall[];
}

/**
 * Dispatcher to safely execute authoritative backend tools by name.
 */
export async function executeAuthoritativeTool(
  toolName: AIToolName,
  args: Record<string, any>,
  campusId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    switch (toolName) {
      case 'searchCampusObjects': {
        const res = await llmTools.searchCampusObjects({
          campusId: args.campusId || campusId,
          query: String(args.query || ''),
          limit: args.limit ? Number(args.limit) : 5,
        });
        if ('error' in res) return { success: false, error: res.error };
        return { success: true, data: res.results || [] };
      }
      case 'getObjectDetails': {
        const res = await llmTools.getObjectDetails({
          campusId: args.campusId || campusId,
          objectId: String(args.objectId || ''),
        });
        if ('error' in res) return { success: false, error: res.error };
        return { success: true, data: res.result };
      }
      case 'checkOperatingSchedule': {
        const res = await llmTools.checkOperatingSchedule({
          campusId: args.campusId || campusId,
          objectId: String(args.objectId || ''),
          userRoles: args.userRoles,
        });
        if ('error' in res) return { success: false, error: res.error };
        return { success: true, data: res.result };
      }
      case 'findRoute': {
        const context = contextService.getToolContext();
        if (args.accessibleOnly !== undefined) context.accessibleOnly = Boolean(args.accessibleOnly);
        if (args.mode) context.travelMode = args.mode;

        const res = await llmTools.findRoute({
          sourceObjectId: String(args.sourceObjectId),
          targetObjectId: String(args.targetObjectId),
          context,
        });
        if ('error' in res) return { success: false, error: res.error };
        return { success: true, data: res.result };
      }
      case 'getEntranceAvailability': {
        const res = await llmTools.getEntranceAvailability({
          campusId: args.campusId || campusId,
          buildingId: String(args.buildingId),
        });
        if ('error' in res) return { success: false, error: res.error };
        return { success: true, data: res };
      }
      case 'resolveWorkflow': {
        const res = await llmTools.resolveWorkflow({
          campusId: args.campusId || campusId,
          query: String(args.query),
        });
        if ('error' in res) return { success: false, error: res.error };
        return { success: true, data: res.results };
      }
      case 'getBuildingDetails': {
        const res = await llmTools.getBuildingDetails({
          campusId: args.campusId || campusId,
          buildingId: String(args.buildingId),
        });
        if ('error' in res) return { success: false, error: res.error };
        return { success: true, data: res.result };
      }
      case 'getFloorDetails': {
        const res = await llmTools.getFloorDetails({
          campusId: args.campusId || campusId,
          buildingId: String(args.buildingId),
          floorId: String(args.floorId),
        });
        if ('error' in res) return { success: false, error: res.error };
        return { success: true, data: res.result };
      }
      case 'getNearbyObjects': {
        const res = await llmTools.getNearbyObjects({
          campusId: args.campusId || campusId,
          sourceObjectId: String(args.sourceObjectId),
          category: args.category,
        });
        if ('error' in res) return { success: false, error: res.error };
        return { success: true, data: res.results };
      }
      case 'getCampusInformation': {
        const res = await llmTools.getCampusInformation({
          campusId: args.campusId || campusId,
        });
        if ('error' in res) return { success: false, error: res.error };
        return { success: true, data: res.result };
      }
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Execution failed' };
  }
}

/**
 * Read API Key from environment without exposing secrets in client logs or bundles.
 */
export function getLLMConfig(): { apiKey?: string; isAvailable: boolean } {
  let key: string | undefined;
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    key = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  }
  if (!key && typeof process !== 'undefined' && process.env) {
    key = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  }
  return {
    apiKey: key,
    isAvailable: Boolean(key && key.trim().length > 0),
  };
}

/**
 * Direct Gemini API Caller using functionDeclarations.
 * Strictly invokes authoritative backend tools and passes grounded results.
 */
export async function callGeminiAPI(
  prompt: string,
  campusId: string
): Promise<LLMProviderResponse | null> {
  const config = getLLMConfig();
  if (!config.isAvailable || !config.apiKey) {
    return null; // Gracefully fall back to deterministic pipeline
  }

  try {
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(config.apiKey)}`;

    const functionDeclarations = TOOL_DEFINITIONS.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    const systemInstruction = {
      role: 'system',
      parts: [
        {
          text: `You are an AI Campus Navigation Assistant for campus "${campusId}".
You must strictly call the authoritative tools provided to search objects, inspect schedules, and calculate routes.
Rules:
1. Never invent or hallucinate rooms, facilities, paths, opening hours, or coordinates.
2. If the user asks for directions or a location, search for the canonical object first.
3. If an object is ambiguous or has multiple matches, ask a clarifying question.
4. When calculating routes, call findRoute with the exact canonical sourceObjectId and targetObjectId.
5. If wheelchair accessibility is requested, pass accessibleOnly=true to avoid stairs.
6. Support English, Tamil, and Hindi.`
        }
      ]
    };

    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        systemInstruction,
        tools: [{ functionDeclarations }],
        generationConfig: {
          temperature: 0.1,
        }
      }),
    });

    if (!response.ok) {
      return null; // Fall back gracefully on HTTP errors (e.g. 403, 429, 503)
    }

    const json = await response.json();
    const candidate = json.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    const toolCalls: LLMFunctionCall[] = [];
    let textResponse = '';

    for (const part of parts) {
      if (part.text) {
        textResponse += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          name: part.functionCall.name as AIToolName,
          args: part.functionCall.args || {},
        });
      }
    }

    return {
      text: textResponse.trim() || undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  } catch {
    // Graceful fallback on network or parsing failure
    return null;
  }
}

