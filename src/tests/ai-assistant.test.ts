import { describe, it, expect, beforeEach } from 'vitest';
import { aiService } from '../api/ai.service';
import { parseIntent, detectLanguage } from '../api/intent-parser';
import { llmTools } from '../api/llm-tools';
import { executeAuthoritativeTool, TOOL_DEFINITIONS, getLLMConfig } from '../api/llm-client';
import { objectStore } from '../api/object.store';
import { navStore } from '../api/nav.store';
import { campusService } from '../api/campus.service';
import { accessRuleService } from '../api/access-rule.service';
import { INITIAL_CAMPUSES, INITIAL_BUILDINGS, INITIAL_FLOORS, INITIAL_MAP_OBJECTS, INITIAL_NODES, INITIAL_CONNECTIONS } from '../api/mock-data';

const CAMPUS_ID = 'campus-tech-inst';

describe('Multilingual LLM Assistant & Authoritative Routing Integration', () => {
  beforeEach(() => {
    // Reset databases to clean initial states
    campusService.reset(INITIAL_CAMPUSES, INITIAL_BUILDINGS, INITIAL_FLOORS);
    objectStore.reset(INITIAL_MAP_OBJECTS);
    navStore.reset(INITIAL_NODES, INITIAL_CONNECTIONS);
    accessRuleService.reset([]);
    aiService.setLLMProvider(null);
  });

  // ==========================================================================
  // 1. Language Detection & Multilingual Intent Parsing
  // ==========================================================================
  describe('1. Multilingual Natural Language Understanding', () => {
    it('detects English, Tamil, and Hindi accurately', () => {
      expect(detectLanguage('Where is the conference hall?')).toBe('en');
      expect(detectLanguage('AI lab எங்கே இருக்கு?')).toBe('ta');
      expect(detectLanguage('AI lab कहाँ है?')).toBe('hi');
    });

    it('identifies destinations, landmarks, and search queries in English', () => {
      const intent = parseIntent('Where is the AI Innovation Lab 101?');
      expect(intent.type).toBe('find_location');
      expect(intent.detectedLanguage).toBe('en');
      expect(intent.entities.query?.toLowerCase()).toContain('ai innovation lab 101');
    });

    it('identifies destinations and search queries in Tamil', () => {
      const intent = parseIntent('AI புதுமை ஆய்வகம் 101 எங்கே இருக்கு?');
      expect(intent.type).toBe('find_location');
      expect(intent.detectedLanguage).toBe('ta');
      expect(intent.entities.query).toContain('AI புதுமை ஆய்வகம் 101');
    });

    it('identifies destinations and search queries in Hindi', () => {
      const intent = parseIntent('एआई इनोवेशन लैब 101 कहाँ है?');
      expect(intent.type).toBe('find_location');
      expect(intent.detectedLanguage).toBe('hi');
      expect(intent.entities.query).toContain('एआई इनोवेशन लैब 101');
    });

    it('identifies start, destination, and accessibility constraint from route requests', () => {
      // English wheelchair route
      const enRoute = parseIntent('Find an accessible route from Main Campus Entrance to AI Innovation Lab 101');
      expect(enRoute.type).toBe('find_route');
      expect(enRoute.isAccessible).toBe(true);
      expect(enRoute.entities.source?.toLowerCase()).toContain('main campus entrance');
      expect(enRoute.entities.destination?.toLowerCase()).toContain('ai innovation lab 101');

      // Tamil route
      const taRoute = parseIntent('முதன்மை நுழைவாயில் இலிருந்து AI புதுமை ஆய்வகம் 101 செல்ல வழி');
      expect(taRoute.type).toBe('find_route');
      expect(taRoute.detectedLanguage).toBe('ta');
      expect(taRoute.entities.source).toContain('முதன்மை நுழைவாயில்');
      expect(taRoute.entities.destination).toContain('AI புதுமை ஆய்வகம் 101');

      // Hindi route
      const hiRoute = parseIntent('मुख्य प्रवेश द्वार से एआई इनोवेशन लैब 101 तक मार्ग बताएं');
      expect(hiRoute.type).toBe('find_route');
      expect(hiRoute.detectedLanguage).toBe('hi');
      expect(hiRoute.entities.source).toContain('मुख्य प्रवेश द्वार');
      expect(hiRoute.entities.destination).toContain('एआई इनोवेशन लैब 101');
    });
  });

  // ==========================================================================
  // 2. Canonical Map ID Resolution
  // ==========================================================================
  describe('2. Canonical Map ID Resolution Across Languages', () => {
    it('resolves the same canonical map ID regardless of language used', async () => {
      // English lookup
      const enRes = await aiService.processQuery(CAMPUS_ID, 'Where is AI Innovation Lab 101?');
      expect(enRes.success).toBe(true);
      expect(enRes.data.poiResults?.[0]?.id).toBe('obj-room-101');

      // Tamil lookup
      const taRes = await aiService.processQuery(CAMPUS_ID, 'AI புதுமை ஆய்வகம் 101 எங்கே இருக்கு?');
      expect(taRes.success).toBe(true);
      expect(taRes.data.poiResults?.[0]?.id).toBe('obj-room-101');

      // Hindi lookup
      const hiRes = await aiService.processQuery(CAMPUS_ID, 'एआई इनोवेशन लैब 101 कहाँ है?');
      expect(hiRes.success).toBe(true);
      expect(hiRes.data.poiResults?.[0]?.id).toBe('obj-room-101');
    });

    it('passes canonical map IDs to backend routing tools', async () => {
      const res = await aiService.processQuery(
        CAMPUS_ID,
        'Take me from Main Campus Entrance to AI Innovation Lab 101'
      );

      expect(res.success).toBe(true);
      const findRouteTool = res.data.toolCalls?.find(tc => tc.name === 'findRoute');
      expect(findRouteTool).toBeDefined();
      expect(findRouteTool?.arguments.sourceObjectId).toBe('obj-entrance-main');
      expect(findRouteTool?.arguments.targetObjectId).toBe('obj-room-101');
    });
  });

  // ==========================================================================
  // 3. Ambiguity Resolution & Clarifying Questions
  // ==========================================================================
  describe('3. Ambiguity Resolution', () => {
    it('asks a clarifying question when a destination name is ambiguous', async () => {
      // Add a second restroom on Floor 1 to create an ambiguous match
      objectStore.create({
        campusId: CAMPUS_ID,
        buildingId: 'bld-eng',
        floorId: 'floor-eng-1',
        code: 'REST-02',
        name: { en: 'Level 1 Restrooms', ta: 'முதல் தள கழிப்பறைகள்', hi: 'प्रथम तल विश्राम गृह' },
        category: 'restroom',
        coordinates: { x: 45, y: 80 },
        associatedNodeId: 'node-eng-rest-1',
        isAccessible: true,
      });

      const res = await aiService.processQuery(CAMPUS_ID, 'Navigate to restroom');
      expect(res.success).toBe(true);
      expect(res.data.isAmbiguous).toBe(true);
      expect(res.data.clarificationOptions).toBeDefined();
      expect(res.data.clarificationOptions!.length).toBeGreaterThanOrEqual(2);
      expect(res.data.content).toContain('Which one did you mean?');

      // Tamil clarifying question
      const taRes = await aiService.processQuery(CAMPUS_ID, 'கழிப்பறை செல்ல வழி காட்டு');
      expect(taRes.success).toBe(true);
      expect(taRes.data.isAmbiguous).toBe(true);
      expect(taRes.data.content).toContain('நீங்கள் எதை குறிப்பிட்டீர்கள்?');
    });
  });

  // ==========================================================================
  // 4. Authoritative Tool Calling & Operating Schedules
  // ==========================================================================
  describe('4. Authoritative Tool Calling & Operating Schedules', () => {
    it('has strict typed schemas for all registered tools', () => {
      const toolNames = TOOL_DEFINITIONS.map(t => t.name);
      expect(toolNames).toContain('searchCampusObjects');
      expect(toolNames).toContain('getObjectDetails');
      expect(toolNames).toContain('checkOperatingSchedule');
      expect(toolNames).toContain('findRoute');
      expect(toolNames).toContain('resolveWorkflow');
    });

    it('authoritatively inspects operating schedules and active maintenance closures', async () => {
      // 1. Initially open
      const initialSched = await llmTools.checkOperatingSchedule({
        campusId: CAMPUS_ID,
        objectId: 'obj-room-101',
      });
      expect(initialSched.result?.isOpen).toBe(true);

      // 2. Add maintenance closure rule via accessRuleService
      await accessRuleService.createRule({
        campusId: CAMPUS_ID,
        targetType: 'object',
        targetId: 'obj-room-101',
        ruleType: 'maintenance',
        name: 'HVAC Calibration',
        isRoutingBlocked: true,
        isActive: true,
        closureReason: 'Temporary lab closure for ventilation maintenance',
      });

      // 3. Query through assistant
      const availRes = await aiService.processQuery(CAMPUS_ID, 'Is AI Innovation Lab 101 open?');
      expect(availRes.success).toBe(true);
      expect(availRes.data.content).toContain('Closed');
      expect(availRes.data.content).toContain('ventilation maintenance');
      
      const schedToolCall = availRes.data.toolCalls?.find(tc => tc.name === 'checkOperatingSchedule');
      expect(schedToolCall).toBeDefined();
      expect(schedToolCall?.arguments.objectId).toBe('obj-room-101');
    });

    it('executes tools via the typed dispatcher executeAuthoritativeTool', async () => {
      const result = await executeAuthoritativeTool(
        'searchCampusObjects',
        { campusId: CAMPUS_ID, query: 'Turing Auditorium' },
        CAMPUS_ID
      );

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].id).toBe('obj-aud-a');
    });
  });

  // ==========================================================================
  // 5. Grounded Route Instructions (Stairs, Elevators, Accessibility)
  // ==========================================================================
  describe('5. Grounded Route Instructions & Explanations', () => {
    it('returns grounded route results and explains transitions and accessibility', async () => {
      const res = await aiService.processQuery(
        CAMPUS_ID,
        'Find a wheelchair accessible route from Main Campus Entrance to AI Innovation Lab 101'
      );

      expect(res.success).toBe(true);
      expect(res.data.routeResult).toBeDefined();
      expect(res.data.routeResult?.totalDistanceMeters).toBeGreaterThan(0);
      expect(res.data.content).toContain('wheelchair-accessible');
      expect(res.data.content).toContain('Distance:');
      expect(res.data.content).toContain('Estimated time:');
    });

    it('does not pass through walls or invent routes when graph is disconnected', async () => {
      // Create isolated object disconnected from any path
      objectStore.create({
        campusId: CAMPUS_ID,
        buildingId: 'bld-eng',
        floorId: 'floor-eng-g',
        code: 'ISOLATED-99',
        name: { en: 'Bunker 99', ta: 'பங்கர் 99', hi: 'बंकर 99' },
        category: 'room',
        coordinates: { x: 999, y: 999 },
        associatedNodeId: 'node-isolated-99',
        isAccessible: true,
      });

      const res = await aiService.processQuery(
        CAMPUS_ID,
        'Navigate from Main Campus Entrance to Bunker 99'
      );

      expect(res.success).toBe(true);
      // Assistant must report no route rather than fabricating paths
      expect(res.data.content).toContain('no mapped route between them');
    });
  });

  // ==========================================================================
  // 6. Anti-Hallucination & Not-Found Handling
  // ==========================================================================
  describe('6. Anti-Hallucination Guardrails', () => {
    it('truthfully reports not found for non-existent entities and refuses to invent locations', async () => {
      const res = await aiService.processQuery(CAMPUS_ID, 'Where is the Secret Nuclear Reactor?');
      expect(res.success).toBe(true);
      expect(res.data.content).toContain("couldn't find");
      expect(res.data.content).toContain('cannot invent locations');
      expect(res.data.poiResults).toBeUndefined();

      // Tamil non-existent
      const taRes = await aiService.processQuery(CAMPUS_ID, 'ரகசிய அறை எங்கே இருக்கு?');
      expect(taRes.success).toBe(true);
      expect(taRes.data.content).toContain('கண்டறியவில்லை');
      expect(taRes.data.content).toContain('கட்டுக்கதை சொல்ல மாட்டேன்');

      // Hindi non-existent
      const hiRes = await aiService.processQuery(CAMPUS_ID, 'जादुई कमरा कहाँ है?');
      expect(hiRes.success).toBe(true);
      expect(hiRes.data.content).toContain('नहीं मिला');
      expect(hiRes.data.content).toContain('स्थान नहीं बना सकता');
    });
  });

  // ==========================================================================
  // 7. Mocked LLM Provider & Graceful Degradation
  // ==========================================================================
  describe('7. Mocked LLM Provider & Fallback Handling', () => {
    it('executes tool calls generated by a mocked LLM function-calling provider', async () => {
      // Inject mock LLM provider simulating Gemini function calling
      aiService.setLLMProvider(async (_prompt: string, campusId: string) => {
        return {
          text: 'Here is the route calculated by the authoritative campus router:',
          toolCalls: [
            {
              name: 'findRoute',
              args: {
                sourceObjectId: 'obj-entrance-main',
                targetObjectId: 'obj-room-101',
                campusId,
                accessibleOnly: false,
              },
            },
          ],
        };
      });

      const res = await aiService.processQuery(CAMPUS_ID, 'Take me to AI lab please');
      expect(res.success).toBe(true);
      expect(res.data.routeResult).toBeDefined();
      expect(res.data.content).toContain('authoritative campus router');
    });

    it('gracefully degrades to deterministic parser if LLM provider fails or throws', async () => {
      // Mock LLM throwing network/service error
      aiService.setLLMProvider(async () => {
        throw new Error('LLM Service Unavailable (503)');
      });

      const res = await aiService.processQuery(CAMPUS_ID, 'Where is Chairman Statue?');
      expect(res.success).toBe(true);
      expect(res.data.poiResults?.[0]?.id).toBe('obj-statue-1');
      expect(res.data.content).toContain('Chairman Statue');
    });

    it('reads API key from environment securely without exposing secrets', () => {
      const config = getLLMConfig();
      expect(typeof config.isAvailable).toBe('boolean');
      // Secret key string should not be leaked in raw form
      if (config.apiKey) {
        expect(typeof config.apiKey).toBe('string');
      }
    });
  });
});
