import React, { useState, useRef, useEffect } from 'react';
import { aiService } from '../api/ai.service';
import { campusService } from '../api/campus.service';
import { AIChatMessage, SupportedLanguage, LanguageConfig, Campus } from '../types';
import { generateEntityId } from '../utils/validation';
import { Bot, Send, Globe, MapPin, Loader2, ChevronRight, Navigation, Building2 } from 'lucide-react';

// ─── Language config ──────────────────────────────────────────────────────────

const LANGUAGES: LanguageConfig[] = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', direction: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr' },
];

const EXAMPLE_QUERIES: Record<SupportedLanguage, string[]> = {
  en: [
    'Where is the AI lab?',
    'How do I get to room 204?',
    'Take me from the main gate to the conference hall.',
    'Where is the nearest drinking water?',
    'Is the east entrance open?',
    'Find an accessible route to the laboratory.',
  ],
  ta: [
    'AI lab எங்கே இருக்கு?',
    'Room 204 எப்படி போவது?',
    'Main Gate இலிருந்து conference hall செல்ல வழி காட்டு.',
    'அருகில் குடிநீர் எங்கே இருக்கு?',
    'East entrance திறந்திருக்கா?',
    'Laboratory க்கு வீல்சேர் பாதை காட்டு.',
  ],
  hi: [
    'AI lab कहाँ है?',
    'Room 204 कैसे जाएं?',
    'Main Gate से conference hall तक मार्ग बताएं।',
    'नजदीकी पानी कहाँ है?',
    'क्या East entrance खुला है?',
    'Laboratory का सुलभ मार्ग बताएं।',
  ],
};

const FLAG: Record<SupportedLanguage, string> = {
  en: '🇺🇸', ta: '🇮🇳', hi: '🇮🇳',
};

// ─── Markdown-style formatter (bold, newlines) ────────────────────────────────

function renderMarkdown(text: string) {
  return text
    .split('\n')
    .map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      return <p key={i} className="min-h-[1rem]">{parts}</p>;
    });
}

// ─── Route Summary Card ───────────────────────────────────────────────────────

