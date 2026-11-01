import React, { useEffect, useState } from 'react';
import { Volume2, Sparkles } from 'lucide-react';

export interface CampusGuideAvatarProps {
  isSpeaking: boolean;
  isListening: boolean;
  isThinking: boolean;
  currentText?: string;
  onToggleVoice?: () => void;
  voiceEnabled?: boolean;
}

export const CampusGuideAvatar: React.FC<CampusGuideAvatarProps> = ({
  isSpeaking,
  isListening,
  isThinking,
  currentText,
  onToggleVoice,
  voiceEnabled = true,
}) => {
  const [mouthPhase, setMouthPhase] = useState(0);

  // Rapid mouth animation cycle when speaking
  useEffect(() => {
    if (!isSpeaking) {
      setMouthPhase(0);
      return;
    }
    const interval = setInterval(() => {
      setMouthPhase(p => (p + 1) % 4);
    }, 120);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  // Determine avatar expression status text
  const statusLabel = isListening
    ? 'Listening to you...'
    : isThinking
    ? 'Thinking & finding route...'
    : isSpeaking
    ? 'Speaking to guide you...'
    : 'Ready to guide you';

  return (
    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-4 relative overflow-hidden border border-blue-700/50">
      {/* Background glow effects */}
      <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute left-1/3 -top-10 w-28 h-28 bg-indigo-500/15 rounded-full blur-xl pointer-events-none" />

      {/* ─── Animated SVG Avatar Character ─── */}
      <div className="relative shrink-0 flex items-center justify-center">
        {/* Glowing halo when speaking or listening */}
        <div
          className={`absolute -inset-1.5 rounded-full transition-all duration-300 ${
            isListening
              ? 'bg-red-500/40 animate-ping'
              : isSpeaking
              ? 'bg-emerald-400/30 animate-pulse'
              : isThinking
              ? 'bg-amber-400/25 animate-pulse'
              : 'bg-blue-400/10'
          }`}
        />

        <svg
          width="80"
          height="80"
          viewBox="0 0 100 100"
          className={`relative z-10 transition-transform duration-300 ${
            isSpeaking ? 'scale-105' : 'scale-100'
          }`}
        >
          <defs>
            <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="100%" stopColor="#fcd34d" />
            </linearGradient>
            <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Torso & Shoulders (Bobs when speaking) */}
          <g
            className="transition-transform duration-150"
            style={{
              transform: isSpeaking
                ? `translateY(${Math.sin(mouthPhase * Math.PI) * 1.5}px)`
                : isListening
                ? 'translateY(-1px) rotate(-1.5deg)'
                : 'translateY(0)',
              transformOrigin: '50% 90%',
            }}
          >
            {/* Guide Uniform Shirt */}
            <path
              d="M 22 92 C 22 75, 34 68, 50 68 C 66 68, 78 75, 78 92 Z"
              fill="url(#bodyGrad)"
              filter="url(#shadow)"
            />
            {/* White Collar */}
            <path d="M 42 68 L 50 78 L 58 68 Z" fill="#ffffff" />
            {/* Campus Guide Lanyard */}
            <path d="M 44 76 L 46 88 L 54 88 L 56 76" stroke="#f59e0b" strokeWidth="2" fill="none" />
            {/* Campus ID Badge */}
            <rect x="46" y="86" width="8" height="6" rx="1" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
          </g>

          {/* Head & Neck */}
          <g
            className="transition-transform duration-150"
            style={{
              transform: isSpeaking
                ? `translateY(${Math.sin(mouthPhase * Math.PI) * 1.2}px)`
                : isThinking
                ? 'rotate(2.5deg)'
                : isListening
                ? 'translateY(-0.5px) rotate(-2deg)'
                : 'none',
              transformOrigin: '50% 45%',
            }}
          >
            {/* Neck */}
            <rect x="46" y="58" width="8" height="12" rx="2" fill="url(#skinGrad)" />

            {/* Hair Back */}
            <ellipse cx="50" cy="40" rx="21" ry="22" fill="url(#hairGrad)" />

            {/* Face */}
            <ellipse cx="50" cy="42" rx="18" ry="19" fill="url(#skinGrad)" filter="url(#shadow)" />

            {/* Hair Front / Bangs */}
            <path
              d="M 32 36 C 36 26, 64 26, 68 36 C 64 32, 58 31, 50 33 C 42 31, 36 32, 32 36 Z"
              fill="url(#hairGrad)"
            />

            {/* Eyebrows */}
            <path
              d="M 37 35 Q 42 33 46 35"
              stroke="#0f172a"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
              style={{
                transform: isThinking ? 'translateY(-1.5px) rotate(-4deg)' : 'none',
                transformOrigin: '42px 35px',
              }}
            />
            <path
              d="M 54 35 Q 58 33 63 35"
              stroke="#0f172a"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
              style={{
                transform: isThinking ? 'translateY(-2px) rotate(4deg)' : 'none',
                transformOrigin: '58px 35px',
              }}
            />

            {/* Eyes */}
            {isThinking ? (
              // Looking up thoughtfully
              <>
                <ellipse cx="42" cy="40" rx="2.5" ry="3" fill="#1e293b" />
                <ellipse cx="58" cy="40" rx="2.5" ry="3" fill="#1e293b" />
                <circle cx="43" cy="39" r="0.8" fill="#ffffff" />
                <circle cx="59" cy="39" r="0.8" fill="#ffffff" />
              </>
            ) : (
              // Friendly open eyes
              <>
                <ellipse cx="42" cy="41" rx="2.6" ry="3.2" fill="#1e293b" />
                <ellipse cx="58" cy="41" rx="2.6" ry="3.2" fill="#1e293b" />
                <circle cx="43" cy="40" r="0.9" fill="#ffffff" />
                <circle cx="59" cy="40" r="0.9" fill="#ffffff" />
              </>
            )}

            {/* Cheeks Blush */}
            <circle cx="36" cy="45" r="2.5" fill="#f87171" opacity="0.4" />
            <circle cx="64" cy="45" r="2.5" fill="#f87171" opacity="0.4" />

            {/* Nose */}
            <path d="M 50 42 L 49 46 L 52 46" stroke="#d97706" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6" />

            {/* ── Dynamic Speaking Mouth ── */}
            {isSpeaking ? (
              mouthPhase === 0 ? (
                // Open smiling 'Ah' mouth with visible teeth
                <g>
                  <ellipse cx="50" cy="51.5" rx="5" ry="3.8" fill="#7f1d1d" />
                  <path d="M 46 49.5 Q 50 50 54 49.5" stroke="#ffffff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  <ellipse cx="50" cy="53" rx="3" ry="1.5" fill="#f87171" />
                </g>
              ) : mouthPhase === 1 ? (
                // Wide speaking mouth 'Oh'
                <g>
                  <ellipse cx="50" cy="51" rx="4" ry="4.5" fill="#7f1d1d" />
                  <ellipse cx="50" cy="52.5" rx="2.5" ry="1.8" fill="#f87171" />
                </g>
              ) : mouthPhase === 2 ? (
                // Slightly narrower 'Ee' mouth
                <g>
                  <ellipse cx="50" cy="51" rx="6" ry="2.5" fill="#7f1d1d" />
                  <path d="M 45 50.5 Q 50 51 55 50.5" stroke="#ffffff" strokeWidth="1.2" fill="none" />
                </g>
              ) : (
                // Round talking 'Oo'
                <g>
                  <circle cx="50" cy="51" r="3.2" fill="#7f1d1d" />
                  <circle cx="50" cy="51.5" r="1.6" fill="#f87171" />
                </g>
              )
            ) : isListening ? (
              // Attentive 'O' mouth
              <ellipse cx="50" cy="51" rx="2.5" ry="2" fill="#92400e" opacity="0.8" />
            ) : isThinking ? (
              // Slight thoughtful smile
              <path d="M 47 51 Q 50 52 54 50.5" stroke="#92400e" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            ) : (
              // Friendly calm smile
              <path d="M 45 50 Q 50 54 55 50" stroke="#92400e" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            )}
          </g>

          {/* Sound Waves when Speaking */}
          {isSpeaking && (
            <g opacity="0.85">
              <path
                d="M 72 40 C 76 43, 76 47, 72 50"
                stroke="#60a5fa"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                className="animate-pulse"
              />
              <path
                d="M 76 36 C 82 41, 82 49, 76 54"
                stroke="#93c5fd"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
                style={{ animation: 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite', animationDelay: '200ms' }}
              />
            </g>
          )}

          {/* Microphone Glow when Listening */}
          {isListening && (
            <g>
              <circle cx="80" cy="30" r="10" fill="#ef4444" opacity="0.2" className="animate-ping" />
              <circle cx="80" cy="30" r="6" fill="#ef4444" />
            </g>
          )}
        </svg>
      </div>

      {/* ─── Avatar Status & Live Speech Dialogue ─── */}
      <div className="flex-1 min-w-0 z-10">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-bold text-sm tracking-wide text-white flex items-center gap-1.5">
            <Sparkles size={14} className="text-yellow-400" />
            Aanya · AI Campus Guide
          </span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              isListening
                ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                : isSpeaking
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                : isThinking
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
            }`}
          >
            {statusLabel}
          </span>
        </div>

        {/* Live speech preview or helpful guidance */}
        <p className="text-xs text-blue-100/90 truncate leading-relaxed">
          {isListening ? (
            <span className="text-red-300 font-medium animate-pulse">
              Listening... Speak your destination or question now
            </span>
          ) : isSpeaking && currentText ? (
            <span className="text-emerald-200 italic font-medium">"{currentText}"</span>
          ) : isThinking ? (
            <span className="text-amber-200">Processing route calculation and checking building rules...</span>
          ) : (
            'Ask me anytime: "Take me to Mechanical Lab", "Where is the library?", or click the mic to speak!'
          )}
        </p>
      </div>

      {/* Voice Toggle Button inside Avatar card */}
      {onToggleVoice && (
        <button
          onClick={onToggleVoice}
          title={voiceEnabled ? 'Mute AI Guide voice' : 'Enable AI Guide voice'}
          className={`shrink-0 z-10 w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
            voiceEnabled
              ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-md'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
          }`}
        >
          <Volume2 size={16} className={isSpeaking ? 'animate-bounce text-emerald-300' : ''} />
        </button>
      )}
    </div>
  );
};
