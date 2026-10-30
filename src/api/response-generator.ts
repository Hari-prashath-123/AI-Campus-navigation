import { SupportedLanguage, SafePOI, ClarificationOption } from '../types/ai';
import { WorkflowResolution } from '../types/workflow';

/**
 * Multilingual Response Generator
 *
 * Converts structured tool results into natural language responses.
 * The navigation engine is language-independent — only this layer
 * produces human-readable text in the user's language.
 * 
 * Rules:
 *  - Entity names (room names, building names) are NEVER translated.
 *  - IDs, codes, distances, times are always kept as-is.
 *  - Only the surrounding prose is localized.
 */

type RouteResult = {
  totalDistanceMeters: number;
  estimatedTimeSeconds: number;
  transitions: { type: string; description: string }[];
};

// ─── String Templates ────────────────────────────────────────────────────────

const T = {
  en: {
    notFound: (q: string) =>
      `I checked the campus database but couldn't find **"${q}"**. I cannot invent locations — please verify the name.`,
    routeFrom: (s: string, d: string, accessible: boolean) =>
      `Here is the ${accessible ? 'wheelchair-accessible ' : ''}route from **${s}** to **${d}**:`,
    distance: (m: number) => `• **Distance:** ${m.toFixed(0)} m`,
    time: (s: number) => `• **Estimated time:** ${Math.ceil(s / 60)} min`,
    transitions: 'Key transitions & Floor changes:',
    noRoute: (s: string, d: string) =>
      `I found **${s}** and **${d}** in the database, but there is no mapped route between them. Try checking connections first.`,
    found: (q: string, n: number) =>
      `I found ${n} result${n === 1 ? '' : 's'} for **"${q}"**:`,
    accessible: (v: boolean) => (v ? 'Yes ♿' : 'No'),
    openStatus: (name: string, open: boolean, hours: string, reason?: string) =>
      `**${name}** is currently **${open ? '🟢 Open' : '🔴 Closed'}**. Operating hours: ${hours}.${reason ? ` (${reason})` : ''}`,
    noAvailability: (q: string) =>
      `I couldn't determine the availability of **"${q}"** from the database.`,
    typeLabel: 'Type',
    accessLabel: 'Accessible',
    workflowFound: (name: string, desc: string) => `Here is the procedure for **${name}**:\n_${desc}_\n\n**Steps:**`,
    ambiguityQuestion: (q: string) =>
      `I found multiple locations matching **"${q}"**. Which one did you mean?`,
  },
  ta: {
    notFound: (q: string) =>
      `வளாகத் தரவுத்தளத்தில் **"${q}"** கண்டறியவில்லை. நான் இடங்களை கட்டுக்கதை சொல்ல மாட்டேன் — பெயரை சரிபார்க்கவும்.`,
    routeFrom: (s: string, d: string, accessible: boolean) =>
      `**${s}** இலிருந்து **${d}** வரை ${accessible ? 'வீல்சேர் அணுகக்கூடிய ' : ''}பாதை:`,
    distance: (m: number) => `• **தூரம்:** ${m.toFixed(0)} மீ`,
    time: (s: number) => `• **மதிப்பிடப்பட்ட நேரம்:** ${Math.ceil(s / 60)} நிமிடம்`,
    transitions: 'முக்கிய மாற்றங்கள் & தள மாற்றங்கள்:',
    noRoute: (s: string, d: string) =>
      `தரவுத்தளத்தில் **${s}** மற்றும் **${d}** உள்ளன, ஆனால் இடையே பாதை இல்லை. இணைப்புகளை சரிபார்க்கவும்.`,
    found: (q: string, n: number) =>
      `**"${q}"** க்கு ${n} முடிவு${n === 1 ? '' : 'கள்'} கண்டறியப்பட்டன:`,
    accessible: (v: boolean) => (v ? 'ஆம் ♿' : 'இல்லை'),
    openStatus: (name: string, open: boolean, hours: string, reason?: string) =>
      `**${name}** இப்போது **${open ? '🟢 திறந்திருக்கிறது' : '🔴 மூடப்பட்டுள்ளது'}**. நேரம்: ${hours}.${reason ? ` (${reason})` : ''}`,
    noAvailability: (q: string) =>
      `**"${q}"** இன் நிலையை தரவுத்தளத்தில் கண்டறிய முடியவில்லை.`,
    typeLabel: 'வகை',
    accessLabel: 'அணுகல்',
    workflowFound: (name: string, desc: string) => `**${name}** க்கான நடைமுறை இதோ:\n_${desc}_\n\n**படிககள்:**`,
    ambiguityQuestion: (q: string) =>
      `**"${q}"** உடன் பொருந்தும் பல இடங்கள் உள்ளன. நீங்கள் எதை குறிப்பிட்டீர்கள்?`,
  },
  hi: {
    notFound: (q: string) =>
      `कैंपस डेटाबेस में **"${q}"** नहीं मिला। मैं स्थान नहीं बना सकता — कृपया नाम की जाँच करें।`,
    routeFrom: (s: string, d: string, accessible: boolean) =>
      `**${s}** से **${d}** तक का ${accessible ? 'व्हीलचेयर सुलभ ' : ''}मार्ग:`,
    distance: (m: number) => `• **दूरी:** ${m.toFixed(0)} मी`,
    time: (s: number) => `• **अनुमानित समय:** ${Math.ceil(s / 60)} मिनट`,
    transitions: 'मुख्य बदलाव और मंजिल परिवर्तन:',
    noRoute: (s: string, d: string) =>
      `डेटाबेस में **${s}** और **${d}** दोनों हैं, लेकिन उनके बीच कोई मार्ग नहीं है। कनेक्शन जाँचें।`,
    found: (q: string, n: number) =>
      `**"${q}"** के लिए ${n} परिणाम मिले:`,
    accessible: (v: boolean) => (v ? 'हाँ ♿' : 'नहीं'),
    openStatus: (name: string, open: boolean, hours: string, reason?: string) =>
      `**${name}** अभी **${open ? '🟢 खुला है' : '🔴 बंद है'}**। समय: ${hours}.${reason ? ` (${reason})` : ''}`,
    noAvailability: (q: string) =>
      `**"${q}"** की उपलब्धता डेटाबेस में नहीं मिली।`,
    typeLabel: 'प्रकार',
    accessLabel: 'सुलभ',
    workflowFound: (name: string, desc: string) => `**${name}** के लिए प्रक्रिया यहाँ है:\n_${desc}_\n\n**कदम:**`,
    ambiguityQuestion: (q: string) =>
      `**"${q}"** से मेल खाने वाले कई स्थान मिले। आपका क्या मतलब था?`,
  },
};

