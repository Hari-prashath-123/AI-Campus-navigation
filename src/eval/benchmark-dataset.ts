import { SupportedLanguage } from '../types/multilingual';

export interface MultilingualSearchTestCase {
  id: string;
  query: string;
  language: SupportedLanguage;
  expectedCanonicalId: string;
  expectedCode: string;
  description: string;
}

export interface AmbiguityTestCase {
  id: string;
  query: string;
  isAmbiguous: boolean;
  expectedCandidatesCount?: number;
  expectedClarificationKeywords?: string[];
  description: string;
}

export interface RoutingBenchmarkScenario {
  id: string;
  name: string;
  campusId: string;
  startObjectId: string;
  destObjectId: string;
  requiresFloorTransition: boolean;
  accessibleOnly?: boolean;
  expectedSuccess: boolean;
  expectedMinDistance?: number;
  expectedMaxDistance?: number;
  expectedTransitionsCount?: number;
  expectedTransitionType?: string;
}

export interface GroundednessTestCase {
  id: string;
  query: string;
  scenarioType: 'factual_poi' | 'missing_data' | 'nonexistent_location' | 'ambiguous_destination' | 'unavailable_route';
  campusId: string;
  mustContainEntities?: string[];
  forbiddenHallucinations?: string[];
  expectNotFoundOrRefusal?: boolean;
  expectClarificationPrompt?: boolean;
  expectUnavailableRouteNotice?: boolean;
  expectMissingDataNotice?: boolean;
  description: string;
}

/**
 * Standardized Multilingual Search Evaluation Dataset
 * Evaluates semantic and canonical mapping across English, Tamil, and Hindi.
 * Sample sizes: N_EN = 10, N_TA = 10, N_HI = 10. Total N = 30.
 */
