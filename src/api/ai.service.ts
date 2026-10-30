import { AIChatMessage, ApiResponse, ClarificationOption } from '../types';
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
  generateAmbiguityClarification,
} from './response-generator';
import { executeAuthoritativeTool, LLMProviderResponse, callGeminiAPI } from './llm-client';

export type LLMProviderFn = (
  prompt: string,
  campusId: string
) => Promise<LLMProviderResponse | null>;

/**
 * AI Assistant Orchestrator
 *
 * Pipeline:
 *   User Text → (LLM Provider or parseIntent) → Campus Tool Calls → generateResponse()
 *
 * The authoritative navigation engine and spatial DB are strictly separated.
 * Only canonical IDs and validated coordinates are passed to the routing graph.
 */
export class AIService {
  private static instance: AIService;
  private customLLMProvider: LLMProviderFn | null = null;

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) AIService.instance = new AIService();
    return AIService.instance;
  }

  /**
   * For automated tests or external mock injection
   */
  public setLLMProvider(provider: LLMProviderFn | null) {
    this.customLLMProvider = provider;
  }

  public async processQuery(campusId: string, userText: string): Promise<ApiResponse<AIChatMessage>> {
    // ── Check if an LLM provider (custom mock or live Gemini API) handles the query ─
    const provider = this.customLLMProvider || callGeminiAPI;
    try {
      const llmRes = await provider(userText, campusId);
      if (llmRes && llmRes.toolCalls && llmRes.toolCalls.length > 0) {
        return await this.executeLLMToolCalls(campusId, userText, llmRes);
      }
    } catch {
      // Graceful fallback to deterministic pipeline on LLM failure
    }

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

  /**
   * Execute tool calls returned by an LLM function-calling engine
   */
  private async executeLLMToolCalls(
    campusId: string,
    userText: string,
    llmRes: LLMProviderResponse
  ): Promise<ApiResponse<AIChatMessage>> {
    const lang = parseIntent(userText).detectedLanguage;
    const executedToolCalls: any[] = [];
    let lastRouteResult: any = undefined;
    let poiResults: any[] = [];

    for (const tc of llmRes.toolCalls || []) {
      executedToolCalls.push({
        id: generateEntityId('tool'),
        name: tc.name,
        arguments: tc.args,
      });

      const res = await executeAuthoritativeTool(tc.name, tc.args, campusId);
      if (tc.name === 'findRoute' && res.success) {
        lastRouteResult = res.data;
      }
      if (tc.name === 'searchCampusObjects' && res.success && Array.isArray(res.data)) {
        poiResults = res.data;
      }
    }

    const content = llmRes.text || (lastRouteResult
      ? generateRouteResponse('Start', 'Destination', lastRouteResult, lang, false)
      : 'Processed your request using authoritative campus tools.');

    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        id: generateEntityId('msg'),
        sender: 'assistant',
        content,
        timestamp: new Date().toISOString(),
        detectedLanguage: lang,
        toolCalls: executedToolCalls,
        routeResult: lastRouteResult,
        poiResults: poiResults.length > 0 ? poiResults : undefined,
      },
    };
  }

  // ── Route Handler ──────────────────────────────────────────────────────────
  private async executeRoute(campusId: string, intent: any, lang: any): Promise<ApiResponse<AIChatMessage>> {
    const { source, destination } = intent.entities;
    const toolCalls: any[] = [];

    // Tool 1 & 2: Resolve source and destination
    let srcRes = await llmTools.searchCampusObjects({ campusId, query: source, limit: 3 });
    toolCalls.push({ id: generateEntityId('tool'), name: 'searchCampusObjects', arguments: { query: source } });

    if (srcRes.error || !srcRes.results?.length) {
      if (source.toLowerCase().includes('entrance') || source.toLowerCase().includes('gate') || source.includes('நுழைவாயில்') || source.includes('प्रवेश')) {
        srcRes = await llmTools.searchCampusObjects({ campusId, query: 'entrance', limit: 3 });
      }
      if (!srcRes.results?.length) {
        return this.buildMessage(generateNotFound(source, lang), lang, toolCalls);
      }
    }

    const dstRes = await llmTools.searchCampusObjects({ campusId, query: destination, limit: 4 });
    toolCalls.push({ id: generateEntityId('tool'), name: 'searchCampusObjects', arguments: { query: destination } });

    if (dstRes.error || !dstRes.results?.length) {
      return this.buildMessage(generateNotFound(destination, lang), lang, toolCalls);
    }

    // Ambiguity resolution: if multiple destination objects match and none is an exact single match
    if (dstRes.results.length > 1) {
      const qLower = destination.toLowerCase().trim();
      const exactMatches = dstRes.results.filter(
        (r: any) => r.name.toLowerCase() === qLower || r.code?.toLowerCase() === qLower
      );

      if (exactMatches.length !== 1) {
        const clarificationOptions: ClarificationOption[] = dstRes.results.map((r: any) => ({
          id: r.id,
          label: r.name,
          code: r.code,
          buildingName: r.buildingId,
          category: r.type,
          description: r.description,
        }));

        return {
          success: true,
          timestamp: new Date().toISOString(),
          data: {
            id: generateEntityId('msg'),
            sender: 'assistant',
            content: generateAmbiguityClarification(destination, clarificationOptions, lang),
            timestamp: new Date().toISOString(),
            detectedLanguage: lang,
            toolCalls,
            isAmbiguous: true,
            clarificationOptions,
          },
        };
      }
    }

    const srcObj = srcRes.results[0];
    const dstObj = dstRes.results[0];

    // Tool 3: Find route
    const context = contextService.getToolContext();
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
        routeResult: routeRes.result as any,
      },
    };
  }

  // ── Availability Handler ───────────────────────────────────────────────────
  private async executeAvailability(campusId: string, intent: any, lang: any): Promise<ApiResponse<AIChatMessage>> {
    const query = intent.entities.query || intent.entities.destination || '';
    const toolCalls: any[] = [];

    const searchRes = await llmTools.searchCampusObjects({ campusId, query, limit: 3 });
    toolCalls.push({ id: generateEntityId('tool'), name: 'searchCampusObjects', arguments: { query } });

    if (searchRes.error || !searchRes.results?.length) {
      return this.buildMessage(generateNotFound(query, lang), lang, toolCalls);
    }

    // Check ambiguity
    if (searchRes.results.length > 1) {
      const qLower = query.toLowerCase().trim();
      const exactMatches = searchRes.results.filter(
        (r: any) => r.name.toLowerCase() === qLower || r.code?.toLowerCase() === qLower
      );

      if (exactMatches.length !== 1) {
        const clarificationOptions: ClarificationOption[] = searchRes.results.map((r: any) => ({
          id: r.id,
          label: r.name,
          code: r.code,
          buildingName: r.buildingId,
          category: r.type,
          description: r.description,
        }));

        return {
          success: true,
          timestamp: new Date().toISOString(),
          data: {
            id: generateEntityId('msg'),
            sender: 'assistant',
            content: generateAmbiguityClarification(query, clarificationOptions, lang),
            timestamp: new Date().toISOString(),
            detectedLanguage: lang,
            toolCalls,
            isAmbiguous: true,
            clarificationOptions,
          },
        };
      }
    }

    const obj = searchRes.results[0];

    const schedRes = await llmTools.checkOperatingSchedule({ campusId, objectId: obj.id });
    toolCalls.push({ id: generateEntityId('tool'), name: 'checkOperatingSchedule', arguments: { objectId: obj.id } });

    if (schedRes.error || !schedRes.result) {
      return this.buildMessage(generateNoAvailability(obj.name, lang), lang, toolCalls);
    }

    const content = generateAvailabilityResponse(
      obj.name,
      schedRes.result.isOpen,
      schedRes.result.operatingHours,
      lang,
      schedRes.result.closureReason
    );
    return this.buildMessage(content, lang, toolCalls);
  }

  // ── Nearby Handler ─────────────────────────────────────────────────────────
  private async executeNearby(campusId: string, intent: any, lang: any): Promise<ApiResponse<AIChatMessage>> {
    return this.executeSearch(campusId, intent, lang);
  }

  // ── Search/Find Handler ────────────────────────────────────────────────────
  private async executeSearch(campusId: string, intent: any, lang: any): Promise<ApiResponse<AIChatMessage>> {
    const query = intent.entities.query || intent.entities.destination || '';
    const toolCalls: any[] = [];

    const searchRes = await llmTools.searchCampusObjects({ campusId, query, limit: 5 });
    toolCalls.push({ id: generateEntityId('tool'), name: 'searchCampusObjects', arguments: { query } });

    if (searchRes.error || !searchRes.results?.length) {
      return this.buildMessage(generateNotFound(query, lang), lang, toolCalls);
    }

    let clarificationOptions: ClarificationOption[] | undefined;
    let isAmbiguous = false;
    if (searchRes.results.length > 1) {
      const qLower = query.toLowerCase().trim();
      const exactMatches = searchRes.results.filter(
        (r: any) => r.name.toLowerCase() === qLower || r.code?.toLowerCase() === qLower
      );
      if (exactMatches.length !== 1) {
        isAmbiguous = true;
        clarificationOptions = searchRes.results.map((r: any) => ({
          id: r.id,
          label: r.name,
          code: r.code,
          buildingName: r.buildingId,
          category: r.type,
          description: r.description,
        }));
      }
    }

    const content = isAmbiguous && clarificationOptions
      ? generateAmbiguityClarification(query, clarificationOptions, lang)
      : generateSearchResponse(query, searchRes.results, lang);

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
        clarificationOptions,
        isAmbiguous: isAmbiguous ? true : undefined,
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
      return this.executeSearch(campusId, intent, lang);
    }

    const workflow = wfRes.results[0].workflow;
    const includeNavOffer = intent.type === 'combined_navigation_workflow';
    
    const content = generateWorkflowResponse(workflow, lang, includeNavOffer);
    
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
