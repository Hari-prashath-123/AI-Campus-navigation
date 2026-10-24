import { SupportedLanguage, ParsedIntent } from '../types/ai';

/**
 * Multilingual Intent Parser
 *
 * Converts natural language queries (any supported language) into a
 * language-independent ParsedIntent. The navigation engine never sees
 * the raw language — only structured intents and entity names.
 *
 * Important: We never translate entity names (room names, building names,
 * IDs). We only extract them verbatim for lookup.
 */

// ─── Language Detection ─────────────────────────────────────────────────────

const TAMIL_PATTERN = /[\u0B80-\u0BFF]/;
const HINDI_PATTERN = /[\u0900-\u097F]/;

export function detectLanguage(text: string): SupportedLanguage {
  if (TAMIL_PATTERN.test(text)) return 'ta';
  if (HINDI_PATTERN.test(text)) return 'hi';
  return 'en';
}

// ─── Intent Keywords (language → trigger phrases) ───────────────────────────

const INTENT_KEYWORDS: Record<
  SupportedLanguage,
  {
    route: string[];
    find: string[];
    availability: string[];
    nearby: string[];
    accessible: string[];
    vehicle: string[];
    workflow: string[];
  }
> = {
  en: {
    route: [
      'how to get', 'navigate', 'route', 'take me', 'from.*to', 'way to',
      'directions', 'go to', 'path to',
    ],
    find: ['where is', 'find', 'show me', 'locate', 'looking for', 'search'],
    availability: ['open', 'closed', 'hours', 'available', 'accessible'],
    nearby: ['near', 'closest', 'nearest', 'around'],
    accessible: ['accessible', 'wheelchair', 'disabled'],
    vehicle: ['drive', 'vehicle', 'car', 'parking'],
    workflow: ['how do i', 'where do i', 'where should i', 'procedure', 'process', 'submit', 'apply for', 'get a new'],
  },
  ta: {
    route: [
      'எப்படி போவது', 'வழி', 'செல்ல', 'அழைத்துச் செல்', 'திசை',
      'எங்கு செல்வது', 'பாதை', 'வழிகாட்டு',
    ],
    find: [
      'எங்கே', 'எங்கு', 'எங்கிருக்கு', 'இருக்கு', 'கண்டுபிடி',
      'தேடு', 'காட்டு',
    ],
    availability: ['திறந்திருக்கா', 'மூடியிருக்கா', 'நேரம்', 'கிடைக்குமா'],
    nearby: ['அருகில்', 'பக்கத்தில்', 'நெருங்கிய', 'கிட்ட'],
    accessible: ['ஊனமுற்றோர்', 'அணுகல்', 'வீல்சேர்'],
    vehicle: ['வாகனம்', 'கார்', 'ஓட்டு'],
    workflow: ['எப்படி', 'எங்கே சமர்ப்பிக்க', 'நடைமுறை', 'செயல்முறை', 'விண்ணப்பிக்க'],
  },
  hi: {
    route: [
      'कैसे जाएं', 'रास्ता', 'मार्ग', 'जाना है', 'दिशा',
      'कहां से', 'से.*तक', 'नेविगेट',
    ],
    find: ['कहाँ है', 'ढूंढो', 'खोजें', 'दिखाओ', 'बताओ', 'कहाँ'],
    availability: ['खुला है', 'बंद है', 'समय', 'उपलब्ध'],
    nearby: ['पास', 'नजदीक', 'करीब', 'आसपास'],
    accessible: ['व्हीलचेयर', 'विकलांग', 'सुलभ'],
    vehicle: ['गाड़ी', 'कार', 'वाहन', 'ड्राइव'],
    workflow: ['कैसे करूँ', 'कहाँ जमा करूँ', 'प्रक्रिया', 'आवेदन'],
  },
};

// ─── Entity Extraction ───────────────────────────────────────────────────────

/**
 * Strip intent signal words from the text to isolate the entity name.
 * We keep the entity verbatim (not translated) so it can be looked up in the DB.
 */