export const MULTILINGUAL_SEARCH_DATASET: MultilingualSearchTestCase[] = [
  // ── English (N = 10) ──
  { id: 'en-01', query: 'Robotics & Vision Lab', language: 'en', expectedCanonicalId: 'obj-lab-201', expectedCode: 'LAB-201', description: 'Full English name for robotics lab' },
  { id: 'en-02', query: 'AI Innovation Lab', language: 'en', expectedCanonicalId: 'obj-room-101', expectedCode: 'ROOM-101', description: 'English name for AI innovation room' },
  { id: 'en-03', query: 'Turing Auditorium', language: 'en', expectedCanonicalId: 'obj-aud-a', expectedCode: 'AUD-A', description: 'English name for main auditorium' },
  { id: 'en-04', query: 'Dean Executive Conference', language: 'en', expectedCanonicalId: 'obj-conf-b', expectedCode: 'CONF-B', description: 'English conference room query' },
  { id: 'en-05', query: 'Main Campus Entrance', language: 'en', expectedCanonicalId: 'obj-entrance-main', expectedCode: 'ENT-01', description: 'English entrance query' },
  { id: 'en-06', query: 'Ground Restrooms', language: 'en', expectedCanonicalId: 'obj-rest-g', expectedCode: 'REST-01', description: 'Ground floor accessible restroom' },
  { id: 'en-07', query: 'Level 1 Restrooms', language: 'en', expectedCanonicalId: 'obj-rest-1', expectedCode: 'REST-02', description: 'Upper floor restroom' },
  { id: 'en-08', query: 'Chairman Statue', language: 'en', expectedCanonicalId: 'obj-statue-1', expectedCode: 'LM-01', description: 'Campus landmark' },
  { id: 'en-09', query: 'ROOM-101', language: 'en', expectedCanonicalId: 'obj-room-101', expectedCode: 'ROOM-101', description: 'Exact code lookup for Room 101' },
  { id: 'en-10', query: 'CONF-B', language: 'en', expectedCanonicalId: 'obj-conf-b', expectedCode: 'CONF-B', description: 'Exact code lookup for Conference Hall B' },

  // ── Tamil (தமிழ்) (N = 10) ──
  { id: 'ta-01', query: 'ரோபோடிக்ஸ் ஆய்வகம் 201', language: 'ta', expectedCanonicalId: 'obj-lab-201', expectedCode: 'LAB-201', description: 'Robotics lab in Tamil script' },
  { id: 'ta-02', query: 'AI புதுமை ஆய்வகம் 101', language: 'ta', expectedCanonicalId: 'obj-room-101', expectedCode: 'ROOM-101', description: 'AI lab in Tamil script' },
  { id: 'ta-03', query: 'டியூரிங் அரங்கம்', language: 'ta', expectedCanonicalId: 'obj-aud-a', expectedCode: 'AUD-A', description: 'Turing auditorium in Tamil script' },
  { id: 'ta-04', query: 'டீன் மாநாட்டு கூடம்', language: 'ta', expectedCanonicalId: 'obj-conf-b', expectedCode: 'CONF-B', description: 'Dean conference hall in Tamil script' },
  { id: 'ta-05', query: 'முதன்மை நுழைவாயில்', language: 'ta', expectedCanonicalId: 'obj-entrance-main', expectedCode: 'ENT-01', description: 'Main entrance in Tamil script' },
  { id: 'ta-06', query: 'தரைதள கழிப்பறைகள்', language: 'ta', expectedCanonicalId: 'obj-rest-g', expectedCode: 'REST-01', description: 'Ground restrooms in Tamil script' },
  { id: 'ta-07', query: 'முதல் தள கழிப்பறைகள்', language: 'ta', expectedCanonicalId: 'obj-rest-1', expectedCode: 'REST-02', description: 'Level 1 restrooms in Tamil script' },
  { id: 'ta-08', query: 'தலைவர் சிலை', language: 'ta', expectedCanonicalId: 'obj-statue-1', expectedCode: 'LM-01', description: 'Chairman statue in Tamil script' },
  { id: 'ta-09', query: 'ரோபோடிக்ஸ் ஆய்வகம்', language: 'ta', expectedCanonicalId: 'obj-lab-201', expectedCode: 'LAB-201', description: 'Robotics lab partial in Tamil' },
  { id: 'ta-10', query: 'நுழைவாயில்', language: 'ta', expectedCanonicalId: 'obj-entrance-main', expectedCode: 'ENT-01', description: 'Entrance term in Tamil' },

  // ── Hindi (हिन्दी) (N = 10) ──
  { id: 'hi-01', query: 'रोबोटिक्स लैब 201', language: 'hi', expectedCanonicalId: 'obj-lab-201', expectedCode: 'LAB-201', description: 'Robotics lab in Devanagari script' },
  { id: 'hi-02', query: 'एआई इनोवेशन लैब 101', language: 'hi', expectedCanonicalId: 'obj-room-101', expectedCode: 'ROOM-101', description: 'AI lab in Devanagari script' },
  { id: 'hi-03', query: 'ट्यूरिंग सभागार', language: 'hi', expectedCanonicalId: 'obj-aud-a', expectedCode: 'AUD-A', description: 'Turing auditorium in Devanagari script' },
  { id: 'hi-04', query: 'डीन सम्मेलन हॉल', language: 'hi', expectedCanonicalId: 'obj-conf-b', expectedCode: 'CONF-B', description: 'Dean conference hall in Devanagari script' },
  { id: 'hi-05', query: 'मुख्य प्रवेश द्वार', language: 'hi', expectedCanonicalId: 'obj-entrance-main', expectedCode: 'ENT-01', description: 'Main entrance in Devanagari script' },
  { id: 'hi-06', query: 'ग्राउंड विश्राम गृह', language: 'hi', expectedCanonicalId: 'obj-rest-g', expectedCode: 'REST-01', description: 'Ground restroom in Devanagari script' },
  { id: 'hi-07', query: 'स्तर 1 विश्राम गृह', language: 'hi', expectedCanonicalId: 'obj-rest-1', expectedCode: 'REST-02', description: 'Level 1 restroom in Devanagari script' },
  { id: 'hi-08', query: 'अध्यक्ष की मूर्ति', language: 'hi', expectedCanonicalId: 'obj-statue-1', expectedCode: 'LM-01', description: 'Chairman statue in Devanagari script' },
  { id: 'hi-09', query: 'रोबोटिक्स लैब', language: 'hi', expectedCanonicalId: 'obj-lab-201', expectedCode: 'LAB-201', description: 'Robotics lab partial in Hindi' },
  { id: 'hi-10', query: 'प्रवेश द्वार', language: 'hi', expectedCanonicalId: 'obj-entrance-main', expectedCode: 'ENT-01', description: 'Entrance term in Hindi' },
];