// ─── Transition descriptions (multilingual) ──────────────────────────────────

const TRANSITION_LABELS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    staircase: 'Take the stairs (⚠️ Note: Not wheelchair accessible)',
    elevator: 'Take the elevator (♿ Wheelchair accessible)',
    ramp: 'Use the access ramp (♿ Wheelchair accessible)',
    bridge: 'Cross the connecting bridge',
    entrance: 'Enter through the doorway',
    door: 'Pass through the entrance',
    building_to_building: 'Proceed outside between buildings',
    corridor: 'Walk along the corridor',
  },
  ta: {
    staircase: 'படிகளில் ஏறவும் (⚠️ குறிப்பு: வீல்சேர் செல்ல முடியாது)',
    elevator: 'லிஃப்ட் பயன்படுத்தவும் (♿ வீல்சேர் அணுகக்கூடியது)',
    ramp: 'சாய்வுப்பாதை பயன்படுத்தவும் (♿ வீல்சேர் அணுகக்கூடியது)',
    bridge: 'இணைப்பு பாலத்தை கடக்கவும்',
    entrance: 'நுழைவாயில் வழியாக நுழைக',
    door: 'கதவு வழியாக செல்லவும்',
    building_to_building: 'கட்டிடங்களுக்கு இடையே வெளியில் செல்லவும்',
    corridor: 'தாழ்வாரம் வழியாக நடக்கவும்',
  },
  hi: {
    staircase: 'सीढ़ियाँ लें (⚠️ ध्यान दें: व्हीलचेयर सुलभ नहीं है)',
    elevator: 'लिफ्ट लें (♿ व्हीलचेयर सुलभ)',
    ramp: 'रैंप का उपयोग करें (♿ व्हीलचेयर सुलभ)',
    bridge: 'कनेक्टिंग पुल पार करें',
    entrance: 'प्रवेश द्वार से जाएं',
    door: 'दरवाजे से जाएं',
    building_to_building: 'इमारतों के बीच बाहर जाएं',
    corridor: 'गलियारे से चलें',
  },
};

// ─── Public Helpers ──────────────────────────────────────────────────────────

export function generateNotFound(query: string, lang: SupportedLanguage): string {
  return T[lang].notFound(query);
}