function RouteSummaryCard({ route }: { route: any }) {
  if (!route?.totalDistanceMeters) return null;
  return (
    <div className="mt-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
        <Navigation size={16} /> Route Summary
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-white rounded-lg p-3 border border-blue-100 text-center">
          <div className="text-xs text-slate-500 mb-1">Distance</div>
          <div className="font-bold text-slate-900">{route.totalDistanceMeters.toFixed(0)} m</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-blue-100 text-center">
          <div className="text-xs text-slate-500 mb-1">Est. Time</div>
          <div className="font-bold text-slate-900">{Math.ceil(route.estimatedTimeSeconds / 60)} min</div>
        </div>
      </div>
      {route.transitions?.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Steps</div>
          {route.transitions.map((t: any, i: number) => (
            <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 text-sm text-slate-700 border border-blue-100">
              <ChevronRight size={14} className="text-blue-500 shrink-0" />
              {t.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── POI Card ─────────────────────────────────────────────────────────────────

function POICard({ poi }: { poi: any }) {
  return (
    <div className="flex flex-col gap-2 bg-white border border-slate-200 rounded-lg p-3 text-sm w-full">
      {poi.images && poi.images.length > 0 && (
        <img src={poi.images[0]} alt={poi.name} className="w-full h-32 object-cover rounded-md mb-2 border border-slate-100" />
      )}
      <div className="flex items-start gap-3">
        <MapPin size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold text-slate-900">{poi.name}</div>
          {poi.description && <div className="text-slate-500 text-xs mt-0.5">{poi.description}</div>}
          <div className="flex gap-3 mt-1 text-xs text-slate-400">
            <span className="capitalize">{poi.type?.replace('_', ' ')}</span>
            {poi.isAccessible && <span className="text-green-600">♿ Accessible</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tool Call Badge ──────────────────────────────────────────────────────────

function ToolCallBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-[10px] font-mono rounded px-2 py-0.5">
      ⚙ {name}
    </span>
  );
}

// ─── Main AI Assistant Page ───────────────────────────────────────────────────

export const AIAssistantPage: React.FC = () => {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [activeCampusId, setActiveCampusId] = useState<string>('campus-tech-inst');
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'sys-1',
      sender: 'assistant',
      content: 'Hello! I am the Campus AI Assistant. I can help you find locations, plan routes, and answer questions about the campus.\n\nI support **English**, **தமிழ்** (Tamil), and **हिन्दी** (Hindi).',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('en');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    campusService.getCampuses().then(res => {
      if (res.success && res.data.length > 0) {
        setCampuses(res.data);
        setActiveCampusId(res.data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const query = (text || input).trim();
    if (!query || loading) return;

    const userMsg: AIChatMessage = {
      id: generateEntityId('msg'),
      sender: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    const thinkingMsg: AIChatMessage = {
      id: generateEntityId('msg'),
      sender: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isThinking: true,
    };

    setMessages(prev => [...prev, userMsg, thinkingMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiService.processQuery(activeCampusId, query);
      setMessages(prev => {
        const without = prev.filter(m => !m.isThinking);
        return [...without, res.data];
      });
      if (res.data.detectedLanguage) setSelectedLang(res.data.detectedLanguage);
    } catch {
      setMessages(prev => {
        const without = prev.filter(m => !m.isThinking);
        return [...without, {
          id: generateEntityId('msg'),
          sender: 'assistant',
          content: 'An error occurred. Please try again.',
          timestamp: new Date().toISOString(),
        }];
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex h-full bg-slate-50">
      {/* Left Panel: Language + Suggestions */}
      <aside className="w-72 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm mb-3">
            <Globe size={16} /> Language / மொழி / भाषा
          </div>
          <div className="grid grid-cols-1 gap-2">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang.code)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                  selectedLang === lang.code
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-lg">{FLAG[lang.code]}</span>
                <div className="text-left">
                  <div>{lang.name}</div>
                  {lang.nativeName !== lang.name && (
                    <div className={`text-xs ${selectedLang === lang.code ? 'text-blue-100' : 'text-slate-400'}`}>{lang.nativeName}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Try asking…</div>
          <div className="space-y-1.5">
            {EXAMPLE_QUERIES[selectedLang].map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                disabled={loading}
                className="w-full text-left px-3 py-2 text-xs text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors border border-transparent hover:border-blue-100 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm">Campus AI Assistant</h1>
            <p className="text-xs text-slate-500">Powered by deterministic campus tools · No hallucinations</p>
          </div>
          {campuses.length > 1 && (
            <div className="ml-auto flex items-center gap-1.5 text-xs">
              <Building2 size={13} className="text-slate-400" />
              <select
                value={activeCampusId}
                onChange={e => setActiveCampusId(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name.en || c.code}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className={`${campuses.length > 1 ? '' : 'ml-auto'} flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200`}>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {FLAG[selectedLang]} {LANGUAGES.find(l => l.code === selectedLang)?.nativeName}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 mt-1">
                  <Bot size={14} className="text-white" />
                </div>
              )}

              <div className={`max-w-[75%] space-y-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                {msg.isThinking ? (
                  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 size={15} className="animate-spin" />
                    Thinking…
                  </div>
                ) : (
                  <>
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-1 ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                    }`}>
                      {renderMarkdown(msg.content)}
                    </div>

                    {/* Tool call badges */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {msg.toolCalls.map(tc => <ToolCallBadge key={tc.id} name={tc.name} />)}
                      </div>
                    )}

                    {/* Route card */}
                    {msg.routeResult && <RouteSummaryCard route={msg.routeResult} />}

                    {/* POI cards */}
                    {msg.poiResults && msg.poiResults.length > 0 && (
                      <div className="space-y-2 w-full">
                        {msg.poiResults.map((poi: any) => <POICard key={poi.id} poi={poi} />)}
                      </div>
                    )}

                    {/* Clarification options chips */}
                    {msg.clarificationOptions && msg.clarificationOptions.length > 0 && (
                      <div className="flex flex-col gap-1.5 w-full mt-2">
                        <span className="text-xs font-semibold text-slate-500">
                          {selectedLang === 'ta' ? 'பரிந்துரைக்கப்பட்ட இடங்கள்:' : selectedLang === 'hi' ? 'सुझाए गए स्थान:' : 'Suggested locations:'}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {msg.clarificationOptions.map(opt => (
                            <button
                              key={opt.id}
                              onClick={() => handleSend(opt.label)}
                              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-left transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                              <MapPin size={12} className="text-blue-500 shrink-0" />
                              <span className="font-medium">{opt.label}</span>
                              {opt.code && <span className="text-blue-400 text-[10px]">({opt.code})</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Language detection indicator */}
                    {msg.detectedLanguage && msg.sender === 'assistant' && msg.detectedLanguage !== 'en' && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        {FLAG[msg.detectedLanguage]} Responded in {LANGUAGES.find(l => l.code === msg.detectedLanguage)?.name}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-slate-200 px-6 py-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={
                  selectedLang === 'ta' ? 'கேள்வி கேளுங்கள்…' :
                  selectedLang === 'hi' ? 'प्रश्न पूछें…' :
                  'Ask a question…'
                }
                disabled={loading}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="w-11 h-11 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-all shadow-sm"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 text-center">
            All responses are grounded in campus data. The AI will not invent locations or routes.
          </p>
        </div>
      </div>
    </div>
  );
};