/**
 * Ambiguous vs Unambiguous Destination Evaluation Dataset
 * Balanced dataset: 5 ambiguous queries (P) and 5 unambiguous queries (N). Total N = 10.
 */
export const AMBIGUITY_EVALUATION_DATASET: AmbiguityTestCase[] = [
  // ── Ambiguous Queries (Actual Positive, P = 5) ──
  {
    id: 'amb-1',
    query: 'Take me to the lab',
    isAmbiguous: true,
    expectedCandidatesCount: 2,
    expectedClarificationKeywords: ['which', 'options', 'lab', 'mean'],
    description: 'Generic lab matches both ROOM-101 and LAB-201',
  },
  {
    id: 'amb-2',
    query: 'Where is the restroom?',
    isAmbiguous: true,
    expectedCandidatesCount: 2,
    expectedClarificationKeywords: ['which', 'restroom', 'options'],
    description: 'Generic restroom matches REST-01 and REST-02',
  },
  {
    id: 'amb-3',
    query: 'Find the lab',
    isAmbiguous: true,
    expectedCandidatesCount: 2,
    description: 'Generic lab search matches both labs',
  },
  {
    id: 'amb-4',
    query: 'Show me the restrooms',
    isAmbiguous: true,
    expectedCandidatesCount: 2,
    description: 'Restrooms query matches REST-01 and REST-02',
  },
  {
    id: 'amb-5',
    query: 'Where is the lab?',
    isAmbiguous: true,
    expectedCandidatesCount: 2,
    description: 'Lab question matching multiple labs on campus',
  },

  // ── Unambiguous Queries (Actual Negative, N = 5) ──
  {
    id: 'unamb-1',
    query: 'Navigate to Robotics & Vision Lab 201',
    isAmbiguous: false,
    description: 'Fully specified lab room code and name',
  },
  {
    id: 'unamb-2',
    query: 'Show me the route to Dean Executive Conference Hall',
    isAmbiguous: false,
    description: 'Unique conference hall name',
  },
  {
    id: 'unamb-3',
    query: 'Where is Turing Auditorium?',
    isAmbiguous: false,
    description: 'Unique auditorium name',
  },
  {
    id: 'unamb-4',
    query: 'Navigate to AI Innovation Lab 101',
    isAmbiguous: false,
    description: 'Fully specified AI lab name',
  },
  {
    id: 'unamb-5',
    query: 'Take me to Chairman Statue',
    isAmbiguous: false,
    description: 'Unique landmark entity',
  },
];

/**
 * Deterministic Multi-Floor Routing Benchmark Scenarios
 */
export const ROUTING_BENCHMARK_SCENARIOS: RoutingBenchmarkScenario[] = [
  {
    id: 'route-single-floor',
    name: 'Single Floor Traversal (Main Entrance to Ground Restrooms)',
    campusId: 'campus-tech-inst',
    startObjectId: 'obj-entrance-main',
    destObjectId: 'obj-rest-g',
    requiresFloorTransition: false,
    expectedSuccess: true,
    expectedMinDistance: 5,
    expectedMaxDistance: 60,
    expectedTransitionsCount: 0,
  },
  {
    id: 'route-multi-floor-elevator',
    name: 'Multi-Floor Vertical Transition (Ground Entrance -> Level 1 Robotics Lab)',
    campusId: 'campus-tech-inst',
    startObjectId: 'obj-entrance-main',
    destObjectId: 'obj-lab-201',
    requiresFloorTransition: true,
    accessibleOnly: true,
    expectedSuccess: true,
    expectedMinDistance: 15,
    expectedMaxDistance: 100,
    expectedTransitionsCount: 1,
    expectedTransitionType: 'elevator',
  },
  {
    id: 'route-multi-floor-stairs',
    name: 'Multi-Floor Staircase Transition (Ground Entrance -> Level 1 Conference Hall)',
    campusId: 'campus-tech-inst',
    startObjectId: 'obj-entrance-main',
    destObjectId: 'obj-conf-b',
    requiresFloorTransition: true,
    accessibleOnly: false,
    expectedSuccess: true,
    expectedMinDistance: 15,
    expectedMaxDistance: 100,
    expectedTransitionsCount: 1,
  },
  {
    id: 'route-disconnected-ghost',
    name: 'Disconnected Target Node Scenario',
    campusId: 'campus-tech-inst',
    startObjectId: 'obj-entrance-main',
    destObjectId: 'obj-ghost-nonexistent',
    requiresFloorTransition: false,
    expectedSuccess: false,
  },
];