export function generateAmbiguityClarification(
  query: string,
  options: ClarificationOption[],
  lang: SupportedLanguage
): string {
  const t = T[lang];
  const lines: string[] = [t.ambiguityQuestion(query), ''];
  options.forEach((opt, idx) => {
    const loc = opt.buildingName ? ` (${opt.buildingName}${opt.floorLevel !== undefined ? `, Floor ${opt.floorLevel}` : ''})` : '';
    lines.push(`${idx + 1}. **${opt.label}**${loc}`);
  });
  return lines.join('\n');
}

export function generateRouteResponse(
  sourceName: string,
  destName: string,
  route: RouteResult,
  lang: SupportedLanguage,
  isAccessible: boolean
): string {
  const t = T[lang];
  const lines: string[] = [
    t.routeFrom(sourceName, destName, isAccessible),
    '',
    t.distance(route.totalDistanceMeters),
    t.time(route.estimatedTimeSeconds),
  ];

  if (route.transitions.length > 0) {
    lines.push('');
    lines.push(`**${t.transitions}**`);
    route.transitions.forEach((tr, i) => {
      const label =
        TRANSITION_LABELS[lang][tr.type] ?? tr.description;
      lines.push(`${i + 1}. ${label}`);
    });
  }

  return lines.join('\n');
}

export function generateNoRoute(sourceName: string, destName: string, lang: SupportedLanguage): string {
  return T[lang].noRoute(sourceName, destName);
}

export function generateSearchResponse(query: string, results: SafePOI[], lang: SupportedLanguage): string {
  const t = T[lang];
  const lines: string[] = [t.found(query, results.length), ''];
  results.forEach(r => {
    lines.push(`**${r.name}**`);
    if (r.description) lines.push(r.description);
    if (r.historicalInfo) lines.push(`*History: ${r.historicalInfo}*`);
    
    let meta = `${t.typeLabel}: ${r.type} | ${t.accessLabel}: ${t.accessible(r.isAccessible)}`;
    if (r.properties?.operatingHours) {
      meta += ` | Hours: ${r.properties.operatingHours}`;
    }
    lines.push(meta);
    
    if (r.contactInfo) {
      const contacts = [];
      if (r.contactInfo.phone) contacts.push(`📞 ${r.contactInfo.phone}`);
      if (r.contactInfo.email) contacts.push(`✉️ ${r.contactInfo.email}`);
      if (r.contactInfo.website) contacts.push(`🌐 ${r.contactInfo.website}`);
      if (contacts.length) lines.push(contacts.join(' '));
    }
    if (r.externalLinks && r.externalLinks.length > 0) {
      const links = r.externalLinks.map(l => `[${l.title}](${l.url})`).join(' | ');
      lines.push(`🔗 Links: ${links}`);
    }
    
    lines.push('');
  });
  return lines.join('\n').trim();
}

export function generateAvailabilityResponse(
  name: string,
  isOpen: boolean,
  operatingHours: string,
  lang: SupportedLanguage,
  closureReason?: string
): string {
  return T[lang].openStatus(name, isOpen, operatingHours, closureReason);
}

export function generateNoAvailability(query: string, lang: SupportedLanguage): string {
  return T[lang].noAvailability(query);
}

export function generateWorkflowResponse(
  workflow: WorkflowResolution['workflow'],
  lang: SupportedLanguage,
  includeNavigationOffer: boolean
): string {
  const t = T[lang];
  const name = typeof workflow.name[lang] === 'string' ? workflow.name[lang] : (workflow.name.en as string);
  const desc = typeof workflow.description[lang] === 'string' ? workflow.description[lang] : (workflow.description.en as string);
  
  const lines: string[] = [t.workflowFound(name, desc)];
  
  workflow.steps.sort((a, b) => a.order - b.order).forEach(step => {
    const title = typeof step.title[lang] === 'string' ? step.title[lang] : (step.title.en as string);
    const stepDesc = typeof step.description[lang] === 'string' ? step.description[lang] : (step.description.en as string);
    lines.push(`${step.order}. **${title}**: ${stepDesc}`);
  });

  if (includeNavigationOffer) {
    lines.push('');
    const offerStr = lang === 'en' ? 'Would you like me to navigate you there?' : (lang === 'ta' ? 'நான் உங்களை அங்கே வழிநடத்தவா?' : 'क्या आप चाहते हैं कि मैं आपको वहाँ ले चलूँ?');
    lines.push(`_${offerStr}_`);
  }

  return lines.join('\n');
}