const STRIP_PATTERNS: Record<SupportedLanguage, RegExp[]> = {
  en: [
    /^(where is|find|show me|locate|navigate to|how to get to|take me to|route to|nearest|closest|is the|is|are the|find an? accessible route to|find an? route to)/i,
    /\?+$/,
  ],
  ta: [
    /^(எங்கே|எங்கு|எங்கிருக்கு|கண்டுபிடி|காட்டு|அருகில்|பக்கத்தில்|திறந்திருக்கா)/i,
    /\?+$/,
    /(எங்கே இருக்கு|இருக்கு|எங்க|போக|செல்ல)$/i,
  ],
  hi: [
    /^(कहाँ है|ढूंढो|खोजें|दिखाओ|बताओ|कैसे जाएं|रास्ता दिखाओ|नजदीकी)/i,
    /\?+$/,
    /(कहाँ|है|हैं)$/i,
  ],
};

function extractEntity(text: string, lang: SupportedLanguage): string {
  let result = text.trim();
  for (const pattern of STRIP_PATTERNS[lang]) {
    result = result.replace(pattern, '').trim();
  }
  return result || text.trim();
}

function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some(k => new RegExp(k, 'i').test(text));
}

// ─── Route entity extraction (source → dest) ─────────────────────────────────

const FROM_TO_PATTERNS: Record<SupportedLanguage, RegExp> = {
  en: /from\s+(.+?)\s+to\s+(.+)/i,
  ta: /(.+?)\s+இலிருந்து\s+(.+?)\s+(செல்ல|போக|வழி)/i,
  hi: /(.+?)\s+से\s+(.+?)\s+(जाना|मार्ग|रास्ता)/i,
};

// ─── Main Parser ─────────────────────────────────────────────────────────────

export function parseIntent(userText: string): ParsedIntent {
  const lang = detectLanguage(userText);
  const keywords = INTENT_KEYWORDS[lang];
  const textLower = userText.toLowerCase();

  const isAccessible =
    matchesAny(textLower, keywords.accessible) ||
    textLower.includes('accessible') ||
    textLower.includes('wheelchair');

  const isVehicle = matchesAny(textLower, keywords.vehicle);
  const mode = isVehicle ? 'vehicle' : 'walking';

  // ROUTE INTENT
  if (matchesAny(textLower, keywords.route)) {
    const fromToMatch = FROM_TO_PATTERNS[lang].exec(userText);
    if (fromToMatch) {
      return {
        type: 'find_route',
        entities: {
          source: fromToMatch[1].trim(),
          destination: fromToMatch[2].trim(),
        },
        isAccessible,
        detectedLanguage: lang,
        mode,
      };
    }
    // No explicit source — default to entrance/gate
    const dest = extractEntity(userText, lang);
    return {
      type: 'find_route',
      entities: { source: 'main entrance', destination: dest },
      isAccessible,
      detectedLanguage: lang,
      mode,
    };
  }

  // WORKFLOW INTENT
  if (matchesAny(textLower, keywords.workflow)) {
    const query = extractEntity(userText, lang);
    const isNavigationAlso = matchesAny(textLower, keywords.route) || matchesAny(textLower, keywords.find);
    return {
      type: isNavigationAlso ? 'combined_navigation_workflow' : 'workflow',
      entities: { query },
      isAccessible,
      detectedLanguage: lang,
      mode,
    };
  }

  // NEARBY INTENT
  if (matchesAny(textLower, keywords.nearby)) {
    const query = extractEntity(userText, lang);
    return {
      type: 'find_nearby',
      entities: { query },
      isAccessible,
      detectedLanguage: lang,
      mode,
    };
  }

  // AVAILABILITY INTENT
  if (matchesAny(textLower, keywords.availability)) {
    const query = extractEntity(userText, lang);
    return {
      type: 'check_availability',
      entities: { query },
      isAccessible,
      detectedLanguage: lang,
      mode,
    };
  }

  // FIND LOCATION INTENT (default)
  const query = extractEntity(userText, lang);
  return {
    type: 'find_location',
    entities: { query },
    isAccessible,
    detectedLanguage: lang,
    mode,
  };
}
