import { AIChatMessage, ApiResponse } from '../types';
import { generateEntityId } from '../utils/validation';
import { llmTools } from './llm-tools';
import { parseIntent } from './intent-parser';
import { contextService } from './context.service';
import {
  generateNotFound,
  generateRouteResponse,
  generateNoRoute,
  generateSearchResponse,
  generateAvailabilityResponse,
  generateNoAvailability,
  generateWorkflowResponse,
} from './response-generator';

/**
 * AI Assistant Orchestrator
 *
 * Pipeline:
 *   User Text → parseIntent() → Campus Tool Calls → generateResponse()
 *
 * The navigation engine is language-independent.
 * Only parseIntent and generateResponse deal with language.
 */
export class AIService {
  private static instance: AIService;
  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) AIService.instance = new AIService();
    return AIService.instance;
  }

  public async processQuery(campusId: string, userText: string): Promise<ApiResponse<AIChatMessage>> {
    // ── Step 1: Parse intent (language-independent) ──────────────────────────
    const intent = parseIntent(userText);
    const lang = intent.detectedLanguage;
    contextService.setCurrentCampus(campusId);

    try {
      switch (intent.type) {
        case 'find_route':
          return await this.executeRoute(campusId, intent, lang);
        case 'check_availability':
          return await this.executeAvailability(campusId, intent, lang);
        case 'find_nearby':
          return await this.executeNearby(campusId, intent, lang);
        case 'workflow':
        case 'combined_navigation_workflow':
          return await this.executeWorkflow(campusId, intent, lang);
        default: // find_location, get_info
          return await this.executeSearch(campusId, intent, lang);
      }
    } catch (err: any) {
      return this.buildMessage('I encountered an unexpected error. Please try again.', lang, []);
    }
  }

  // ── Route Handler ──────────────────────────────────────────────────────────
  private async executeRoute(campusId: string, intent: any, lang: any): Promise<ApiResponse<AIChatMessage>> {
    const { source, destination } = intent.entities;
    const toolCalls: any[] = [];

    // Tool 1 & 2: Resolve source and destination
    const srcRes = await llmTools.searchCampusObjects({ campusId, query: source, limit: 1 });
    toolCalls.push({ id: generateEntityId('tool'), name: 'searchCampusObjects', arguments: { query: source } });

    if (srcRes.error || !srcRes.results?.length) {
      return this.buildMessage(generateNotFound(source, lang), lang, toolCalls);
    }

    const dstRes = await llmTools.searchCampusObjects({ campusId, query: destination, limit: 1 });
    toolCalls.push({ id: generateEntityId('tool'), name: 'searchCampusObjects', arguments: { query: destination } });

    if (dstRes.error || !dstRes.results?.length) {
      return this.buildMessage(generateNotFound(destination, lang), lang, toolCalls);
    }

    const srcObj = srcRes.results[0];
    const dstObj = dstRes.results[0];

    // Tool 3: Find route
    // The ToolContext combines user preferences (like accessibleOnly) and environmental restrictions
    const context = contextService.getToolContext();
    
    // Override context with explicit intent if user asked for it in this query
    if (intent.isAccessible) context.accessibleOnly = true;
    if (intent.mode) context.travelMode = intent.mode;

    const routeRes = await llmTools.findRoute({ 
      sourceObjectId: srcObj.id, 
      targetObjectId: dstObj.id,
      context 
    });
    toolCalls.push({ id: generateEntityId('tool'), name: 'findRoute', arguments: { sourceObjectId: srcObj.id, targetObjectId: dstObj.id, context } });

    if (routeRes.error || !routeRes.result) {
      return this.buildMessage(generateNoRoute(srcObj.name, dstObj.name, lang), lang, toolCalls);
    }

    const isAcc = intent.isAccessible === true;
    const content = generateRouteResponse(srcObj.name, dstObj.name, routeRes.result, lang, isAcc);
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        id: generateEntityId('msg'),
        sender: 'assistant',
        content,
        timestamp: new Date().toISOString(),
        detectedLanguage: lang,
        toolCalls,
        routeResult: routeRes.result,
      },
    };
  }

  // ── Availability Handler ───────────────────────────────────────────────────
  private async executeAvailability(campusId: string, intent: any, lang: any): Promise<ApiResponse<AIChatMessage>> {
    const query = intent.entities.query || '';
    const toolCalls: any[] = [];

    const searchRes = await llmTools.searchCampusObjects({ campusId, query, limit: 1 });
    toolCalls.push({ id: generateEntityId('tool'), name: 'searchCampusObjects', arguments: { query } });

    if (searchRes.error || !searchRes.results?.length) {
      return this.buildMessage(generateNotFound(query, lang), lang, toolCalls);
    }

    const obj = searchRes.results[0];
    if (!obj.buildingId) {
      return this.buildMessage(generateNoAvailability(obj.name, lang), lang, toolCalls);
    }

    const availRes = await llmTools.getEntranceAvailability({ campusId, buildingId: obj.buildingId });
    toolCalls.push({ id: generateEntityId('tool'), name: 'getEntranceAvailability', arguments: { buildingId: obj.buildingId } });

    if (availRes.error) {
      return this.buildMessage(generateNoAvailability(obj.name, lang), lang, toolCalls);
    }

    const content = generateAvailabilityResponse(obj.name, availRes.isOpen === true, availRes.operatingHours || 'N/A', lang);
    return this.buildMessage(content, lang, toolCalls);
  }

  // ── Nearby Handler ─────────────────────────────────────────────────────────
  private async executeNearby(campusId: string, intent: any, lang: any): Promise<ApiResponse<AIChatMessage>> {
    // For nearby we search the same way — getNearbyObjects needs a sourceObjectId,
    // which requires a two-step resolve. Fallback to search for now.
    return this.executeSearch(campusId, intent, lang);
  }

  // ── Search/Find Handler ────────────────────────────────────────────────────
  private async executeSearch(campusId: string, intent: any, lang: any): Promise<ApiResponse<AIChatMessage>> {
    const query = intent.entities.query || intent.entities.destination || '';
    const toolCalls: any[] = [];

    const searchRes = await llmTools.searchCampusObjects({ campusId, query, limit: 3 });
    toolCalls.push({ id: generateEntityId('tool'), name: 'searchCampusObjects', arguments: { query } });

    if (searchRes.error || !searchRes.results?.length) {
      return this.buildMessage(generateNotFound(query, lang), lang, toolCalls);
    }

    const content = generateSearchResponse(query, searchRes.results, lang);
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        id: generateEntityId('msg'),
        sender: 'assistant',
        content,
        timestamp: new Date().toISOString(),
        detectedLanguage: lang,
        toolCalls,
        poiResults: searchRes.results,
      },
    };
  }

  // ── Workflow Handler ───────────────────────────────────────────────────────
  private async executeWorkflow(campusId: string, intent: any, lang: any): Promise<ApiResponse<AIChatMessage>> {
    const query = intent.entities.query || '';
    const toolCalls: any[] = [];

    const wfRes = await llmTools.resolveWorkflow({ campusId, query });
    toolCalls.push({ id: generateEntityId('tool'), name: 'resolveWorkflow', arguments: { query } });

    if (wfRes.error || !wfRes.results?.length) {
      // Fallback to regular search if no workflow matches
      return this.executeSearch(campusId, intent, lang);
    }

    const workflow = wfRes.results[0].workflow;
    const includeNavOffer = intent.type === 'combined_navigation_workflow';
    
    const content = generateWorkflowResponse(workflow, lang, includeNavOffer);
    
    // Also attach relevant POIs if the workflow has primary objects
    let poiResults: any[] = [];
    if (workflow.primaryObjectId) {
       const poiRes = await llmTools.getObjectDetails({ campusId, objectId: workflow.primaryObjectId });
       if (!poiRes.error && poiRes.result) {
         poiResults.push(poiRes.result);
       }
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        id: generateEntityId('msg'),
        sender: 'assistant',
        content,
        timestamp: new Date().toISOString(),
        detectedLanguage: lang,
        toolCalls,
        poiResults: poiResults.length > 0 ? poiResults : undefined,
      },
    };
  }

  // ── Utility ────────────────────────────────────────────────────────────────
  private buildMessage(content: string, lang: any, toolCalls: any[]): ApiResponse<AIChatMessage> {
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        id: generateEntityId('msg'),
        sender: 'assistant',
        content,
        timestamp: new Date().toISOString(),
        detectedLanguage: lang,
        toolCalls: toolCalls.length ? toolCalls : undefined,
      },
    };
  }
}

export const aiService = AIService.getInstance();