/**
 * AI Assistant Groundedness & Anti-Hallucination Evaluation Dataset
 * Covers:
 *  1. factual_poi: Grounded retrieval of verified locations.
 *  2. missing_data: Object exists, but requested attribute (phone extension) does not exist.
 *  3. nonexistent_location: Adversarial request for fictitious facilities.
 *  4. ambiguous_destination: Ambiguous query requiring clarification, not arbitrary invention.
 *  5. unavailable_route: Route request between disconnected entities.
 */
export const GROUNDEDNESS_EVALUATION_DATASET: GroundednessTestCase[] = [
  {
    id: 'ground-1',
    query: 'Where is the Robotics Lab?',
    scenarioType: 'factual_poi',
    campusId: 'campus-tech-inst',
    mustContainEntities: ['Robotics', '201'],
    forbiddenHallucinations: ['Floor 9', 'Room 999', 'underground silo'],
    expectNotFoundOrRefusal: false,
    description: 'Factual POI query verifying ground-truth coordinates and room code',
  },
  {
    id: 'ground-2',
    query: 'What is the direct phone extension of the Chairman Statue?',
    scenarioType: 'missing_data',
    campusId: 'campus-tech-inst',
    forbiddenHallucinations: ['ext 4999', 'phone: 555', 'x4040', 'extension 1234'],
    expectMissingDataNotice: true,
    description: 'Missing attribute scenario: Chairman Statue has no telephone extension',
  },
  {
    id: 'ground-3',
    query: 'How do I reach the Olympic Swimming Pool and Bowling Alley on Campus?',
    scenarioType: 'nonexistent_location',
    campusId: 'campus-tech-inst',
    forbiddenHallucinations: ['Lane 4', 'Deep end', 'Olympic size', 'Bowling shoe rental', 'diving board'],
    expectNotFoundOrRefusal: true,
    description: 'Adversarial query for non-existent athletic facilities',
  },
  {
    id: 'ground-4',
    query: 'Navigate to the secret underground nuclear bunker',
    scenarioType: 'nonexistent_location',
    campusId: 'campus-tech-inst',
    forbiddenHallucinations: ['blast doors', 'underground silo', 'radiation shelter', 'Sub-level -5'],
    expectNotFoundOrRefusal: true,
    description: 'Adversarial query for non-existent defense infrastructure',
  },
  {
    id: 'ground-5',
    query: 'Take me to the lab',
    scenarioType: 'ambiguous_destination',
    campusId: 'campus-tech-inst',
    expectClarificationPrompt: true,
    forbiddenHallucinations: ['Navigating directly to your only lab', 'Proceed straight to the only laboratory'],
    description: 'Ambiguous query that must prompt for clarification rather than hallucinate a specific choice',
  },
  {
    id: 'ground-6',
    query: 'Route from Main Entrance to nonexistent node 9999',
    scenarioType: 'unavailable_route',
    campusId: 'campus-tech-inst',
    expectUnavailableRouteNotice: true,
    forbiddenHallucinations: ['Here is your route through corridor 999', 'Turn right into fictitious hall'],
    description: 'Disconnected or unavailable route query where the router must report no path',
  },
];
