/**
 * Preset 2D map elements catalog.
 * High-resolution SVG presets for both Outdoor and Indoor campus mapping.
 * Each element features scalable graphics with preserveAspectRatio="none"
 * so elements smoothly adapt to building and room footprints.
 */

export type ElementCategory = 'outdoor' | 'indoor';

export interface MapElement {
  key: string;
  label: string;
  category: ElementCategory;
  subcategory: string;
  /** Default canvas pixel width when dropped */
  defaultWidth: number;
  /** Default canvas pixel height when dropped */
  defaultHeight: number;
  /** Inline SVG markup string */
  svg: string;
}

export const MAP_ELEMENTS: MapElement[] = [
  {
    key: 'building_modern_corner_block',
    label: 'Modern 5-Story Corner Corporate Block',
    category: 'outdoor',
    subcategory: 'Buildings',
    defaultWidth: 140,
    defaultHeight: 155,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 155" preserveAspectRatio="none">
  <defs>
    <linearGradient id="mcb_glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#bfdbfe"/>
      <stop offset="60%" stop-color="#60a5fa"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <linearGradient id="mcb_white_facade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f1f5f9"/>
    </linearGradient>
  </defs>
  <!-- Ground plane shadow / footprint -->
  <polygon points="2,142 138,138 126,152 14,152" fill="#475569" opacity="0.45"/>
  <!-- Top penthouse mechanical setback -->
  <polygon points="34,8 70,2 118,24 64,28" fill="#475569"/>
  <polygon points="64,28 118,24 118,34 64,36" fill="#334155"/>
  <polygon points="34,8 64,28 64,36 34,20" fill="#64748b"/>
  <!-- Main Left (Side) Charcoal Volume -->
  <polygon points="24,36 64,30 64,124 24,126" fill="#64748b" stroke="#1e293b" stroke-width="1.5"/>
  <!-- Left Facade Window Bays -->
  <rect x="26" y="38" width="16" height="12" rx="1" fill="url(#mcb_glass)" stroke="#1e293b" stroke-width="1"/>
  <rect x="26" y="54" width="16" height="12" rx="1" fill="url(#mcb_glass)" stroke="#1e293b" stroke-width="1"/>
  <rect x="26" y="70" width="16" height="12" rx="1" fill="url(#mcb_glass)" stroke="#1e293b" stroke-width="1"/>
  <rect x="26" y="86" width="16" height="12" rx="1" fill="url(#mcb_glass)" stroke="#1e293b" stroke-width="1"/>
  <rect x="26" y="102" width="16" height="12" rx="1" fill="url(#mcb_glass)" stroke="#1e293b" stroke-width="1"/>
  <!-- Left Facade Secondary Window Column -->
  <rect x="44" y="38" width="16" height="12" rx="1" fill="url(#mcb_glass)" stroke="#1e293b" stroke-width="1"/>
  <rect x="44" y="54" width="16" height="12" rx="1" fill="url(#mcb_glass)" stroke="#1e293b" stroke-width="1"/>
  <rect x="44" y="70" width="16" height="12" rx="1" fill="url(#mcb_glass)" stroke="#1e293b" stroke-width="1"/>
  <rect x="44" y="86" width="16" height="12" rx="1" fill="url(#mcb_glass)" stroke="#1e293b" stroke-width="1"/>
  <rect x="44" y="102" width="16" height="12" rx="1" fill="url(#mcb_glass)" stroke="#1e293b" stroke-width="1"/>
  <!-- Main Frontal White Facade -->
  <polygon points="64,30 120,40 120,126 64,124" fill="url(#mcb_white_facade)" stroke="#1e293b" stroke-width="2"/>
  <!-- Front Horizontal Floor 5 Windows Ribbon -->
  <polygon points="72,42 114,48 114,57 72,52" fill="url(#mcb_glass)" stroke="#1e293b" stroke-width="1.2"/>
  <line x1="86" y1="44" x2="86" y2="53" stroke="#1e293b" stroke-width="1"/>
  <line x1="100" y1="46" x2="100" y2="55" stroke="#1e293b" stroke-width="1"/>
  <!-- Floor 4 Ribbon -->
  <polygon points="72,57 114,63 114,72 72,67" fill="url(#mcb_glass)" stroke="#1e293b" stroke-width="1.2"/>
  <line x1="86" y1="59" x2="86" y2="68" stroke="#1e293b" stroke-width="1"/>
  <line x1="100" y1="61" x2="100" y2="70" stroke="#1e293b" stroke-width="1"/>
  <!-- Floor 3 Ribbon -->
  <polygon points="72,72 114,78 114,87 72,82" fill="url(#mcb_glass)" stroke="#1e293b" stroke-width="1.2"/>
  <line x1="86" y1="74" x2="86" y2="83" stroke="#1e293b" stroke-width="1"/>
  <line x1="100" y1="76" x2="100" y2="85" stroke="#1e293b" stroke-width="1"/>
  <!-- Floor 2 Ribbon -->
  <polygon points="72,87 114,93 114,102 72,97" fill="url(#mcb_glass)" stroke="#1e293b" stroke-width="1.2"/>
  <line x1="86" y1="89" x2="86" y2="98" stroke="#1e293b" stroke-width="1"/>
  <line x1="100" y1="91" x2="100" y2="100" stroke="#1e293b" stroke-width="1"/>
  <!-- Floor 1 Ribbon -->
  <polygon points="72,102 114,108 114,117 72,112" fill="url(#mcb_glass)" stroke="#1e293b" stroke-width="1.2"/>
  <line x1="86" y1="104" x2="86" y2="113" stroke="#1e293b" stroke-width="1"/>
  <line x1="100" y1="106" x2="100" y2="115" stroke="#1e293b" stroke-width="1"/>
  <!-- Modern Cantilevered Entrance Canopy -->
  <polygon points="26,121 118,122 116,126 28,125" fill="#e2e8f0" stroke="#0f172a" stroke-width="1.5"/>
  <!-- Ground Floor Dark Plinth Base -->
  <polygon points="24,126 64,124 64,142 24,144" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
  <polygon points="64,124 120,126 120,140 64,142" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
  <!-- Ground Floor Double Glass Doors with Blue Tint -->
  <rect x="42" y="128" width="14" height="15" fill="url(#mcb_glass)" stroke="#0f172a" stroke-width="1.2"/>
  <line x1="49" y1="128" x2="49" y2="143" stroke="#0f172a" stroke-width="1"/>
  <rect x="92" y="127" width="14" height="14" fill="url(#mcb_glass)" stroke="#0f172a" stroke-width="1.2"/>
  <line x1="99" y1="127" x2="99" y2="141" stroke="#0f172a" stroke-width="1"/>
</svg>`,
  },
  {
    key: 'building_glass_ribbon_tower',
    label: 'Modern Glass Ribbon High-Rise',
    category: 'outdoor',
    subcategory: 'Buildings',
    defaultWidth: 150,
    defaultHeight: 130,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 130" preserveAspectRatio="none">
  <defs>
    <linearGradient id="grt_glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#a5f3fc"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
  </defs>
  <rect x="6" y="122" width="138" height="6" rx="3" fill="rgba(0,0,0,0.2)"/>
  <!-- White frame structure -->
  <rect x="14" y="14" width="122" height="108" rx="4" fill="#f8fafc" stroke="#334155" stroke-width="2"/>
  <!-- Continuous glass ribbon floors -->
  <rect x="20" y="22" width="110" height="14" rx="2" fill="url(#grt_glass)"/>
  <rect x="20" y="42" width="110" height="14" rx="2" fill="url(#grt_glass)"/>
  <rect x="20" y="62" width="110" height="14" rx="2" fill="url(#grt_glass)"/>
  <rect x="20" y="82" width="110" height="14" rx="2" fill="url(#grt_glass)"/>
  <!-- Vertical mullions -->
  <line x1="42" y1="22" x2="42" y2="96" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="14,6"/>
  <line x1="64" y1="22" x2="64" y2="96" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="14,6"/>
  <line x1="86" y1="22" x2="86" y2="96" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="14,6"/>
  <line x1="108" y1="22" x2="108" y2="96" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="14,6"/>
  <!-- Ground floor entrance canopy & lobby -->
  <rect x="50" y="100" width="50" height="22" rx="2" fill="#0f172a"/>
  <rect x="56" y="104" width="38" height="18" fill="url(#grt_glass)"/>
  <line x1="75" y1="104" x2="75" y2="122" stroke="#ffffff" stroke-width="1.5"/>
  <rect x="44" y="98" width="62" height="4" rx="1" fill="#38bdf8"/>
</svg>`,
  },
  {
    key: 'building_contemporary_faculty',
    label: 'Contemporary Faculty Complex',
    category: 'outdoor',
    subcategory: 'Buildings',
    defaultWidth: 160,
    defaultHeight: 110,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 110" preserveAspectRatio="none">
  <rect x="8" y="102" width="144" height="6" rx="3" fill="rgba(0,0,0,0.18)"/>
  <!-- Dual volume structure -->
  <rect x="12" y="18" width="70" height="84" rx="3" fill="#e2e8f0" stroke="#1e293b" stroke-width="2"/>
  <rect x="78" y="10" width="70" height="92" rx="3" fill="#334155" stroke="#0f172a" stroke-width="2"/>
  <!-- Windows on left volume -->
  <rect x="20" y="28" width="22" height="16" fill="#38bdf8"/>
  <rect x="50" y="28" width="22" height="16" fill="#38bdf8"/>
  <rect x="20" y="52" width="22" height="16" fill="#38bdf8"/>
  <rect x="50" y="52" width="22" height="16" fill="#38bdf8"/>
  <rect x="20" y="76" width="52" height="24" fill="#0284c7"/>
  <!-- Horizontal glass bands on right volume -->
  <rect x="86" y="20" width="54" height="12" fill="#93c5fd"/>
  <rect x="86" y="38" width="54" height="12" fill="#93c5fd"/>
  <rect x="86" y="56" width="54" height="12" fill="#93c5fd"/>
  <rect x="86" y="74" width="54" height="12" fill="#93c5fd"/>
  <!-- Ground floor entrance -->
  <rect x="88" y="90" width="50" height="12" fill="#0f172a"/>
  <!-- Architectural projecting roof slab -->
  <rect x="74" y="6" width="78" height="6" rx="2" fill="#0f172a"/>
</svg>`,
  },

  {
    key: 'building_office',
    label: 'Modern Office Building',
    category: 'outdoor',
    subcategory: 'Buildings',
    defaultWidth: 140,
    defaultHeight: 110,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 110" preserveAspectRatio="none">
  <defs>
    <linearGradient id="off_facade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
    <linearGradient id="off_glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#93c5fd"/>
      <stop offset="50%" stop-color="#60a5fa"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
  </defs>
  <ellipse cx="70" cy="106" rx="64" ry="4" fill="rgba(0,0,0,0.18)"/>
  <rect x="10" y="22" width="120" height="84" rx="4" fill="url(#off_facade)" stroke="#1e293b" stroke-width="2"/>
  <rect x="6" y="16" width="128" height="12" rx="2" fill="#1e293b"/>
  <!-- Top parapet vents -->
  <line x1="20" y1="22" x2="120" y2="22" stroke="#64748b" stroke-width="2"/>
  <!-- Windows Grid -->
  <rect x="18" y="32" width="22" height="15" rx="2" fill="url(#off_glass)"/>
  <rect x="46" y="32" width="22" height="15" rx="2" fill="url(#off_glass)"/>
  <rect x="74" y="32" width="22" height="15" rx="2" fill="url(#off_glass)"/>
  <rect x="102" y="32" width="20" height="15" rx="2" fill="url(#off_glass)"/>
  <rect x="18" y="52" width="22" height="15" rx="2" fill="url(#off_glass)"/>
  <rect x="46" y="52" width="22" height="15" rx="2" fill="url(#off_glass)"/>
  <rect x="74" y="52" width="22" height="15" rx="2" fill="url(#off_glass)"/>
  <rect x="102" y="52" width="20" height="15" rx="2" fill="url(#off_glass)"/>
  <!-- Ground Floor Entrance & Canopy -->
  <rect x="18" y="74" width="22" height="20" rx="2" fill="url(#off_glass)"/>
  <rect x="102" y="74" width="20" height="20" rx="2" fill="url(#off_glass)"/>
  <rect x="50" y="70" width="40" height="36" rx="2" fill="#0f172a"/>
  <rect x="46" y="68" width="48" height="6" rx="2" fill="#3b82f6"/>
  <rect x="54" y="76" width="14" height="28" rx="1" fill="#60a5fa" opacity="0.8"/>
  <rect x="72" y="76" width="14" height="28" rx="1" fill="#60a5fa" opacity="0.8"/>
  <line x1="69" y1="76" x2="69" y2="104" stroke="#0f172a" stroke-width="2"/>
</svg>`,
  },
  {
    key: 'building_academic',
    label: 'Academic & Lecture Hall',
    category: 'outdoor',
    subcategory: 'Buildings',
    defaultWidth: 140,
    defaultHeight: 115,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 115" preserveAspectRatio="none">
  <ellipse cx="70" cy="111" rx="65" ry="4" fill="rgba(0,0,0,0.18)"/>
  <rect x="8" y="38" width="124" height="72" rx="3" fill="#e0e7ff" stroke="#4338ca" stroke-width="2"/>
  <!-- Classical Roof & Pediment -->
  <polygon points="10,38 70,12 130,38" fill="#4f46e5" stroke="#3730a3" stroke-width="2"/>
  <polygon points="30,38 70,20 110,38" fill="#6366f1"/>
  <!-- Columns -->
  <rect x="22" y="44" width="8" height="50" rx="2" fill="#ffffff" stroke="#c7d2fe"/>
  <rect x="42" y="44" width="8" height="50" rx="2" fill="#ffffff" stroke="#c7d2fe"/>
  <rect x="90" y="44" width="8" height="50" rx="2" fill="#ffffff" stroke="#c7d2fe"/>
  <rect x="110" y="44" width="8" height="50" rx="2" fill="#ffffff" stroke="#c7d2fe"/>
  <!-- Center Main Portal -->
  <rect x="56" y="58" width="28" height="48" rx="14" fill="#1e1b4b"/>
  <rect x="59" y="70" width="10" height="34" rx="1" fill="#818cf8"/>
  <rect x="71" y="70" width="10" height="34" rx="1" fill="#818cf8"/>
  <!-- Steps -->
  <rect x="46" y="104" width="48" height="5" rx="1" fill="#c7d2fe"/>
  <rect x="42" y="108" width="56" height="4" rx="1" fill="#a5b4fc"/>
</svg>`,
  },
  {
    key: 'building_lab',
    label: 'Science & Tech Lab',
    category: 'outdoor',
    subcategory: 'Buildings',
    defaultWidth: 130,
    defaultHeight: 100,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 100" preserveAspectRatio="none">
  <ellipse cx="65" cy="96" rx="60" ry="4" fill="rgba(0,0,0,0.18)"/>
  <!-- Sawtooth Industrial Roof -->
  <polygon points="10,32 35,12 35,32" fill="#059669"/>
  <polygon points="35,32 60,12 60,32" fill="#059669"/>
  <polygon points="60,32 85,12 85,32" fill="#059669"/>
  <polygon points="85,32 110,12 110,32" fill="#059669"/>
  <rect x="10" y="32" width="110" height="64" rx="3" fill="#10b981" stroke="#047857" stroke-width="2"/>
  <!-- Lab Observation Windows -->
  <rect x="20" y="40" width="24" height="24" rx="3" fill="#d1fae5" stroke="#059669" stroke-width="1.5"/>
  <rect x="52" y="40" width="26" height="24" rx="3" fill="#d1fae5" stroke="#059669" stroke-width="1.5"/>
  <rect x="86" y="40" width="24" height="24" rx="3" fill="#d1fae5" stroke="#059669" stroke-width="1.5"/>
  <!-- Lab Entrance Door -->
  <rect x="52" y="72" width="26" height="24" rx="2" fill="#064e3b"/>
  <rect x="55" y="76" width="9" height="18" rx="1" fill="#6ee7b7" opacity="0.8"/>
  <rect x="66" y="76" width="9" height="18" rx="1" fill="#6ee7b7" opacity="0.8"/>
</svg>`,
  },
  {
    key: 'building_hostel',
    label: 'Student Dormitory / Hostel',
    category: 'outdoor',
    subcategory: 'Buildings',
    defaultWidth: 120,
    defaultHeight: 110,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 110" preserveAspectRatio="none">
  <ellipse cx="60" cy="106" rx="55" ry="4" fill="rgba(0,0,0,0.18)"/>
  <rect x="10" y="26" width="100" height="80" rx="3" fill="#f87171" stroke="#b91c1c" stroke-width="2"/>
  <!-- Hip Roof -->
  <polygon points="5,26 60,6 115,26" fill="#dc2626"/>
  <!-- Room Windows Row 1 -->
  <rect x="20" y="34" width="14" height="12" rx="1" fill="#fef2f2"/>
  <rect x="42" y="34" width="14" height="12" rx="1" fill="#fef2f2"/>
  <rect x="64" y="34" width="14" height="12" rx="1" fill="#fef2f2"/>
  <rect x="86" y="34" width="14" height="12" rx="1" fill="#fef2f2"/>
  <!-- Room Windows Row 2 -->
  <rect x="20" y="52" width="14" height="12" rx="1" fill="#fef2f2"/>
  <rect x="42" y="52" width="14" height="12" rx="1" fill="#fef2f2"/>
  <rect x="64" y="52" width="14" height="12" rx="1" fill="#fef2f2"/>
  <rect x="86" y="52" width="14" height="12" rx="1" fill="#fef2f2"/>
  <!-- Room Windows Row 3 -->
  <rect x="20" y="70" width="14" height="12" rx="1" fill="#fef2f2"/>
  <rect x="86" y="70" width="14" height="12" rx="1" fill="#fef2f2"/>
  <!-- Entrance -->
  <rect x="46" y="78" width="28" height="28" rx="2" fill="#7f1d1d"/>
  <rect x="49" y="82" width="10" height="22" rx="1" fill="#fca5a5"/>
  <rect x="61" y="82" width="10" height="22" rx="1" fill="#fca5a5"/>
</svg>`,
  },
  {
    key: 'building_library',
    label: 'Campus Central Library',
    category: 'outdoor',
    subcategory: 'Buildings',
    defaultWidth: 150,
    defaultHeight: 115,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 115" preserveAspectRatio="none">
  <ellipse cx="75" cy="111" rx="70" ry="4" fill="rgba(0,0,0,0.18)"/>
  <rect x="12" y="36" width="126" height="74" rx="4" fill="#0284c7" stroke="#0369a1" stroke-width="2"/>
  <!-- Central Glass Atrium Dome -->
  <path d="M50 36 A25 25 0 0 1 100 36 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="2"/>
  <line x1="75" y1="12" x2="75" y2="36" stroke="#ffffff" stroke-width="1.5"/>
  <line x1="60" y1="18" x2="60" y2="36" stroke="#ffffff" stroke-width="1"/>
  <line x1="90" y1="18" x2="90" y2="36" stroke="#ffffff" stroke-width="1"/>
  <!-- Tall Reading Room Windows -->
  <rect x="22" y="46" width="18" height="42" rx="3" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/>
  <rect x="110" y="46" width="18" height="42" rx="3" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/>
  <!-- Revolving / Glass Main Entry -->
  <rect x="55" y="60" width="40" height="48" rx="4" fill="#0c4a6e"/>
  <circle cx="75" cy="74" r="10" fill="#38bdf8" opacity="0.7"/>
  <rect x="58" y="82" width="16" height="26" rx="2" fill="#7dd3fc"/>
  <rect x="76" y="82" width="16" height="26" rx="2" fill="#7dd3fc"/>
</svg>`,
  },
  {
    key: 'building_auditorium',
    label: 'Grand Auditorium & Arena',
    category: 'outdoor',
    subcategory: 'Buildings',
    defaultWidth: 160,
    defaultHeight: 110,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 110" preserveAspectRatio="none">
  <ellipse cx="80" cy="106" rx="74" ry="4" fill="rgba(0,0,0,0.18)"/>
  <!-- Curved Arena Facade -->
  <path d="M15 102 C15 30 145 30 145 102 Z" fill="#8b5cf6" stroke="#6d28d9" stroke-width="2.5"/>
  <path d="M30 102 C30 50 130 50 130 102 Z" fill="#a78bfa" opacity="0.6"/>
  <!-- Slanted Roof Ribs -->
  <line x1="80" y1="36" x2="40" y2="102" stroke="#4c1d95" stroke-width="2"/>
  <line x1="80" y1="36" x2="80" y2="102" stroke="#4c1d95" stroke-width="2"/>
  <line x1="80" y1="36" x2="120" y2="102" stroke="#4c1d95" stroke-width="2"/>
  <!-- Entrance Canopies -->
  <rect x="55" y="78" width="50" height="26" rx="4" fill="#2e1065"/>
  <rect x="60" y="84" width="18" height="20" rx="2" fill="#c4b5fd"/>
  <rect x="82" y="84" width="18" height="20" rx="2" fill="#c4b5fd"/>
</svg>`,
  },
  {
    key: 'building_cafeteria',
    label: 'Cafeteria & Dining Hall',
    category: 'outdoor',
    subcategory: 'Buildings',
    defaultWidth: 135,
    defaultHeight: 100,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 135 100" preserveAspectRatio="none">
  <ellipse cx="67" cy="96" rx="62" ry="4" fill="rgba(0,0,0,0.18)"/>
  <rect x="10" y="32" width="115" height="64" rx="3" fill="#f97316" stroke="#c2410c" stroke-width="2"/>
  <!-- Sloped Tile Roof -->
  <polygon points="5,32 67,14 130,32" fill="#ea580c"/>
  <!-- Picture Glass Windows -->
  <rect x="18" y="42" width="28" height="26" rx="2" fill="#ffedd5" stroke="#c2410c" stroke-width="1"/>
  <line x1="32" y1="42" x2="32" y2="68" stroke="#f97316" stroke-width="1"/>
  <rect x="88" y="42" width="28" height="26" rx="2" fill="#ffedd5" stroke="#c2410c" stroke-width="1"/>
  <line x1="102" y1="42" x2="102" y2="68" stroke="#f97316" stroke-width="1"/>
  <!-- Dining Entrance -->
  <rect x="54" y="60" width="28" height="36" rx="2" fill="#7c2d12"/>
  <rect x="57" y="66" width="10" height="28" rx="1" fill="#fed7aa"/>
  <rect x="69" y="66" width="10" height="28" rx="1" fill="#fed7aa"/>
  <!-- Fork & Spoon Symbol -->
  <circle cx="68" cy="46" r="8" fill="#ffffff"/>
  <text x="68" y="50" font-size="10" text-anchor="middle" fill="#ea580c">🍴</text>
</svg>`,
  },
  {
    key: 'building_admin',
    label: 'Administration Block',
    category: 'outdoor',
    subcategory: 'Buildings',
    defaultWidth: 140,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 120" preserveAspectRatio="none">
  <ellipse cx="70" cy="116" rx="66" ry="4" fill="rgba(0,0,0,0.18)"/>
  <!-- Main Wings -->
  <rect x="10" y="48" width="120" height="68" rx="3" fill="#64748b" stroke="#334155" stroke-width="2"/>
  <!-- Center Tower with Clock -->
  <rect x="50" y="16" width="40" height="100" rx="2" fill="#475569" stroke="#1e293b" stroke-width="2"/>
  <polygon points="50,16 70,2 90,16" fill="#1e293b"/>
  <!-- Clock Face -->
  <circle cx="70" cy="32" r="9" fill="#ffffff" stroke="#1e293b" stroke-width="1.5"/>
  <line x1="70" y1="32" x2="70" y2="26" stroke="#0f172a" stroke-width="1.5"/>
  <line x1="70" y1="32" x2="75" y2="32" stroke="#0f172a" stroke-width="1.5"/>
  <!-- Windows -->
  <rect x="18" y="58" width="14" height="18" rx="1" fill="#cbd5e1"/>
  <rect x="34" y="58" width="14" height="18" rx="1" fill="#cbd5e1"/>
  <rect x="92" y="58" width="14" height="18" rx="1" fill="#cbd5e1"/>
  <rect x="108" y="58" width="14" height="18" rx="1" fill="#cbd5e1"/>
  <!-- Entrance Arch -->
  <path d="M58 116 L58 86 A12 12 0 0 1 82 86 L82 116 Z" fill="#0f172a"/>
</svg>`,
  },
  {
    key: 'tree_round',
    label: 'Round Deciduous Tree',
    category: 'outdoor',
    subcategory: 'Nature',
    defaultWidth: 65,
    defaultHeight: 65,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 65 65" preserveAspectRatio="none">
  <ellipse cx="32" cy="61" rx="16" ry="4" fill="rgba(0,0,0,0.18)"/>
  <rect x="28" y="44" width="9" height="18" rx="3" fill="#78350f"/>
  <circle cx="32" cy="36" r="22" fill="#15803d"/>
  <circle cx="32" cy="30" r="18" fill="#16a34a"/>
  <circle cx="32" cy="24" r="14" fill="#22c55e"/>
  <ellipse cx="26" cy="18" rx="6" ry="4" fill="rgba(255,255,255,0.2)"/>
</svg>`,
  },
  {
    key: 'tree_pine',
    label: 'Evergreen Pine Tree',
    category: 'outdoor',
    subcategory: 'Nature',
    defaultWidth: 60,
    defaultHeight: 75,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 75" preserveAspectRatio="none">
  <ellipse cx="30" cy="71" rx="14" ry="4" fill="rgba(0,0,0,0.18)"/>
  <rect x="26" y="56" width="8" height="16" rx="2" fill="#582900"/>
  <polygon points="30,4 50,32 10,32" fill="#14532d"/>
  <polygon points="30,16 52,44 8,44" fill="#15803d"/>
  <polygon points="30,28 54,58 6,58" fill="#16a34a"/>
  <ellipse cx="24" cy="16" rx="4" ry="3" fill="rgba(255,255,255,0.2)"/>
</svg>`,
  },
  {
    key: 'tree_palm',
    label: 'Tropical Palm Tree',
    category: 'outdoor',
    subcategory: 'Nature',
    defaultWidth: 70,
    defaultHeight: 85,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 85" preserveAspectRatio="none">
  <ellipse cx="35" cy="81" rx="14" ry="3" fill="rgba(0,0,0,0.18)"/>
  <path d="M35 78 Q30 52 32 30 Q33 16 35 12" stroke="#854d0e" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M35 12 Q12 0 4 10" stroke="#16a34a" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <path d="M35 12 Q56 2 66 12" stroke="#15803d" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <path d="M35 12 Q18 22 8 20" stroke="#22c55e" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M35 12 Q48 22 60 18" stroke="#22c55e" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="32" cy="14" r="3" fill="#713f12"/>
  <circle cx="37" cy="16" r="2.5" fill="#854d0e"/>
</svg>`,
  },
  {
    key: 'tree_flowering',
    label: 'Flowering Blossom Tree',
    category: 'outdoor',
    subcategory: 'Nature',
    defaultWidth: 65,
    defaultHeight: 65,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 65 65" preserveAspectRatio="none">
  <ellipse cx="32" cy="61" rx="15" ry="4" fill="rgba(0,0,0,0.18)"/>
  <rect x="28" y="44" width="8" height="18" rx="2" fill="#78350f"/>
  <circle cx="32" cy="34" r="22" fill="#db2777"/>
  <circle cx="32" cy="28" r="18" fill="#ec4899"/>
  <circle cx="32" cy="22" r="14" fill="#f472b6"/>
  <!-- Flower Petal Accents -->
  <circle cx="24" cy="20" r="3" fill="#ffffff" opacity="0.8"/>
  <circle cx="38" cy="24" r="3" fill="#ffffff" opacity="0.8"/>
  <circle cx="28" cy="34" r="3" fill="#ffffff" opacity="0.8"/>
  <circle cx="42" cy="34" r="3" fill="#ffffff" opacity="0.8"/>
</svg>`,
  },
  {
    key: 'tree_autumn',
    label: 'Autumn Maple Tree',
    category: 'outdoor',
    subcategory: 'Nature',
    defaultWidth: 65,
    defaultHeight: 65,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 65 65" preserveAspectRatio="none">
  <ellipse cx="32" cy="61" rx="15" ry="4" fill="rgba(0,0,0,0.18)"/>
  <rect x="28" y="44" width="8" height="18" rx="2" fill="#78350f"/>
  <circle cx="32" cy="34" r="22" fill="#c2410c"/>
  <circle cx="32" cy="28" r="18" fill="#ea580c"/>
  <circle cx="32" cy="22" r="14" fill="#f97316"/>
  <circle cx="32" cy="18" r="10" fill="#facc15"/>
</svg>`,
  },
  {
    key: 'bush',
    label: 'Green Shrub / Hedge',
    category: 'outdoor',
    subcategory: 'Nature',
    defaultWidth: 60,
    defaultHeight: 40,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40" preserveAspectRatio="none">
  <ellipse cx="30" cy="38" rx="26" ry="3" fill="rgba(0,0,0,0.15)"/>
  <ellipse cx="30" cy="26" rx="26" ry="15" fill="#15803d"/>
  <ellipse cx="16" cy="24" rx="14" ry="12" fill="#16a34a"/>
  <ellipse cx="44" cy="24" rx="14" ry="12" fill="#16a34a"/>
  <ellipse cx="30" cy="20" rx="16" ry="11" fill="#22c55e"/>
</svg>`,
  },
  {
    key: 'grass_patch',
    label: 'Lawn Grass Patch',
    category: 'outdoor',
    subcategory: 'Nature',
    defaultWidth: 100,
    defaultHeight: 70,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 70" preserveAspectRatio="none">
  <ellipse cx="50" cy="38" rx="46" ry="26" fill="#86efac"/>
  <ellipse cx="50" cy="36" rx="40" ry="22" fill="#4ade80"/>
  <!-- Grass Sprigs -->
  <line x1="26" y1="36" x2="24" y2="24" stroke="#16a34a" stroke-width="2" stroke-linecap="round"/>
  <line x1="46" y1="30" x2="44" y2="18" stroke="#16a34a" stroke-width="2" stroke-linecap="round"/>
  <line x1="70" y1="34" x2="72" y2="22" stroke="#16a34a" stroke-width="2" stroke-linecap="round"/>
</svg>`,
  },
  {
    key: 'pond',
    label: 'Water Pond & Lily Pads',
    category: 'outdoor',
    subcategory: 'Nature',
    defaultWidth: 120,
    defaultHeight: 80,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" preserveAspectRatio="none">
  <!-- Bank -->
  <path d="M10 40 Q20 10 60 15 Q105 10 115 45 Q110 75 60 72 Q15 75 10 40 Z" fill="#bbf7d0"/>
  <!-- Water -->
  <path d="M14 40 Q22 14 60 18 Q100 14 110 45 Q105 70 60 68 Q18 70 14 40 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="1.5"/>
  <!-- Water Highlights -->
  <path d="M30 32 Q50 28 75 32" stroke="#bae6fd" stroke-width="2" fill="none" opacity="0.8"/>
  <path d="M45 52 Q65 48 90 52" stroke="#bae6fd" stroke-width="2" fill="none" opacity="0.8"/>
  <!-- Lily Pads -->
  <circle cx="36" cy="44" r="6" fill="#15803d"/>
  <circle cx="82" cy="36" r="7" fill="#15803d"/>
  <circle cx="70" cy="56" r="5" fill="#16a34a"/>
</svg>`,
  },
  {
    key: 'footpath_paved_walkway',
    label: 'Paved Pedestrian Walkway',
    category: 'outdoor',
    subcategory: 'Roads & Paths',
    defaultWidth: 150,
    defaultHeight: 40,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 40" preserveAspectRatio="none">
  <!-- Concrete Paver Walkway with Kerbs -->
  <rect x="0" y="0" width="150" height="40" fill="#e2e8f0"/>
  <!-- Top and Bottom Granite Kerbs -->
  <rect x="0" y="0" width="150" height="4" fill="#94a3b8"/>
  <rect x="0" y="36" width="150" height="4" fill="#94a3b8"/>
  <!-- Paver Joints -->
  <line x1="25" y1="4" x2="25" y2="36" stroke="#cbd5e1" stroke-width="1.5"/>
  <line x1="50" y1="4" x2="50" y2="36" stroke="#cbd5e1" stroke-width="1.5"/>
  <line x1="75" y1="4" x2="75" y2="36" stroke="#cbd5e1" stroke-width="1.5"/>
  <line x1="100" y1="4" x2="100" y2="36" stroke="#cbd5e1" stroke-width="1.5"/>
  <line x1="125" y1="4" x2="125" y2="36" stroke="#cbd5e1" stroke-width="1.5"/>
  <!-- Longitudinal Center Joint -->
  <line x1="0" y1="20" x2="150" y2="20" stroke="#cbd5e1" stroke-width="1.5"/>
  <rect x="0" y="0" width="150" height="40" fill="none" stroke="#64748b" stroke-width="1.5"/>
</svg>`,
  },
  {
    key: 'footpath_brick_cobblestone',
    label: 'Red Brick Cobblestone Footpath',
    category: 'outdoor',
    subcategory: 'Roads & Paths',
    defaultWidth: 150,
    defaultHeight: 40,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 40" preserveAspectRatio="none">
  <!-- Herringbone/Staggered Brick Footpath -->
  <rect x="0" y="0" width="150" height="40" fill="#c2410c"/>
  <rect x="0" y="0" width="150" height="3" fill="#7c2d12"/>
  <rect x="0" y="37" width="150" height="3" fill="#7c2d12"/>
  <line x1="0" y1="12" x2="150" y2="12" stroke="#ea580c" stroke-width="1"/>
  <line x1="0" y1="20" x2="150" y2="20" stroke="#ea580c" stroke-width="1"/>
  <line x1="0" y1="28" x2="150" y2="28" stroke="#ea580c" stroke-width="1"/>
  <!-- Cross Joints -->
  <line x1="15" y1="3" x2="15" y2="12" stroke="#ea580c" stroke-width="1"/>
  <line x1="45" y1="3" x2="45" y2="12" stroke="#ea580c" stroke-width="1"/>
  <line x1="75" y1="3" x2="75" y2="12" stroke="#ea580c" stroke-width="1"/>
  <line x1="105" y1="3" x2="105" y2="12" stroke="#ea580c" stroke-width="1"/>
  <line x1="135" y1="3" x2="135" y2="12" stroke="#ea580c" stroke-width="1"/>
  <line x1="30" y1="12" x2="30" y2="20" stroke="#ea580c" stroke-width="1"/>
  <line x1="60" y1="12" x2="60" y2="20" stroke="#ea580c" stroke-width="1"/>
  <line x1="90" y1="12" x2="90" y2="20" stroke="#ea580c" stroke-width="1"/>
  <line x1="120" y1="12" x2="120" y2="20" stroke="#ea580c" stroke-width="1"/>
  <line x1="15" y1="20" x2="15" y2="28" stroke="#ea580c" stroke-width="1"/>
  <line x1="45" y1="20" x2="45" y2="28" stroke="#ea580c" stroke-width="1"/>
  <line x1="75" y1="20" x2="75" y2="28" stroke="#ea580c" stroke-width="1"/>
  <line x1="105" y1="20" x2="105" y2="28" stroke="#ea580c" stroke-width="1"/>
  <line x1="135" y1="20" x2="135" y2="28" stroke="#ea580c" stroke-width="1"/>
  <rect x="0" y="0" width="150" height="40" fill="none" stroke="#7c2d12" stroke-width="1.5"/>
</svg>`,
  },
  {
    key: 'footpath_tree_lined',
    label: 'Tree-Lined Campus Avenue Walkway',
    category: 'outdoor',
    subcategory: 'Roads & Paths',
    defaultWidth: 160,
    defaultHeight: 65,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 65" preserveAspectRatio="none">
  <!-- Top Grass Verge -->
  <rect x="0" y="0" width="160" height="15" fill="#4ade80"/>
  <!-- Trees on top verge -->
  <circle cx="25" cy="8" r="6" fill="#15803d"/>
  <circle cx="65" cy="8" r="6" fill="#15803d"/>
  <circle cx="105" cy="8" r="6" fill="#15803d"/>
  <circle cx="145" cy="8" r="6" fill="#15803d"/>
  <!-- Center Paved Walkway -->
  <rect x="0" y="15" width="160" height="35" fill="#f1f5f9"/>
  <rect x="0" y="15" width="160" height="2" fill="#94a3b8"/>
  <rect x="0" y="48" width="160" height="2" fill="#94a3b8"/>
  <line x1="40" y1="17" x2="40" y2="48" stroke="#cbd5e1" stroke-width="1.5"/>
  <line x1="80" y1="17" x2="80" y2="48" stroke="#cbd5e1" stroke-width="1.5"/>
  <line x1="120" y1="17" x2="120" y2="48" stroke="#cbd5e1" stroke-width="1.5"/>
  <!-- Bottom Grass Verge -->
  <rect x="0" y="50" width="160" height="15" fill="#4ade80"/>
  <circle cx="25" cy="57" r="6" fill="#15803d"/>
  <circle cx="65" cy="57" r="6" fill="#15803d"/>
  <circle cx="105" cy="57" r="6" fill="#15803d"/>
  <circle cx="145" cy="57" r="6" fill="#15803d"/>
</svg>`,
  },
  {
    key: 'footpath_turn_90',
    label: 'Curved 90° Footpath Turn',
    category: 'outdoor',
    subcategory: 'Roads & Paths',
    defaultWidth: 80,
    defaultHeight: 80,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" preserveAspectRatio="none">
  <!-- 90 Degree Walkway Bend -->
  <path d="M 0,0 L 40,0 Q 80,0 80,40 L 80,80 L 40,80 Q 40,40 0,40 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
  <path d="M 0,20 Q 60,20 60,80" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,4" fill="none"/>
</svg>`,
  },
  {
    key: 'footpath_t_junction',
    label: 'Footpath T-Junction',
    category: 'outdoor',
    subcategory: 'Roads & Paths',
    defaultWidth: 100,
    defaultHeight: 70,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 70" preserveAspectRatio="none">
  <!-- Horizontal Main Walkway -->
  <rect x="0" y="0" width="100" height="35" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
  <!-- Branching Walkway -->
  <rect x="32" y="35" width="36" height="35" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
  <!-- Seamless opening at junction -->
  <rect x="33" y="32" width="34" height="6" fill="#e2e8f0"/>
  <line x1="32" y1="35" x2="32" y2="70" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="68" y1="35" x2="68" y2="70" stroke="#94a3b8" stroke-width="1.5"/>
</svg>`,
  },
  {
    key: 'footpath_tactile_guiding',
    label: 'Tactile ADA Guiding Footpath',
    category: 'outdoor',
    subcategory: 'Roads & Paths',
    defaultWidth: 150,
    defaultHeight: 40,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 40" preserveAspectRatio="none">
  <!-- Concrete Base Walkway -->
  <rect width="150" height="40" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
  <!-- Central Yellow Tactile Warning Strip -->
  <rect x="0" y="12" width="150" height="16" fill="#facc15" stroke="#eab308" stroke-width="1"/>
  <!-- Tactile Raised Directional Ribs -->
  <line x1="0" y1="16" x2="150" y2="16" stroke="#ca8a04" stroke-width="1.5"/>
  <line x1="0" y1="20" x2="150" y2="20" stroke="#ca8a04" stroke-width="1.5"/>
  <line x1="0" y1="24" x2="150" y2="24" stroke="#ca8a04" stroke-width="1.5"/>
</svg>`,
  },
  {
    key: 'footpath_garden_stepping',
    label: 'Garden Stepping Stone Path',
    category: 'outdoor',
    subcategory: 'Roads & Paths',
    defaultWidth: 160,
    defaultHeight: 45,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 45" preserveAspectRatio="none">
  <!-- Grass Background -->
  <rect width="160" height="45" fill="#4ade80" rx="3"/>
  <!-- Organic Flagstones -->
  <ellipse cx="20" cy="22" rx="14" ry="12" fill="#d6d3d1" stroke="#78716c" stroke-width="1.5"/>
  <ellipse cx="52" cy="18" rx="13" ry="11" fill="#e7e5e4" stroke="#78716c" stroke-width="1.5"/>
  <ellipse cx="84" cy="26" rx="15" ry="12" fill="#d6d3d1" stroke="#78716c" stroke-width="1.5"/>
  <ellipse cx="116" cy="19" rx="14" ry="11" fill="#e7e5e4" stroke="#78716c" stroke-width="1.5"/>
  <ellipse cx="145" cy="24" rx="12" ry="10" fill="#d6d3d1" stroke="#78716c" stroke-width="1.5"/>
</svg>`,
  },
  {
    key: 'road_straight',
    label: 'Straight Road (Extendable)',
    category: 'outdoor',
    subcategory: 'Roads & Paths',
    defaultWidth: 180,
    defaultHeight: 50,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 50" preserveAspectRatio="none">
  <!-- Road Surface -->
  <rect x="0" y="4" width="180" height="42" fill="#374151"/>
  <!-- Curbs -->
  <rect x="0" y="2" width="180" height="4" fill="#9ca3af"/>
  <rect x="0" y="44" width="180" height="4" fill="#9ca3af"/>
  <!-- White Edge Lines -->
  <line x1="0" y1="8" x2="180" y2="8" stroke="#ffffff" stroke-width="1.5"/>
  <line x1="0" y1="42" x2="180" y2="42" stroke="#ffffff" stroke-width="1.5"/>
  <!-- Center Dashes (Yellow) -->
  <line x1="0" y1="25" x2="180" y2="25" stroke="#facc15" stroke-width="3" stroke-dasharray="16 10"/>
</svg>`,
  },
  {
    key: 'road_bend_90',
    label: '90° Curved Road (Bendable)',
    category: 'outdoor',
    subcategory: 'Roads & Paths',
    defaultWidth: 120,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" preserveAspectRatio="none">
  <!-- Outer Curb Arc -->
  <path d="M0 45 A75 75 0 0 1 75 120 L120 120 A120 120 0 0 0 0 0 Z" fill="#374151"/>
  <!-- Curbs -->
  <path d="M0 2 A118 118 0 0 1 118 120" stroke="#9ca3af" stroke-width="4" fill="none"/>
  <path d="M0 45 A75 75 0 0 1 75 120" stroke="#9ca3af" stroke-width="4" fill="none"/>
  <!-- Center Dashed Yellow Line -->
  <path d="M0 24 A96 96 0 0 1 96 120" stroke="#facc15" stroke-width="3" stroke-dasharray="12 8" fill="none"/>
</svg>`,
  },
  {
    key: 'road_s_curve',
    label: 'Winding S-Curve Road',
    category: 'outdoor',
    subcategory: 'Roads & Paths',
    defaultWidth: 180,
    defaultHeight: 90,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 90" preserveAspectRatio="none">
  <!-- S-Curve Road Surface via thick stroke -->
  <path d="M0 70 Q45 70 90 45 T180 20" stroke="#374151" stroke-width="42" fill="none"/>
  <!-- Curbs -->
  <path d="M0 91 Q45 91 90 66 T180 41" stroke="#9ca3af" stroke-width="3" fill="none"/>
  <path d="M0 49 Q45 49 90 24 T180 -1" stroke="#9ca3af" stroke-width="3" fill="none"/>
  <!-- Center Dashed Yellow -->
  <path d="M0 70 Q45 70 90 45 T180 20" stroke="#facc15" stroke-width="3" stroke-dasharray="14 8" fill="none"/>
</svg>`,
  },
  {
    key: 'road_intersection',
    label: '4-Way Crossroad Intersection',
    category: 'outdoor',
    subcategory: 'Roads & Paths',
    defaultWidth: 130,
    defaultHeight: 130,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 130" preserveAspectRatio="none">
  <rect x="0" y="45" width="130" height="40" fill="#374151"/>
  <rect x="45" y="0" width="40" height="130" fill="#374151"/>
  <!-- Center Intersection Box -->
  <rect x="45" y="45" width="40" height="40" fill="#1f2937"/>
  <!-- Curbs -->
  <rect x="0" y="42" width="130" height="4" fill="#9ca3af"/>
  <rect x="0" y="84" width="130" height="4" fill="#9ca3af"/>
  <rect x="42" y="0" width="4" height="130" fill="#9ca3af"/>
  <rect x="84" y="0" width="4" height="130" fill="#9ca3af"/>
  <!-- Pedestrian Crosswalk Strips -->
  <line x1="47" y1="36" x2="83" y2="36" stroke="#ffffff" stroke-width="3" stroke-dasharray="4 3"/>
  <line x1="47" y1="94" x2="83" y2="94" stroke="#ffffff" stroke-width="3" stroke-dasharray="4 3"/>
  <line x1="36" y1="47" x2="36" y2="83" stroke="#ffffff" stroke-width="3" stroke-dasharray="4 3"/>
  <line x1="94" y1="47" x2="94" y2="83" stroke="#ffffff" stroke-width="3" stroke-dasharray="4 3"/>
  <!-- Center Lines -->
  <line x1="0" y1="65" x2="38" y2="65" stroke="#facc15" stroke-width="2.5" stroke-dasharray="8 6"/>
  <line x1="92" y1="65" x2="130" y2="65" stroke="#facc15" stroke-width="2.5" stroke-dasharray="8 6"/>
  <line x1="65" y1="0" x2="65" y2="38" stroke="#facc15" stroke-width="2.5" stroke-dasharray="8 6"/>
  <line x1="65" y1="92" x2="65" y2="130" stroke="#facc15" stroke-width="2.5" stroke-dasharray="8 6"/>
</svg>`,
  },
  {
    key: 'road_t_junction',
    label: '3-Way T-Junction Road',
    category: 'outdoor',
    subcategory: 'Roads & Paths',
    defaultWidth: 130,
    defaultHeight: 90,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 90" preserveAspectRatio="none">
  <!-- Main Road (Horizontal) -->
  <rect x="0" y="10" width="130" height="40" fill="#374151"/>
  <!-- Side Branch (Vertical) -->
  <rect x="45" y="45" width="40" height="45" fill="#374151"/>
  <!-- Curbs -->
  <rect x="0" y="8" width="130" height="4" fill="#9ca3af"/>
  <rect x="0" y="48" width="45" height="4" fill="#9ca3af"/>
  <rect x="85" y="48" width="45" height="4" fill="#9ca3af"/>
  <rect x="43" y="48" width="4" height="42" fill="#9ca3af"/>
  <rect x="83" y="48" width="4" height="42" fill="#9ca3af"/>
  <!-- Center Lines -->
  <line x1="0" y1="30" x2="130" y2="30" stroke="#facc15" stroke-width="2.5" stroke-dasharray="10 6"/>
  <line x1="65" y1="46" x2="65" y2="90" stroke="#facc15" stroke-width="2.5" stroke-dasharray="8 6"/>
</svg>`,
  },
  {
    key: 'road_roundabout',
    label: 'Traffic Roundabout',
    category: 'outdoor',
    subcategory: 'Roads & Paths',
    defaultWidth: 140,
    defaultHeight: 140,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" preserveAspectRatio="none">
  <!-- Approaches -->
  <rect x="52" y="0" width="36" height="140" fill="#374151"/>
  <rect x="0" y="52" width="140" height="36" fill="#374151"/>
  <!-- Outer Ring Road -->
  <circle cx="70" cy="70" r="50" fill="#374151" stroke="#9ca3af" stroke-width="4"/>
  <!-- Center Island Grass -->
  <circle cx="70" cy="70" r="24" fill="#15803d" stroke="#16a34a" stroke-width="3"/>
  <circle cx="70" cy="70" r="14" fill="#22c55e"/>
  <!-- Circulating Dashed Line -->
  <circle cx="70" cy="70" r="37" fill="none" stroke="#facc15" stroke-width="2" stroke-dasharray="10 8"/>
</svg>`,
  },
  {
    key: 'footpath',
    label: 'Paved Footpath (Extendable)',
    category: 'outdoor',
    subcategory: 'Roads & Paths',
    defaultWidth: 160,
    defaultHeight: 32,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 32" preserveAspectRatio="none">
  <rect x="0" y="2" width="160" height="28" fill="#e2e8f0" rx="2"/>
  <rect x="0" y="0" width="160" height="3" fill="#94a3b8"/>
  <rect x="0" y="29" width="160" height="3" fill="#94a3b8"/>
  <!-- Interlocking Paver Tiles -->
  <line x1="20" y1="3" x2="20" y2="29" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="40" y1="3" x2="40" y2="29" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="60" y1="3" x2="60" y2="29" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="80" y1="3" x2="80" y2="29" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="100" y1="3" x2="100" y2="29" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="120" y1="3" x2="120" y2="29" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="140" y1="3" x2="140" y2="29" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="0" y1="16" x2="160" y2="16" stroke="#cbd5e1" stroke-width="1"/>
</svg>`,
  },
  {
    key: 'crosswalk',
    label: 'Zebra Pedestrian Crossing',
    category: 'outdoor',
    subcategory: 'Roads & Paths',
    defaultWidth: 90,
    defaultHeight: 50,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 50" preserveAspectRatio="none">
  <rect x="0" y="0" width="90" height="50" fill="#374151"/>
  <!-- Zebra Stripes -->
  <rect x="8" y="5" width="8" height="40" fill="#ffffff" rx="1"/>
  <rect x="24" y="5" width="8" height="40" fill="#ffffff" rx="1"/>
  <rect x="40" y="5" width="8" height="40" fill="#ffffff" rx="1"/>
  <rect x="56" y="5" width="8" height="40" fill="#ffffff" rx="1"/>
  <rect x="72" y="5" width="8" height="40" fill="#ffffff" rx="1"/>
</svg>`,
  },
  {
    key: 'compound_wall_concrete',
    label: 'Modern Concrete Compound Wall',
    category: 'outdoor',
    subcategory: 'Gates & Fences',
    defaultWidth: 150,
    defaultHeight: 32,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 32" preserveAspectRatio="none">
  <!-- Concrete Compound Wall with Pillars -->
  <!-- Left Pillar -->
  <rect x="2" y="4" width="14" height="26" rx="1" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
  <polygon points="0,4 9,0 18,4" fill="#94a3b8" stroke="#475569" stroke-width="1"/>
  <!-- Main Wall Body -->
  <rect x="16" y="8" width="118" height="22" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5"/>
  <!-- Architectural Coping Top Slab -->
  <rect x="14" y="5" width="122" height="4" fill="#94a3b8" stroke="#475569" stroke-width="1"/>
  <!-- Groove lines (Precast reveal panels) -->
  <line x1="16" y1="15" x2="134" y2="15" stroke="#cbd5e1" stroke-width="1.5"/>
  <line x1="16" y1="22" x2="134" y2="22" stroke="#cbd5e1" stroke-width="1.5"/>
  <line x1="45" y1="8" x2="45" y2="30" stroke="#cbd5e1" stroke-width="1.5"/>
  <line x1="75" y1="8" x2="75" y2="30" stroke="#cbd5e1" stroke-width="1.5"/>
  <line x1="105" y1="8" x2="105" y2="30" stroke="#cbd5e1" stroke-width="1.5"/>
  <!-- Base Plinth -->
  <rect x="14" y="27" width="122" height="4" fill="#64748b"/>
  <!-- Right Pillar -->
  <rect x="134" y="4" width="14" height="26" rx="1" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
  <polygon points="132,4 141,0 150,4" fill="#94a3b8" stroke="#475569" stroke-width="1"/>
</svg>`,
  },
  {
    key: 'compound_wall_brick',
    label: 'Brick Masonry Compound Wall',
    category: 'outdoor',
    subcategory: 'Gates & Fences',
    defaultWidth: 150,
    defaultHeight: 32,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 32" preserveAspectRatio="none">
  <!-- Left Brick Pillar -->
  <rect x="2" y="4" width="14" height="26" rx="1" fill="#b91c1c" stroke="#7f1d1d" stroke-width="1.5"/>
  <rect x="0" y="2" width="18" height="4" rx="1" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
  <!-- Brick Wall Body -->
  <rect x="16" y="8" width="118" height="22" fill="#c2410c" stroke="#9a3412" stroke-width="1.5"/>
  <!-- Stone Coping Cap -->
  <rect x="14" y="5" width="122" height="4" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
  <!-- Brick Mortar Courses -->
  <line x1="16" y1="13" x2="134" y2="13" stroke="#fed7aa" stroke-width="1"/>
  <line x1="16" y1="18" x2="134" y2="18" stroke="#fed7aa" stroke-width="1"/>
  <line x1="16" y1="23" x2="134" y2="23" stroke="#fed7aa" stroke-width="1"/>
  <line x1="16" y1="28" x2="134" y2="28" stroke="#fed7aa" stroke-width="1"/>
  <!-- Vertical Staggered Joints -->
  <line x1="30" y1="8" x2="30" y2="13" stroke="#fed7aa" stroke-width="1"/>
  <line x1="60" y1="8" x2="60" y2="13" stroke="#fed7aa" stroke-width="1"/>
  <line x1="90" y1="8" x2="90" y2="13" stroke="#fed7aa" stroke-width="1"/>
  <line x1="120" y1="8" x2="120" y2="13" stroke="#fed7aa" stroke-width="1"/>
  <line x1="45" y1="13" x2="45" y2="18" stroke="#fed7aa" stroke-width="1"/>
  <line x1="75" y1="13" x2="75" y2="18" stroke="#fed7aa" stroke-width="1"/>
  <line x1="105" y1="13" x2="105" y2="18" stroke="#fed7aa" stroke-width="1"/>
  <!-- Right Brick Pillar -->
  <rect x="134" y="4" width="14" height="26" rx="1" fill="#b91c1c" stroke="#7f1d1d" stroke-width="1.5"/>
  <rect x="132" y="2" width="18" height="4" rx="1" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
</svg>`,
  },
  {
    key: 'compound_wall_arch_gate',
    label: 'Compound Wall with Security Arch Gate',
    category: 'outdoor',
    subcategory: 'Gates & Fences',
    defaultWidth: 160,
    defaultHeight: 70,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 70" preserveAspectRatio="none">
  <!-- Left Wall Wing -->
  <rect x="4" y="32" width="48" height="34" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5"/>
  <rect x="2" y="28" width="52" height="5" fill="#94a3b8" stroke="#475569" stroke-width="1"/>
  <!-- Right Wall Wing -->
  <rect x="108" y="32" width="48" height="34" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5"/>
  <rect x="106" y="28" width="52" height="5" fill="#94a3b8" stroke="#475569" stroke-width="1"/>
  <!-- Center Arch Portal Structure -->
  <rect x="52" y="6" width="56" height="60" rx="3" fill="#cbd5e1" stroke="#334155" stroke-width="2"/>
  <!-- Arch Opening -->
  <path d="M 60,66 L 60,34 Q 80,14 100,34 L 100,66 Z" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
  <!-- Ornate Iron Gate Inside Arch -->
  <line x1="68" y1="28" x2="68" y2="66" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="76" y1="22" x2="76" y2="66" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="84" y1="22" x2="84" y2="66" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="92" y1="28" x2="92" y2="66" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="60" y1="46" x2="100" y2="46" stroke="#94a3b8" stroke-width="1.5"/>
  <!-- Security Lantern on Arch Key -->
  <circle cx="80" cy="10" r="4" fill="#facc15" stroke="#78350f" stroke-width="1"/>
  <!-- Pediment Top -->
  <polygon points="50,6 80,0 110,6" fill="#94a3b8" stroke="#334155" stroke-width="1.5"/>
</svg>`,
  },
  {
    key: 'compound_wall_corner',
    label: 'Compound Wall 90-Degree Corner',
    category: 'outdoor',
    subcategory: 'Gates & Fences',
    defaultWidth: 70,
    defaultHeight: 70,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70" preserveAspectRatio="none">
  <!-- Horizontal Leg -->
  <rect x="24" y="4" width="44" height="24" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5"/>
  <rect x="24" y="2" width="44" height="4" fill="#94a3b8" stroke="#475569" stroke-width="1"/>
  <!-- Vertical Leg -->
  <rect x="4" y="24" width="24" height="44" fill="#cbd5e1" stroke="#64748b" stroke-width="1.5"/>
  <rect x="2" y="24" width="4" height="44" fill="#94a3b8" stroke="#475569" stroke-width="1"/>
  <!-- Large Corner Pillar -->
  <rect x="2" y="2" width="26" height="26" rx="2" fill="#94a3b8" stroke="#334155" stroke-width="2"/>
  <polygon points="0,0 15,-4 30,0 30,4 0,4" fill="#cbd5e1" stroke="#334155" stroke-width="1"/>
</svg>`,
  },
  {
    key: 'compound_wall_stone',
    label: 'Ashlar Stone Boundary Wall',
    category: 'outdoor',
    subcategory: 'Gates & Fences',
    defaultWidth: 150,
    defaultHeight: 32,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 32" preserveAspectRatio="none">
  <!-- Left Stone Pillar -->
  <rect x="2" y="4" width="14" height="26" rx="1" fill="#78716c" stroke="#44403c" stroke-width="1.5"/>
  <polygon points="0,4 9,0 18,4" fill="#a8a29e" stroke="#44403c" stroke-width="1"/>
  <!-- Stone Wall Body -->
  <rect x="16" y="8" width="118" height="22" fill="#a8a29e" stroke="#57534e" stroke-width="1.5"/>
  <!-- Slate Coping -->
  <rect x="14" y="5" width="122" height="4" fill="#57534e" stroke="#292524" stroke-width="1"/>
  <!-- Chiseled Stone Courses -->
  <line x1="16" y1="15" x2="134" y2="15" stroke="#78716c" stroke-width="1.2"/>
  <line x1="16" y1="22" x2="134" y2="22" stroke="#78716c" stroke-width="1.2"/>
  <line x1="38" y1="8" x2="38" y2="15" stroke="#78716c" stroke-width="1.2"/>
  <line x1="72" y1="8" x2="72" y2="15" stroke="#78716c" stroke-width="1.2"/>
  <line x1="106" y1="8" x2="106" y2="15" stroke="#78716c" stroke-width="1.2"/>
  <line x1="55" y1="15" x2="55" y2="22" stroke="#78716c" stroke-width="1.2"/>
  <line x1="88" y1="15" x2="88" y2="22" stroke="#78716c" stroke-width="1.2"/>
  <line x1="122" y1="15" x2="122" y2="22" stroke="#78716c" stroke-width="1.2"/>
  <line x1="38" y1="22" x2="38" y2="30" stroke="#78716c" stroke-width="1.2"/>
  <line x1="72" y1="22" x2="72" y2="30" stroke="#78716c" stroke-width="1.2"/>
  <line x1="106" y1="22" x2="106" y2="30" stroke="#78716c" stroke-width="1.2"/>
  <!-- Right Stone Pillar -->
  <rect x="134" y="4" width="14" height="26" rx="1" fill="#78716c" stroke="#44403c" stroke-width="1.5"/>
  <polygon points="132,4 141,0 150,4" fill="#a8a29e" stroke="#44403c" stroke-width="1"/>
</svg>`,
  },
  {
    key: 'floor_lawn_grass',
    label: 'Lawn Grass Turf',
    category: 'outdoor',
    subcategory: 'Floors & Grounds',
    defaultWidth: 160,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="none">
  <defs>
    <linearGradient id="grass_base" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4ade80"/>
      <stop offset="100%" stop-color="#22c55e"/>
    </linearGradient>
    <pattern id="grass_blades" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M4,16 Q5,8 7,4 Q6,12 8,16" stroke="#16a34a" stroke-width="1.5" fill="none"/>
      <path d="M14,18 Q16,10 18,6 Q16,13 17,18" stroke="#15803d" stroke-width="1.5" fill="none"/>
      <circle cx="10" cy="10" r="1" fill="#86efac"/>
    </pattern>
  </defs>
  <rect width="160" height="120" fill="url(#grass_base)" rx="4"/>
  <rect width="160" height="120" fill="url(#grass_blades)" rx="4" opacity="0.6"/>
  <rect width="160" height="120" fill="none" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="4,4" rx="4"/>
</svg>`,
  },
  {
    key: 'floor_concrete_plinth',
    label: 'Paved Concrete Plaza',
    category: 'outdoor',
    subcategory: 'Floors & Grounds',
    defaultWidth: 160,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="none">
  <defs>
    <pattern id="conc_grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
      <circle cx="20" cy="20" r="1.5" fill="#cbd5e1"/>
    </pattern>
  </defs>
  <rect width="160" height="120" fill="url(#conc_grid)" rx="4"/>
  <rect width="160" height="120" fill="none" stroke="#64748b" stroke-width="2" rx="4"/>
</svg>`,
  },
  {
    key: 'floor_asphalt_parking',
    label: 'Asphalt Road & Parking Surface',
    category: 'outdoor',
    subcategory: 'Floors & Grounds',
    defaultWidth: 160,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="none">
  <defs>
    <linearGradient id="asphalt_grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <pattern id="asphalt_dots" width="16" height="16" patternUnits="userSpaceOnUse">
      <circle cx="4" cy="4" r="0.8" fill="#64748b"/>
      <circle cx="12" cy="12" r="0.8" fill="#64748b"/>
    </pattern>
  </defs>
  <rect width="160" height="120" fill="url(#asphalt_grad)" rx="4"/>
  <rect width="160" height="120" fill="url(#asphalt_dots)" rx="4" opacity="0.5"/>
  <rect width="160" height="120" fill="none" stroke="#0f172a" stroke-width="2" rx="4"/>
</svg>`,
  },
  {
    key: 'floor_stone_pavers',
    label: 'Interlocking Stone Pavers',
    category: 'outdoor',
    subcategory: 'Floors & Grounds',
    defaultWidth: 160,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="none">
  <defs>
    <pattern id="stone_paver_pat" width="30" height="20" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="14" height="9" fill="#d6d3d1" stroke="#78716c" stroke-width="0.8" rx="1"/>
      <rect x="15" y="0" width="14" height="9" fill="#e7e5e4" stroke="#78716c" stroke-width="0.8" rx="1"/>
      <rect x="7" y="10" width="14" height="9" fill="#e7e5e4" stroke="#78716c" stroke-width="0.8" rx="1"/>
      <rect x="22" y="10" width="7" height="9" fill="#d6d3d1" stroke="#78716c" stroke-width="0.8" rx="1"/>
      <rect x="0" y="10" width="6" height="9" fill="#d6d3d1" stroke="#78716c" stroke-width="0.8" rx="1"/>
    </pattern>
  </defs>
  <rect width="160" height="120" fill="#a8a29e" rx="4"/>
  <rect width="160" height="120" fill="url(#stone_paver_pat)" rx="4"/>
  <rect width="160" height="120" fill="none" stroke="#57534e" stroke-width="2" rx="4"/>
</svg>`,
  },
  {
    key: 'floor_gravel_yard',
    label: 'Crushed Gravel Yard',
    category: 'outdoor',
    subcategory: 'Floors & Grounds',
    defaultWidth: 160,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="none">
  <defs>
    <pattern id="gravel_pat" width="24" height="24" patternUnits="userSpaceOnUse">
      <ellipse cx="6" cy="6" rx="2.5" ry="1.8" fill="#d1d5db"/>
      <ellipse cx="18" cy="8" rx="2" ry="2.2" fill="#9ca3af"/>
      <ellipse cx="10" cy="18" rx="2.8" ry="1.5" fill="#e5e7eb"/>
      <ellipse cx="20" cy="20" rx="1.8" ry="2" fill="#6b7280"/>
    </pattern>
  </defs>
  <rect width="160" height="120" fill="#9ca3af" rx="4"/>
  <rect width="160" height="120" fill="url(#gravel_pat)" rx="4"/>
  <rect width="160" height="120" fill="none" stroke="#4b5563" stroke-width="1.5" rx="4"/>
</svg>`,
  },
  {
    key: 'floor_wooden_deck',
    label: 'Outdoor Timber Decking',
    category: 'outdoor',
    subcategory: 'Floors & Grounds',
    defaultWidth: 160,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="none">
  <defs>
    <pattern id="timber_deck_pat" width="160" height="16" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="160" height="14" fill="#b45309" rx="1"/>
      <line x1="0" y1="15" x2="160" y2="15" stroke="#78350f" stroke-width="1.5"/>
      <circle cx="20" cy="7" r="1" fill="#451a03"/>
      <circle cx="80" cy="7" r="1" fill="#451a03"/>
      <circle cx="140" cy="7" r="1" fill="#451a03"/>
    </pattern>
  </defs>
  <rect width="160" height="120" fill="url(#timber_deck_pat)" rx="4"/>
  <rect width="160" height="120" fill="none" stroke="#78350f" stroke-width="2" rx="4"/>
</svg>`,
  },
  {
    key: 'floor_water_pond',
    label: 'Water Feature & Pond Surface',
    category: 'outdoor',
    subcategory: 'Floors & Grounds',
    defaultWidth: 160,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="none">
  <defs>
    <linearGradient id="pond_grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
    <pattern id="water_ripples" width="40" height="24" patternUnits="userSpaceOnUse">
      <path d="M0,12 Q10,6 20,12 T40,12" stroke="#bae6fd" stroke-width="1.5" fill="none" opacity="0.6"/>
    </pattern>
  </defs>
  <rect width="160" height="120" fill="url(#pond_grad)" rx="4"/>
  <rect width="160" height="120" fill="url(#water_ripples)" rx="4"/>
  <rect width="160" height="120" fill="none" stroke="#0284c7" stroke-width="2" rx="4"/>
</svg>`,
  },
  {
    key: 'floor_running_track',
    label: 'Athletic Running Track Turf',
    category: 'outdoor',
    subcategory: 'Floors & Grounds',
    defaultWidth: 160,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="none">
  <rect width="160" height="120" fill="#b91c1c" rx="4"/>
  <line x1="0" y1="30" x2="160" y2="30" stroke="#ffffff" stroke-width="2" stroke-dasharray="8,6"/>
  <line x1="0" y1="60" x2="160" y2="60" stroke="#ffffff" stroke-width="2.5"/>
  <line x1="0" y1="90" x2="160" y2="90" stroke="#ffffff" stroke-width="2" stroke-dasharray="8,6"/>
  <rect width="160" height="120" fill="none" stroke="#7f1d1d" stroke-width="2" rx="4"/>
</svg>`,
  },
  {
    key: 'gate_main',
    label: 'Grand Campus Main Gate',
    category: 'outdoor',
    subcategory: 'Gates & Fences',
    defaultWidth: 110,
    defaultHeight: 75,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 75" preserveAspectRatio="none">
  <!-- Stone Pillars -->
  <rect x="4" y="10" width="16" height="60" rx="2" fill="#334155" stroke="#1e293b" stroke-width="1.5"/>
  <rect x="90" y="10" width="16" height="60" rx="2" fill="#334155" stroke="#1e293b" stroke-width="1.5"/>
  <!-- Pillar Caps & Lanterns -->
  <rect x="2" y="6" width="20" height="6" rx="2" fill="#475569"/>
  <rect x="88" y="6" width="20" height="6" rx="2" fill="#475569"/>
  <circle cx="12" cy="4" r="3" fill="#facc15"/>
  <circle cx="98" cy="4" r="3" fill="#facc15"/>
  <!-- Arch -->
  <path d="M18 24 Q55 6 92 24" stroke="#1e293b" stroke-width="5" fill="none"/>
  <!-- Iron Gate Wings -->
  <rect x="22" y="24" width="32" height="46" fill="#475569" stroke="#1e293b" stroke-width="1.5"/>
  <rect x="56" y="24" width="32" height="46" fill="#475569" stroke="#1e293b" stroke-width="1.5"/>
  <!-- Vertical Bars -->
  <line x1="28" y1="26" x2="28" y2="68" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="36" y1="26" x2="36" y2="68" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="44" y1="26" x2="44" y2="68" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="64" y1="26" x2="64" y2="68" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="72" y1="26" x2="72" y2="68" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="80" y1="26" x2="80" y2="68" stroke="#cbd5e1" stroke-width="2"/>
</svg>`,
  },
  {
    key: 'gate_boom_barrier',
    label: 'Automatic Boom Barrier Gate',
    category: 'outdoor',
    subcategory: 'Gates & Fences',
    defaultWidth: 90,
    defaultHeight: 45,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 45" preserveAspectRatio="none">
  <!-- Motor Housing Unit -->
  <rect x="6" y="10" width="16" height="32" rx="3" fill="#ea580c" stroke="#9a3412" stroke-width="1.5"/>
  <circle cx="14" cy="18" r="3" fill="#22c55e"/>
  <!-- Barrier Arm (Striped) -->
  <rect x="18" y="14" width="68" height="6" rx="1" fill="#ffffff" stroke="#374151" stroke-width="1"/>
  <rect x="28" y="14" width="8" height="6" fill="#dc2626"/>
  <rect x="44" y="14" width="8" height="6" fill="#dc2626"/>
  <rect x="60" y="14" width="8" height="6" fill="#dc2626"/>
  <rect x="76" y="14" width="8" height="6" fill="#dc2626"/>
</svg>`,
  },
  {
    key: 'fence',
    label: 'Steel Security Fence',
    category: 'outdoor',
    subcategory: 'Gates & Fences',
    defaultWidth: 130,
    defaultHeight: 35,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 35" preserveAspectRatio="none">
  <rect x="0" y="10" width="130" height="4" rx="1" fill="#475569"/>
  <rect x="0" y="24" width="130" height="4" rx="1" fill="#475569"/>
  <!-- Pickets with Spear Tips -->
  <g fill="#334155">
    <rect x="6" y="4" width="5" height="28" rx="1"/>
    <polygon points="6,4 8.5,0 11,4"/>
    <rect x="20" y="4" width="5" height="28" rx="1"/>
    <polygon points="20,4 22.5,0 25,4"/>
    <rect x="34" y="4" width="5" height="28" rx="1"/>
    <polygon points="34,4 36.5,0 39,4"/>
    <rect x="48" y="4" width="5" height="28" rx="1"/>
    <polygon points="48,4 50.5,0 53,4"/>
    <rect x="62" y="4" width="5" height="28" rx="1"/>
    <polygon points="62,4 64.5,0 67,4"/>
    <rect x="76" y="4" width="5" height="28" rx="1"/>
    <polygon points="76,4 78.5,0 81,4"/>
    <rect x="90" y="4" width="5" height="28" rx="1"/>
    <polygon points="90,4 92.5,0 95,4"/>
    <rect x="104" y="4" width="5" height="28" rx="1"/>
    <polygon points="104,4 106.5,0 109,4"/>
    <rect x="118" y="4" width="5" height="28" rx="1"/>
    <polygon points="118,4 120.5,0 123,4"/>
  </g>
</svg>`,
  },
  {
    key: 'fence_wood',
    label: 'Wooden Post & Rail Fence',
    category: 'outdoor',
    subcategory: 'Gates & Fences',
    defaultWidth: 120,
    defaultHeight: 35,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 35" preserveAspectRatio="none">
  <rect x="0" y="10" width="120" height="5" rx="1" fill="#b45309"/>
  <rect x="0" y="22" width="120" height="5" rx="1" fill="#b45309"/>
  <!-- Posts -->
  <rect x="6" y="4" width="8" height="28" rx="2" fill="#78350f"/>
  <rect x="42" y="4" width="8" height="28" rx="2" fill="#78350f"/>
  <rect x="78" y="4" width="8" height="28" rx="2" fill="#78350f"/>
  <rect x="108" y="4" width="8" height="28" rx="2" fill="#78350f"/>
</svg>`,
  },
  {
    key: 'guard_kiosk',
    label: 'Security Guard Kiosk',
    category: 'outdoor',
    subcategory: 'Gates & Fences',
    defaultWidth: 60,
    defaultHeight: 65,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 65" preserveAspectRatio="none">
  <ellipse cx="30" cy="62" rx="24" ry="3" fill="rgba(0,0,0,0.18)"/>
  <rect x="10" y="20" width="40" height="42" rx="3" fill="#0284c7" stroke="#0369a1" stroke-width="2"/>
  <!-- Overhanging Roof -->
  <rect x="6" y="14" width="48" height="8" rx="2" fill="#0369a1"/>
  <!-- 360 Viewing Windows -->
  <rect x="14" y="26" width="32" height="16" rx="2" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/>
  <!-- Door -->
  <rect x="22" y="44" width="16" height="18" rx="1" fill="#075985"/>
</svg>`,
  },
  {
    key: 'turnstile',
    label: 'Pedestrian Access Turnstile',
    category: 'outdoor',
    subcategory: 'Gates & Fences',
    defaultWidth: 55,
    defaultHeight: 45,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 55 45" preserveAspectRatio="none">
  <!-- Stainless steel housing -->
  <rect x="8" y="10" width="38" height="32" rx="3" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/>
  <!-- RFID Scanner Light -->
  <circle cx="27" cy="16" r="3" fill="#22c55e"/>
  <!-- Rotating 3-arm tripod -->
  <circle cx="27" cy="28" r="4" fill="#334155"/>
  <line x1="27" y1="28" x2="48" y2="28" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
  <line x1="27" y1="28" x2="16" y2="17" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
  <line x1="27" y1="28" x2="16" y2="39" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
</svg>`,
  },
  {
    key: 'parking_lot',
    label: 'Parking Lot with Bays',
    category: 'outdoor',
    subcategory: 'Facilities',
    defaultWidth: 150,
    defaultHeight: 95,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 95" preserveAspectRatio="none">
  <rect x="0" y="0" width="150" height="95" rx="4" fill="#374151" stroke="#1f2937" stroke-width="2"/>
  <!-- Top Bays -->
  <g stroke="#9ca3af" stroke-width="1.5" fill="none">
    <rect x="6" y="8" width="24" height="22" rx="1"/>
    <rect x="34" y="8" width="24" height="22" rx="1"/>
    <rect x="62" y="8" width="24" height="22" rx="1"/>
    <rect x="90" y="8" width="24" height="22" rx="1"/>
    <rect x="118" y="8" width="24" height="22" rx="1"/>
    <!-- Bottom Bays -->
    <rect x="6" y="64" width="24" height="22" rx="1"/>
    <rect x="34" y="64" width="24" height="22" rx="1"/>
    <rect x="62" y="64" width="24" height="22" rx="1"/>
    <rect x="90" y="64" width="24" height="22" rx="1"/>
    <rect x="118" y="64" width="24" height="22" rx="1"/>
  </g>
  <!-- Driving Lane Arrows -->
  <polygon points="75,42 85,47 75,52" fill="#facc15"/>
  <line x1="50" y1="47" x2="80" y2="47" stroke="#facc15" stroke-width="2"/>
  <!-- Accessible Bay Accent -->
  <rect x="6" y="8" width="24" height="22" rx="1" fill="#3b82f6" opacity="0.3"/>
  <text x="18" y="23" font-size="11" text-anchor="middle" fill="#60a5fa">♿</text>
</svg>`,
  },
  {
    key: 'sports_court',
    label: 'Tennis / Multi-sport Court',
    category: 'outdoor',
    subcategory: 'Facilities',
    defaultWidth: 140,
    defaultHeight: 90,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 90" preserveAspectRatio="none">
  <!-- Court Surface -->
  <rect x="4" y="4" width="132" height="82" rx="4" fill="#047857" stroke="#ffffff" stroke-width="2"/>
  <!-- Outer Service Lines -->
  <rect x="16" y="12" width="108" height="66" fill="none" stroke="#ffffff" stroke-width="1.5"/>
  <!-- Net -->
  <line x1="70" y1="4" x2="70" y2="86" stroke="#ffffff" stroke-width="3"/>
  <!-- Service Boxes -->
  <line x1="38" y1="12" x2="38" y2="78" stroke="#ffffff" stroke-width="1.5"/>
  <line x1="102" y1="12" x2="102" y2="78" stroke="#ffffff" stroke-width="1.5"/>
  <line x1="38" y1="45" x2="102" y2="45" stroke="#ffffff" stroke-width="1.5"/>
</svg>`,
  },
  {
    key: 'basketball_court',
    label: 'Basketball Half-Court',
    category: 'outdoor',
    subcategory: 'Facilities',
    defaultWidth: 110,
    defaultHeight: 90,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 90" preserveAspectRatio="none">
  <rect x="4" y="4" width="102" height="82" rx="4" fill="#c2410c" stroke="#ffffff" stroke-width="2"/>
  <!-- Key / Free Throw Lane -->
  <rect x="36" y="4" width="38" height="38" fill="#ea580c" stroke="#ffffff" stroke-width="1.5"/>
  <circle cx="55" cy="42" r="14" fill="none" stroke="#ffffff" stroke-width="1.5"/>
  <!-- 3-Point Arc -->
  <path d="M12 4 L12 25 A48 48 0 0 0 98 25 L98 4" fill="none" stroke="#ffffff" stroke-width="1.5"/>
  <!-- Hoop & Backboard -->
  <line x1="45" y1="10" x2="65" y2="10" stroke="#1f2937" stroke-width="3"/>
  <circle cx="55" cy="14" r="5" fill="none" stroke="#f97316" stroke-width="2"/>
</svg>`,
  },
  {
    key: 'fountain',
    label: 'Tiered Water Fountain',
    category: 'outdoor',
    subcategory: 'Facilities',
    defaultWidth: 75,
    defaultHeight: 75,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 75 75" preserveAspectRatio="none">
  <!-- Outer Pool Basin -->
  <circle cx="37" cy="37" r="34" fill="#0284c7" stroke="#38bdf8" stroke-width="3"/>
  <circle cx="37" cy="37" r="28" fill="#38bdf8"/>
  <!-- Middle Tier -->
  <circle cx="37" cy="37" r="18" fill="#0284c7" stroke="#e0f2fe" stroke-width="2"/>
  <circle cx="37" cy="37" r="14" fill="#7dd3fc"/>
  <!-- Center Spout -->
  <circle cx="37" cy="37" r="6" fill="#0369a1"/>
  <!-- Water Spray Jets -->
  <path d="M37 37 Q25 15 22 10" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M37 37 Q50 15 54 10" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M37 37 Q15 45 10 48" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M37 37 Q60 50 65 48" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`,
  },
  {
    key: 'solar_canopy',
    label: 'Solar EV Charging Canopy',
    category: 'outdoor',
    subcategory: 'Facilities',
    defaultWidth: 130,
    defaultHeight: 80,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 80" preserveAspectRatio="none">
  <rect x="8" y="8" width="114" height="64" rx="3" fill="#1e293b" stroke="#3b82f6" stroke-width="2"/>
  <!-- Solar Panel Grid -->
  <g stroke="#3b82f6" stroke-width="1" fill="#0f172a">
    <rect x="14" y="14" width="22" height="24" rx="1"/>
    <rect x="40" y="14" width="22" height="24" rx="1"/>
    <rect x="68" y="14" width="22" height="24" rx="1"/>
    <rect x="94" y="14" width="22" height="24" rx="1"/>
    <rect x="14" y="42" width="22" height="24" rx="1"/>
    <rect x="40" y="42" width="22" height="24" rx="1"/>
    <rect x="68" y="42" width="22" height="24" rx="1"/>
    <rect x="94" y="42" width="22" height="24" rx="1"/>
  </g>
  <!-- EV Charging Station Symbol -->
  <circle cx="120" cy="70" r="8" fill="#22c55e"/>
  <text x="120" y="74" font-size="10" text-anchor="middle" fill="#ffffff" font-weight="bold">⚡</text>
</svg>`,
  },
  {
    key: 'bicycle_rack',
    label: 'Bicycle Parking Rack',
    category: 'outdoor',
    subcategory: 'Facilities',
    defaultWidth: 90,
    defaultHeight: 45,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 45" preserveAspectRatio="none">
  <rect x="4" y="2" width="82" height="40" rx="3" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5"/>
  <!-- U-Racks -->
  <g fill="none" stroke="#475569" stroke-width="3">
    <path d="M16 36 L16 10 A6 6 0 0 1 28 10 L28 36"/>
    <path d="M38 36 L38 10 A6 6 0 0 1 50 10 L50 36"/>
    <path d="M60 36 L60 10 A6 6 0 0 1 72 10 L72 36"/>
  </g>
</svg>`,
  },
  {
    key: 'floor_ceramic_tile_white',
    label: 'White Ceramic Floor Tiles',
    category: 'indoor',
    subcategory: 'Flooring & Surfaces',
    defaultWidth: 160,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="none">
  <defs>
    <pattern id="white_tile_pat" width="32" height="32" patternUnits="userSpaceOnUse">
      <rect width="30" height="30" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" rx="1"/>
      <line x1="2" y1="2" x2="28" y2="28" stroke="#ffffff" stroke-width="0.8" opacity="0.7"/>
    </pattern>
  </defs>
  <rect width="160" height="120" fill="#94a3b8" rx="3"/>
  <rect width="160" height="120" fill="url(#white_tile_pat)" rx="3"/>
  <rect width="160" height="120" fill="none" stroke="#64748b" stroke-width="2" rx="3"/>
</svg>`,
  },
  {
    key: 'floor_hardwood_parquet',
    label: 'Oak Hardwood Parquet',
    category: 'indoor',
    subcategory: 'Flooring & Surfaces',
    defaultWidth: 160,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="none">
  <defs>
    <pattern id="parquet_pat" width="48" height="24" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="23" height="11" fill="#d97706" rx="0.5"/>
      <rect x="24" y="0" width="23" height="11" fill="#b45309" rx="0.5"/>
      <rect x="12" y="12" width="23" height="11" fill="#f59e0b" rx="0.5"/>
      <rect x="36" y="12" width="11" height="11" fill="#d97706" rx="0.5"/>
      <rect x="0" y="12" width="11" height="11" fill="#b45309" rx="0.5"/>
    </pattern>
  </defs>
  <rect width="160" height="120" fill="#78350f" rx="3"/>
  <rect width="160" height="120" fill="url(#parquet_pat)" rx="3"/>
  <rect width="160" height="120" fill="none" stroke="#78350f" stroke-width="2" rx="3"/>
</svg>`,
  },
  {
    key: 'floor_commercial_carpet_grey',
    label: 'Charcoal Office Carpet Tile',
    category: 'indoor',
    subcategory: 'Flooring & Surfaces',
    defaultWidth: 160,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="none">
  <defs>
    <pattern id="carpet_grey_pat" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="38" height="38" fill="#334155" stroke="#1e293b" stroke-width="1" rx="1"/>
      <line x1="0" y1="19" x2="38" y2="19" stroke="#475569" stroke-width="0.8" stroke-dasharray="2,2"/>
      <line x1="19" y1="0" x2="19" y2="38" stroke="#475569" stroke-width="0.8" stroke-dasharray="2,2"/>
    </pattern>
  </defs>
  <rect width="160" height="120" fill="#0f172a" rx="3"/>
  <rect width="160" height="120" fill="url(#carpet_grey_pat)" rx="3"/>
  <rect width="160" height="120" fill="none" stroke="#1e293b" stroke-width="2" rx="3"/>
</svg>`,
  },
  {
    key: 'floor_commercial_carpet_blue',
    label: 'Executive Navy Carpet Tile',
    category: 'indoor',
    subcategory: 'Flooring & Surfaces',
    defaultWidth: 160,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="none">
  <defs>
    <pattern id="carpet_blue_pat" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="38" height="38" fill="#1e3a8a" stroke="#172554" stroke-width="1" rx="1"/>
      <circle cx="19" cy="19" r="1.5" fill="#3b82f6"/>
    </pattern>
  </defs>
  <rect width="160" height="120" fill="#0f172a" rx="3"/>
  <rect width="160" height="120" fill="url(#carpet_blue_pat)" rx="3"/>
  <rect width="160" height="120" fill="none" stroke="#1e3a8a" stroke-width="2" rx="3"/>
</svg>`,
  },
  {
    key: 'floor_polished_marble',
    label: 'Polished Italian Marble Floor',
    category: 'indoor',
    subcategory: 'Flooring & Surfaces',
    defaultWidth: 160,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="none">
  <defs>
    <linearGradient id="marble_bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
  </defs>
  <rect width="160" height="120" fill="url(#marble_bg)" rx="3"/>
  <path d="M10,0 Q40,40 20,80 T60,120" stroke="#94a3b8" stroke-width="1.8" fill="none" opacity="0.6"/>
  <path d="M100,0 Q80,50 130,80 T150,120" stroke="#cbd5e1" stroke-width="2.2" fill="none" opacity="0.7"/>
  <path d="M50,20 Q90,40 80,70" stroke="#64748b" stroke-width="1" fill="none" opacity="0.5"/>
  <rect width="160" height="120" fill="none" stroke="#cbd5e1" stroke-width="2" rx="3"/>
</svg>`,
  },
  {
    key: 'floor_terrazzo_speckled',
    label: 'Corridor Speckled Terrazzo',
    category: 'indoor',
    subcategory: 'Flooring & Surfaces',
    defaultWidth: 160,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="none">
  <defs>
    <pattern id="terrazzo_pat" width="30" height="30" patternUnits="userSpaceOnUse">
      <polygon points="5,5 8,3 9,7 4,8" fill="#3b82f6"/>
      <polygon points="18,12 22,10 20,16" fill="#f59e0b"/>
      <polygon points="12,24 16,22 15,28" fill="#10b981"/>
      <polygon points="25,4 28,6 26,9" fill="#ef4444"/>
      <polygon points="8,18 6,22 10,21" fill="#8b5cf6"/>
    </pattern>
  </defs>
  <rect width="160" height="120" fill="#f1f5f9" rx="3"/>
  <rect width="160" height="120" fill="url(#terrazzo_pat)" rx="3" opacity="0.8"/>
  <rect width="160" height="120" fill="none" stroke="#94a3b8" stroke-width="1.5" rx="3"/>
</svg>`,
  },
  {
    key: 'floor_industrial_concrete',
    label: 'Sealed Concrete Lab Screed',
    category: 'indoor',
    subcategory: 'Flooring & Surfaces',
    defaultWidth: 160,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="none">
  <defs>
    <linearGradient id="screed_grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
  </defs>
  <rect width="160" height="120" fill="url(#screed_grad)" rx="3"/>
  <line x1="80" y1="0" x2="80" y2="120" stroke="#334155" stroke-width="1.5"/>
  <line x1="0" y1="60" x2="160" y2="60" stroke="#334155" stroke-width="1.5"/>
  <rect width="160" height="120" fill="none" stroke="#475569" stroke-width="2" rx="3"/>
</svg>`,
  },
  {
    key: 'floor_gymnasium_hardwood',
    label: 'Gymnasium Wood Court Floor',
    category: 'indoor',
    subcategory: 'Flooring & Surfaces',
    defaultWidth: 160,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="none">
  <rect width="160" height="120" fill="#fde68a" rx="3"/>
  <rect x="12" y="12" width="136" height="96" fill="none" stroke="#dc2626" stroke-width="2.5"/>
  <circle cx="80" cy="60" r="22" fill="none" stroke="#2563eb" stroke-width="2"/>
  <line x1="80" y1="12" x2="80" y2="108" stroke="#2563eb" stroke-width="2"/>
  <rect width="160" height="120" fill="none" stroke="#d97706" stroke-width="2" rx="3"/>
</svg>`,
  },
  {
    key: 'bedroom',
    label: 'Master Bedroom',
    category: 'indoor',
    subcategory: 'Floor Plan Rooms',
    defaultWidth: 140,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 120" preserveAspectRatio="none">
  <!-- Room Shell -->
  <rect x="2" y="2" width="136" height="116" rx="2" fill="#fffbeb" stroke="#92400e" stroke-width="2.5"/>
  <!-- Double Bed Frame -->
  <rect x="20" y="28" width="76" height="52" rx="4" fill="#b45309" stroke="#78350f" stroke-width="1.5"/>
  <rect x="22" y="36" width="72" height="42" rx="3" fill="#fef3c7"/>
  <!-- Pillows -->
  <rect x="26" y="39" width="22" height="14" rx="4" fill="#ffffff" stroke="#d97706" stroke-width="1"/>
  <rect x="52" y="39" width="22" height="14" rx="4" fill="#ffffff" stroke="#d97706" stroke-width="1"/>
  <!-- Blanket Duvet Fold -->
  <rect x="22" y="58" width="72" height="20" rx="2" fill="#fed7aa"/>
  <!-- Bedside Nightstands -->
  <rect x="102" y="32" width="22" height="20" rx="2" fill="#fde68a" stroke="#d97706" stroke-width="1"/>
  <circle cx="113" cy="42" r="3" fill="#d97706"/>
  <!-- Wardrobe Closet -->
  <rect x="10" y="8" width="54" height="16" rx="2" fill="#a78bfa" stroke="#7c3aed" stroke-width="1"/>
  <line x1="37" y1="8" x2="37" y2="24" stroke="#7c3aed" stroke-width="1"/>
  <!-- Window -->
  <rect x="100" y="6" width="30" height="16" rx="1" fill="#bfdbfe" stroke="#3b82f6" stroke-width="1.5"/>
  <!-- Door Opening Arc -->
  <rect x="2" y="88" width="6" height="26" fill="#92400e"/>
  <path d="M8 114 Q8 90 28 88" stroke="#92400e" stroke-width="1.5" fill="#fef3c7" opacity="0.6"/>
  <text x="70" y="105" text-anchor="middle" font-size="9" font-family="sans-serif" fill="#92400e" font-weight="bold">BED ROOM</text>
</svg>`,
  },
  {
    key: 'bedroom_single',
    label: 'Single Room / Study',
    category: 'indoor',
    subcategory: 'Floor Plan Rooms',
    defaultWidth: 120,
    defaultHeight: 110,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 110" preserveAspectRatio="none">
  <rect x="2" y="2" width="116" height="106" rx="2" fill="#fffbeb" stroke="#92400e" stroke-width="2"/>
  <!-- Single Bed -->
  <rect x="12" y="24" width="45" height="58" rx="3" fill="#b45309" stroke="#78350f" stroke-width="1.5"/>
  <rect x="14" y="32" width="41" height="48" rx="2" fill="#fef3c7"/>
  <rect x="18" y="34" width="22" height="12" rx="3" fill="#ffffff" stroke="#d97706" stroke-width="1"/>
  <!-- Study Desk & Chair -->
  <rect x="70" y="24" width="38" height="22" rx="2" fill="#fde68a" stroke="#d97706" stroke-width="1"/>
  <rect x="76" y="14" width="16" height="8" rx="2" fill="#a78bfa"/>
  <!-- Laptop on Desk -->
  <rect x="80" y="27" width="14" height="10" rx="1" fill="#475569"/>
  <!-- Wardrobe -->
  <rect x="70" y="60" width="38" height="18" rx="2" fill="#a78bfa" stroke="#7c3aed" stroke-width="1"/>
  <text x="60" y="98" text-anchor="middle" font-size="8" font-family="sans-serif" fill="#92400e" font-weight="bold">SINGLE ROOM</text>
</svg>`,
  },
  {
    key: 'kitchen',
    label: 'Kitchen & Dining (KTN)',
    category: 'indoor',
    subcategory: 'Floor Plan Rooms',
    defaultWidth: 130,
    defaultHeight: 110,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 110" preserveAspectRatio="none">
  <rect x="2" y="2" width="126" height="106" rx="2" fill="#f0fdf4" stroke="#166534" stroke-width="2"/>
  <!-- L-Shaped Counter -->
  <rect x="8" y="8" width="114" height="24" rx="2" fill="#6ee7b7" stroke="#059669" stroke-width="1.5"/>
  <rect x="8" y="8" width="26" height="66" rx="2" fill="#6ee7b7" stroke="#059669" stroke-width="1.5"/>
  <!-- Sink & Faucet -->
  <rect x="54" y="11" width="30" height="18" rx="3" fill="#a7f3d0" stroke="#10b981" stroke-width="1.5"/>
  <ellipse cx="69" cy="20" rx="10" ry="6" fill="#34d399"/>
  <circle cx="69" cy="20" r="2" fill="#047857"/>
  <!-- 4-Burner Stove -->
  <rect x="92" y="11" width="24" height="18" rx="2" fill="#374151"/>
  <circle cx="98" cy="16" r="3" fill="#9ca3af"/>
  <circle cx="110" cy="16" r="3" fill="#9ca3af"/>
  <circle cx="98" cy="24" r="3" fill="#9ca3af"/>
  <circle cx="110" cy="24" r="3" fill="#9ca3af"/>
  <!-- Refrigerator -->
  <rect x="10" y="34" width="22" height="34" rx="2" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5"/>
  <!-- Breakfast Dining Table & 2 Stools -->
  <rect x="44" y="58" width="50" height="30" rx="3" fill="#fef3c7" stroke="#d97706" stroke-width="1"/>
  <circle cx="56" cy="50" r="5" fill="#a78bfa"/>
  <circle cx="82" cy="50" r="5" fill="#a78bfa"/>
  <circle cx="56" cy="96" r="5" fill="#a78bfa"/>
  <circle cx="82" cy="96" r="5" fill="#a78bfa"/>
  <text x="68" y="76" text-anchor="middle" font-size="8" font-family="sans-serif" fill="#166534" font-weight="bold">KTN</text>
</svg>`,
  },
  {
    key: 'bathroom_wc',
    label: 'Bathroom & W.C. (Bath W/C)',
    category: 'indoor',
    subcategory: 'Floor Plan Rooms',
    defaultWidth: 95,
    defaultHeight: 110,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 95 110" preserveAspectRatio="none">
  <rect x="2" y="2" width="91" height="106" rx="2" fill="#eff6ff" stroke="#1d4ed8" stroke-width="2"/>
  <!-- Toilet Commode & Cistern -->
  <rect x="10" y="12" width="28" height="18" rx="3" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5"/>
  <ellipse cx="24" cy="38" rx="14" ry="18" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5"/>
  <ellipse cx="24" cy="39" rx="10" ry="13" fill="#bfdbfe"/>
  <!-- Washbasin -->
  <rect x="52" y="12" width="34" height="26" rx="4" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5"/>
  <ellipse cx="69" cy="24" rx="12" ry="9" fill="#bfdbfe"/>
  <circle cx="69" cy="24" r="3" fill="#60a5fa"/>
  <!-- Shower Zone with Glass Enclosure -->
  <rect x="10" y="66" width="75" height="38" rx="2" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="4 3"/>
  <circle cx="47" cy="78" r="8" fill="#93c5fd" stroke="#3b82f6" stroke-width="1"/>
  <!-- Floor Drain -->
  <circle cx="47" cy="96" r="4" fill="#60a5fa"/>
  <text x="47" y="58" text-anchor="middle" font-size="8" font-family="sans-serif" fill="#1d4ed8" font-weight="bold">Bath W/C</text>
</svg>`,
  },
  {
    key: 'hall_dining',
    label: 'Hall Living & Dining Suite',
    category: 'indoor',
    subcategory: 'Floor Plan Rooms',
    defaultWidth: 170,
    defaultHeight: 150,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 150" preserveAspectRatio="none">
  <rect x="2" y="2" width="166" height="146" rx="2" fill="#fffbeb" stroke="#d97706" stroke-width="2.5"/>
  <!-- Living Section: Sofa Set -->
  <rect x="16" y="16" width="86" height="32" rx="4" fill="#a78bfa" stroke="#7c3aed" stroke-width="1.5"/>
  <rect x="22" y="22" width="22" height="14" rx="2" fill="#c4b5fd"/>
  <rect x="48" y="22" width="22" height="14" rx="2" fill="#c4b5fd"/>
  <!-- Coffee Table -->
  <rect x="36" y="54" width="46" height="26" rx="3" fill="#fde68a" stroke="#d97706" stroke-width="1.5"/>
  <!-- Armchair -->
  <rect x="110" y="16" width="30" height="32" rx="4" fill="#a78bfa" stroke="#7c3aed" stroke-width="1.5"/>
  <!-- TV Media Console -->
  <rect x="16" y="9" width="86" height="6" rx="1" fill="#334155"/>
  <!-- Dining Section Divider -->
  <line x1="12" y1="92" x2="158" y2="92" stroke="#d97706" stroke-width="1" stroke-dasharray="6 4"/>
  <!-- Round Dining Table with 6 Chairs -->
  <circle cx="100" cy="120" r="22" fill="#fcd34d" stroke="#d97706" stroke-width="1.5"/>
  <circle cx="100" cy="94" r="5" fill="#a78bfa"/>
  <circle cx="100" cy="146" r="5" fill="#a78bfa"/>
  <circle cx="74" cy="108" r="5" fill="#a78bfa"/>
  <circle cx="126" cy="108" r="5" fill="#a78bfa"/>
  <circle cx="74" cy="132" r="5" fill="#a78bfa"/>
  <circle cx="126" cy="132" r="5" fill="#a78bfa"/>
  <text x="50" y="84" text-anchor="middle" font-size="9" font-family="sans-serif" fill="#7c3aed" font-weight="bold">HALL</text>
  <text x="100" y="123" text-anchor="middle" font-size="8" font-family="sans-serif" fill="#92400e" font-weight="bold">DINING</text>
</svg>`,
  },
  {
    key: 'verandah',
    label: 'Verandah / Balcony',
    category: 'indoor',
    subcategory: 'Floor Plan Rooms',
    defaultWidth: 160,
    defaultHeight: 85,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 85" preserveAspectRatio="none">
  <rect x="2" y="2" width="156" height="81" rx="2" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
  <!-- Paver Tiles Grid -->
  <g stroke="#86efac" stroke-width="0.5" fill="#dcfce7">
    <rect x="6" y="6" width="34" height="26" rx="1"/>
    <rect x="44" y="6" width="34" height="26" rx="1"/>
    <rect x="82" y="6" width="34" height="26" rx="1"/>
    <rect x="120" y="6" width="34" height="26" rx="1"/>
    <rect x="6" y="36" width="34" height="26" rx="1"/>
    <rect x="44" y="36" width="34" height="26" rx="1"/>
    <rect x="82" y="36" width="34" height="26" rx="1"/>
    <rect x="120" y="36" width="34" height="26" rx="1"/>
  </g>
  <!-- Architectural Support Pillars -->
  <rect x="6" y="6" width="8" height="73" rx="2" fill="#4ade80"/>
  <rect x="54" y="6" width="8" height="73" rx="2" fill="#4ade80"/>
  <rect x="100" y="6" width="8" height="73" rx="2" fill="#4ade80"/>
  <rect x="146" y="6" width="8" height="73" rx="2" fill="#4ade80"/>
  <!-- Steps Leading In -->
  <rect x="58" y="70" width="44" height="6" rx="1" fill="#86efac" stroke="#16a34a" stroke-width="1"/>
  <rect x="62" y="76" width="36" height="4" rx="1" fill="#4ade80"/>
  <text x="80" y="44" text-anchor="middle" font-size="10" font-family="sans-serif" fill="#15803d" font-weight="bold">VERANDAH</text>
</svg>`,
  },
  {
    key: 'classroom',
    label: 'Classroom Lecture Hall',
    category: 'indoor',
    subcategory: 'Floor Plan Rooms',
    defaultWidth: 160,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="none">
  <rect x="2" y="2" width="156" height="116" rx="3" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
  <!-- Blackboard / Smart Board -->
  <rect x="14" y="8" width="132" height="18" rx="2" fill="#064e3b" stroke="#047857" stroke-width="1.5"/>
  <text x="80" y="20" font-size="9" text-anchor="middle" fill="#6ee7b7" font-weight="bold">SMART BOARD</text>
  <!-- Teacher Podium Desk -->
  <rect x="55" y="32" width="50" height="14" rx="2" fill="#fbbf24" stroke="#d97706" stroke-width="1"/>
  <!-- Student Desks Row 1 -->
  <g fill="#dbeafe" stroke="#93c5fd" stroke-width="1">
    <rect x="16" y="54" width="28" height="14" rx="2"/>
    <rect x="52" y="54" width="28" height="14" rx="2"/>
    <rect x="88" y="54" width="28" height="14" rx="2"/>
    <rect x="120" y="54" width="24" height="14" rx="2"/>
    <!-- Student Desks Row 2 -->
    <rect x="16" y="74" width="28" height="14" rx="2"/>
    <rect x="52" y="74" width="28" height="14" rx="2"/>
    <rect x="88" y="74" width="28" height="14" rx="2"/>
    <rect x="120" y="74" width="24" height="14" rx="2"/>
    <!-- Student Desks Row 3 -->
    <rect x="16" y="94" width="28" height="14" rx="2"/>
    <rect x="52" y="94" width="28" height="14" rx="2"/>
    <rect x="88" y="94" width="28" height="14" rx="2"/>
    <rect x="120" y="94" width="24" height="14" rx="2"/>
  </g>
</svg>`,
  },
  {
    key: 'conference_room',
    label: 'Executive Boardroom',
    category: 'indoor',
    subcategory: 'Floor Plan Rooms',
    defaultWidth: 160,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="none">
  <rect x="2" y="2" width="156" height="116" rx="3" fill="#f0f9ff" stroke="#0369a1" stroke-width="2"/>
  <!-- Oval Board Table -->
  <ellipse cx="80" cy="62" rx="58" ry="28" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <!-- 14 Executive Chairs -->
  <g fill="#a78bfa" stroke="#7c3aed" stroke-width="1">
    <rect x="36" y="24" width="12" height="9" rx="2"/>
    <rect x="56" y="22" width="12" height="9" rx="2"/>
    <rect x="76" y="20" width="12" height="9" rx="2"/>
    <rect x="96" y="22" width="12" height="9" rx="2"/>
    <rect x="116" y="24" width="12" height="9" rx="2"/>
    <rect x="36" y="88" width="12" height="9" rx="2"/>
    <rect x="56" y="90" width="12" height="9" rx="2"/>
    <rect x="76" y="92" width="12" height="9" rx="2"/>
    <rect x="96" y="90" width="12" height="9" rx="2"/>
    <rect x="116" y="88" width="12" height="9" rx="2"/>
    <rect x="14" y="56" width="9" height="12" rx="2"/>
    <rect x="138" y="56" width="9" height="12" rx="2"/>
  </g>
  <!-- Presentation Display -->
  <rect x="40" y="6" width="80" height="8" rx="2" fill="#334155"/>
  <text x="80" y="66" text-anchor="middle" font-size="8" font-family="sans-serif" fill="#92400e" font-weight="bold">BOARDROOM</text>
</svg>`,
  },
  {
    key: 'office_cubicle',
    label: '4-Person Office Workstation',
    category: 'indoor',
    subcategory: 'Floor Plan Rooms',
    defaultWidth: 120,
    defaultHeight: 100,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" preserveAspectRatio="none">
  <rect x="2" y="2" width="116" height="96" rx="2" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/>
  <!-- Fabric Partition Cross -->
  <line x1="8" y1="50" x2="112" y2="50" stroke="#64748b" stroke-width="4"/>
  <line x1="60" y1="8" x2="60" y2="92" stroke="#64748b" stroke-width="4"/>
  <!-- 4 Workstation Desks -->
  <g fill="#fbbf24" stroke="#d97706" stroke-width="1">
    <rect x="14" y="16" width="40" height="26" rx="2"/>
    <rect x="66" y="16" width="40" height="26" rx="2"/>
    <rect x="14" y="58" width="40" height="26" rx="2"/>
    <rect x="66" y="58" width="40" height="26" rx="2"/>
  </g>
  <!-- Monitors -->
  <rect x="26" y="18" width="16" height="6" rx="1" fill="#334155"/>
  <rect x="78" y="18" width="16" height="6" rx="1" fill="#334155"/>
  <rect x="26" y="76" width="16" height="6" rx="1" fill="#334155"/>
  <rect x="78" y="76" width="16" height="6" rx="1" fill="#334155"/>
</svg>`,
  },
  {
    key: 'server_room',
    label: 'IT Datacenter Server Racks',
    category: 'indoor',
    subcategory: 'Floor Plan Rooms',
    defaultWidth: 110,
    defaultHeight: 95,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 95" preserveAspectRatio="none">
  <rect x="2" y="2" width="106" height="91" rx="2" fill="#0f172a" stroke="#475569" stroke-width="2"/>
  <!-- Server Racks -->
  <g fill="#1e293b" stroke="#3b82f6" stroke-width="1.5">
    <rect x="10" y="12" width="26" height="70" rx="2"/>
    <rect x="42" y="12" width="26" height="70" rx="2"/>
    <rect x="74" y="12" width="26" height="70" rx="2"/>
  </g>
  <!-- Blinking Status LEDs -->
  <circle cx="16" cy="18" r="2" fill="#22c55e"/>
  <circle cx="16" cy="26" r="2" fill="#22c55e"/>
  <circle cx="16" cy="34" r="2" fill="#3b82f6"/>
  <circle cx="16" cy="42" r="2" fill="#22c55e"/>
  <circle cx="48" cy="18" r="2" fill="#22c55e"/>
  <circle cx="48" cy="26" r="2" fill="#ef4444"/>
  <circle cx="48" cy="34" r="2" fill="#22c55e"/>
  <circle cx="80" cy="18" r="2" fill="#22c55e"/>
  <circle cx="80" cy="26" r="2" fill="#3b82f6"/>
</svg>`,
  },
  {
    key: 'library_reading',
    label: 'Library Reading Room',
    category: 'indoor',
    subcategory: 'Floor Plan Rooms',
    defaultWidth: 160,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="none">
  <rect x="2" y="2" width="156" height="116" rx="2" fill="#fff7ed" stroke="#c2410c" stroke-width="2"/>
  <!-- Double-sided Bookstacks -->
  <g fill="#92400e" stroke="#78350f" stroke-width="1">
    <rect x="10" y="12" width="14" height="96" rx="2"/>
    <rect x="32" y="12" width="14" height="96" rx="2"/>
  </g>
  <!-- Long Study Desks & Lamps -->
  <rect x="58" y="18" width="92" height="34" rx="3" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/>
  <rect x="58" y="68" width="92" height="34" rx="3" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/>
  <line x1="58" y1="35" x2="150" y2="35" stroke="#d97706" stroke-width="1"/>
  <line x1="58" y1="85" x2="150" y2="85" stroke="#d97706" stroke-width="1"/>
</svg>`,
  },
  {
    key: 'canteen',
    label: 'Cafeteria Dining & Serving',
    category: 'indoor',
    subcategory: 'Floor Plan Rooms',
    defaultWidth: 160,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="none">
  <rect x="2" y="2" width="156" height="116" rx="2" fill="#fff7ed" stroke="#ea580c" stroke-width="2"/>
  <!-- Serving Line Counter -->
  <rect x="10" y="8" width="140" height="22" rx="3" fill="#fed7aa" stroke="#ea580c" stroke-width="1.5"/>
  <text x="80" y="22" font-size="8" text-anchor="middle" fill="#9a3412" font-weight="bold">FOOD SERVICE COUNTER</text>
  <!-- 4 Dining Table Clusters -->
  <rect x="16" y="44" width="56" height="26" rx="3" fill="#fef3c7" stroke="#d97706" stroke-width="1"/>
  <rect x="88" y="44" width="56" height="26" rx="3" fill="#fef3c7" stroke="#d97706" stroke-width="1"/>
  <rect x="16" y="82" width="56" height="26" rx="3" fill="#fef3c7" stroke="#d97706" stroke-width="1"/>
  <rect x="88" y="82" width="56" height="26" rx="3" fill="#fef3c7" stroke="#d97706" stroke-width="1"/>
</svg>`,
  },
  {
    key: 'wall_h',
    label: 'Horizontal Wall (Extendable)',
    category: 'indoor',
    subcategory: 'Structure',
    defaultWidth: 160,
    defaultHeight: 16,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 16" preserveAspectRatio="none">
  <rect x="0" y="0" width="160" height="16" fill="#475569" stroke="#1e293b" stroke-width="1"/>
  <rect x="0" y="0" width="160" height="3" fill="#64748b"/>
  <rect x="0" y="13" width="160" height="3" fill="#334155"/>
</svg>`,
  },
  {
    key: 'wall_v',
    label: 'Vertical Wall (Extendable)',
    category: 'indoor',
    subcategory: 'Structure',
    defaultWidth: 16,
    defaultHeight: 160,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 160" preserveAspectRatio="none">
  <rect x="0" y="0" width="16" height="160" fill="#475569" stroke="#1e293b" stroke-width="1"/>
  <rect x="0" y="0" width="3" height="160" fill="#64748b"/>
  <rect x="13" y="0" width="3" height="160" fill="#334155"/>
</svg>`,
  },
  {
    key: 'door_single',
    label: 'Single Swing Door',
    category: 'indoor',
    subcategory: 'Structure',
    defaultWidth: 55,
    defaultHeight: 55,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 55 55" preserveAspectRatio="none">
  <rect x="0" y="0" width="6" height="55" fill="#475569"/>
  <!-- Door Leaf open 60 deg -->
  <rect x="6" y="6" width="42" height="4" rx="1" fill="#94a3b8" transform="rotate(-60 6 6)"/>
  <!-- Swing Arc -->
  <path d="M6 6 A42 42 0 0 1 48 48" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.6"/>
  <circle cx="36" cy="28" r="2" fill="#2563eb"/>
</svg>`,
  },
  {
    key: 'door_double',
    label: 'Double Swing Door',
    category: 'indoor',
    subcategory: 'Structure',
    defaultWidth: 90,
    defaultHeight: 50,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 50" preserveAspectRatio="none">
  <rect x="0" y="0" width="6" height="50" fill="#475569"/>
  <rect x="84" y="0" width="6" height="50" fill="#475569"/>
  <!-- Left Leaf & Arc -->
  <rect x="6" y="6" width="36" height="4" rx="1" fill="#94a3b8" transform="rotate(-50 6 6)"/>
  <path d="M6 6 A36 36 0 0 1 42 42" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="3 3"/>
  <!-- Right Leaf & Arc -->
  <rect x="84" y="6" width="36" height="4" rx="1" fill="#94a3b8" transform="rotate(-130 84 6)"/>
  <path d="M84 6 A36 36 0 0 0 48 42" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="3 3"/>
</svg>`,
  },
  {
    key: 'sliding_door',
    label: 'Pocket Sliding Glass Door',
    category: 'indoor',
    subcategory: 'Structure',
    defaultWidth: 80,
    defaultHeight: 20,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 20" preserveAspectRatio="none">
  <rect x="0" y="6" width="80" height="8" rx="1" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
  <!-- Glass Panes -->
  <rect x="4" y="4" width="36" height="6" rx="1" fill="#93c5fd" stroke="#3b82f6" stroke-width="1"/>
  <rect x="40" y="10" width="36" height="6" rx="1" fill="#93c5fd" stroke="#3b82f6" stroke-width="1"/>
  <!-- Slide Arrows -->
  <line x1="20" y1="7" x2="32" y2="7" stroke="#1d4ed8" stroke-width="1"/>
  <line x1="50" y1="13" x2="62" y2="13" stroke="#1d4ed8" stroke-width="1"/>
</svg>`,
  },
  {
    key: 'window',
    label: 'Architectural Window',
    category: 'indoor',
    subcategory: 'Structure',
    defaultWidth: 80,
    defaultHeight: 18,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 18" preserveAspectRatio="none">
  <rect x="0" y="0" width="80" height="18" fill="#475569"/>
  <!-- Double Glass Panes -->
  <rect x="3" y="3" width="34" height="12" fill="#bfdbfe"/>
  <rect x="43" y="3" width="34" height="12" fill="#bfdbfe"/>
  <line x1="40" y1="0" x2="40" y2="18" stroke="#ffffff" stroke-width="2"/>
</svg>`,
  },
  {
    key: 'staircase_plan',
    label: 'Staircase Flight (UP)',
    category: 'indoor',
    subcategory: 'Structure',
    defaultWidth: 90,
    defaultHeight: 110,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 110" preserveAspectRatio="none">
  <rect x="2" y="2" width="86" height="106" rx="2" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
  <!-- Steps -->
  <line x1="2" y1="16" x2="88" y2="16" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="2" y1="30" x2="88" y2="30" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="2" y1="44" x2="88" y2="44" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="2" y1="58" x2="88" y2="58" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="2" y1="72" x2="88" y2="72" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="2" y1="86" x2="88" y2="86" stroke="#94a3b8" stroke-width="1.5"/>
  <!-- Direction Arrow Up -->
  <line x1="45" y1="96" x2="45" y2="10" stroke="#4f46e5" stroke-width="2"/>
  <polygon points="45,4 40,14 50,14" fill="#4f46e5"/>
  <circle cx="45" cy="98" r="3" fill="#4f46e5"/>
  <text x="45" y="106" text-anchor="middle" font-size="7" font-family="sans-serif" fill="#4f46e5" font-weight="bold">UP ↑</text>
</svg>`,
  },
  {
    key: 'column',
    label: 'Structural Concrete Column',
    category: 'indoor',
    subcategory: 'Structure',
    defaultWidth: 26,
    defaultHeight: 26,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26" preserveAspectRatio="none">
  <rect x="2" y="2" width="22" height="22" rx="2" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
  <line x1="2" y1="2" x2="24" y2="24" stroke="#64748b" stroke-width="1.5"/>
  <line x1="24" y1="2" x2="2" y2="24" stroke="#64748b" stroke-width="1.5"/>
</svg>`,
  },
  {
    key: 'table_desk',
    label: 'Executive Wooden Desk',
    category: 'indoor',
    subcategory: 'Furniture',
    defaultWidth: 85,
    defaultHeight: 50,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 85 50" preserveAspectRatio="none">
  <rect x="4" y="6" width="77" height="38" rx="3" fill="#fef3c7" stroke="#b45309" stroke-width="2"/>
  <!-- Wood grain lines -->
  <line x1="8" y1="16" x2="77" y2="16" stroke="#fcd34d" stroke-width="1"/>
  <line x1="8" y1="26" x2="77" y2="26" stroke="#fcd34d" stroke-width="1"/>
  <line x1="8" y1="36" x2="77" y2="36" stroke="#fcd34d" stroke-width="1"/>
  <!-- Drawer Handles -->
  <rect x="68" y="10" width="10" height="4" rx="1" fill="#78350f"/>
  <rect x="68" y="34" width="10" height="4" rx="1" fill="#78350f"/>
</svg>`,
  },
  {
    key: 'chair',
    label: 'Ergonomic Office Chair',
    category: 'indoor',
    subcategory: 'Furniture',
    defaultWidth: 40,
    defaultHeight: 40,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" preserveAspectRatio="none">
  <!-- Seat Cushion -->
  <rect x="6" y="14" width="28" height="20" rx="6" fill="#8b5cf6" stroke="#6d28d9" stroke-width="1.5"/>
  <!-- Curved Backrest -->
  <rect x="6" y="4" width="28" height="10" rx="4" fill="#6d28d9"/>
  <!-- Armrests -->
  <rect x="2" y="14" width="4" height="16" rx="2" fill="#4c1d95"/>
  <rect x="34" y="14" width="4" height="16" rx="2" fill="#4c1d95"/>
</svg>`,
  },
  {
    key: 'sofa_set',
    label: '3-Seater Living Room Couch',
    category: 'indoor',
    subcategory: 'Furniture',
    defaultWidth: 100,
    defaultHeight: 45,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 45" preserveAspectRatio="none">
  <rect x="4" y="6" width="92" height="34" rx="6" fill="#a78bfa" stroke="#6d28d9" stroke-width="1.5"/>
  <!-- Back Cushion -->
  <rect x="4" y="6" width="92" height="10" rx="3" fill="#6d28d9"/>
  <!-- Seat Cushions -->
  <rect x="14" y="16" width="22" height="18" rx="3" fill="#c4b5fd"/>
  <rect x="39" y="16" width="22" height="18" rx="3" fill="#c4b5fd"/>
  <rect x="64" y="16" width="22" height="18" rx="3" fill="#c4b5fd"/>
</svg>`,
  },
  {
    key: 'cafeteria_table',
    label: 'Round Dining Table + 4 Chairs',
    category: 'indoor',
    subcategory: 'Furniture',
    defaultWidth: 65,
    defaultHeight: 65,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 65 65" preserveAspectRatio="none">
  <circle cx="32" cy="32" r="20" fill="#fde68a" stroke="#d97706" stroke-width="1.5"/>
  <!-- 4 Surrounding Chairs -->
  <circle cx="32" cy="6" r="5" fill="#a78bfa" stroke="#7c3aed"/>
  <circle cx="32" cy="58" r="5" fill="#a78bfa" stroke="#7c3aed"/>
  <circle cx="6" cy="32" r="5" fill="#a78bfa" stroke="#7c3aed"/>
  <circle cx="58" cy="32" r="5" fill="#a78bfa" stroke="#7c3aed"/>
</svg>`,
  },
  {
    key: 'whiteboard',
    label: 'Mobile Whiteboard',
    category: 'indoor',
    subcategory: 'Furniture',
    defaultWidth: 70,
    defaultHeight: 25,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 25" preserveAspectRatio="none">
  <rect x="4" y="4" width="62" height="16" rx="2" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
  <line x1="12" y1="8" x2="36" y2="8" stroke="#3b82f6" stroke-width="1"/>
  <line x1="12" y1="12" x2="52" y2="12" stroke="#64748b" stroke-width="1"/>
  <!-- Marker Tray -->
  <rect x="20" y="20" width="30" height="3" fill="#475569"/>
</svg>`,
  },
  {
    key: 'filing_cabinet',
    label: '4-Drawer Steel File Cabinet',
    category: 'indoor',
    subcategory: 'Furniture',
    defaultWidth: 40,
    defaultHeight: 50,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 50" preserveAspectRatio="none">
  <rect x="2" y="2" width="36" height="46" rx="2" fill="#64748b" stroke="#334155" stroke-width="1.5"/>
  <!-- 4 Drawers -->
  <rect x="5" y="5" width="30" height="9" fill="#94a3b8"/>
  <rect x="16" y="9" width="8" height="2" rx="1" fill="#1e293b"/>
  <rect x="5" y="16" width="30" height="9" fill="#94a3b8"/>
  <rect x="16" y="20" width="8" height="2" rx="1" fill="#1e293b"/>
  <rect x="5" y="27" width="30" height="9" fill="#94a3b8"/>
  <rect x="16" y="31" width="8" height="2" rx="1" fill="#1e293b"/>
  <rect x="5" y="38" width="30" height="9" fill="#94a3b8"/>
  <rect x="16" y="42" width="8" height="2" rx="1" fill="#1e293b"/>
</svg>`,
  },
  {
    key: 'water_cooler',
    label: 'Drinking Water Dispenser',
    category: 'indoor',
    subcategory: 'Furniture',
    defaultWidth: 30,
    defaultHeight: 45,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 45" preserveAspectRatio="none">
  <!-- Water Bottle on Top -->
  <rect x="8" y="4" width="14" height="18" rx="4" fill="#38bdf8" stroke="#0284c7" stroke-width="1"/>
  <!-- Dispenser Base -->
  <rect x="5" y="22" width="20" height="20" rx="2" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
  <circle cx="11" cy="27" r="2" fill="#3b82f6"/>
  <circle cx="19" cy="27" r="2" fill="#ef4444"/>
</svg>`,
  },
  {
    key: 'printer_station',
    label: 'Multifunction Network Copier',
    category: 'indoor',
    subcategory: 'Furniture',
    defaultWidth: 50,
    defaultHeight: 50,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" preserveAspectRatio="none">
  <rect x="4" y="6" width="42" height="38" rx="3" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
  <rect x="10" y="10" width="30" height="12" rx="1" fill="#38bdf8" opacity="0.6"/>
  <rect x="12" y="26" width="26" height="4" rx="1" fill="#334155"/>
  <rect x="8" y="34" width="34" height="8" rx="1" fill="#cbd5e1"/>
</svg>`,
  },
  {
    key: 'elevator',
    label: 'Passenger Elevator / Lift',
    category: 'indoor',
    subcategory: 'Stairs & Elevators',
    defaultWidth: 65,
    defaultHeight: 75,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 65 75" preserveAspectRatio="none">
  <rect x="2" y="2" width="61" height="71" rx="4" fill="#f1f5f9" stroke="#475569" stroke-width="2"/>
  <!-- Sliding Stainless Doors -->
  <rect x="6" y="8" width="24" height="56" rx="2" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1"/>
  <rect x="35" y="8" width="24" height="56" rx="2" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1"/>
  <!-- Up/Down Display -->
  <circle cx="32" cy="18" r="4" fill="#22c55e"/>
  <text x="32" y="21" font-size="6" text-anchor="middle" fill="#ffffff">▲</text>
  <text x="32" y="70" font-size="7" text-anchor="middle" font-family="sans-serif" fill="#475569" font-weight="bold">ELEVATOR</text>
</svg>`,
  },
  {
    key: 'escalator',
    label: 'Moving Escalator Pair',
    category: 'indoor',
    subcategory: 'Stairs & Elevators',
    defaultWidth: 70,
    defaultHeight: 90,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 90" preserveAspectRatio="none">
  <rect x="2" y="2" width="66" height="86" rx="3" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
  <!-- Up Escalator -->
  <rect x="6" y="6" width="26" height="78" rx="2" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
  <line x1="6" y1="20" x2="32" y2="20" stroke="#64748b" stroke-width="1"/>
  <line x1="6" y1="40" x2="32" y2="40" stroke="#64748b" stroke-width="1"/>
  <line x1="6" y1="60" x2="32" y2="60" stroke="#64748b" stroke-width="1"/>
  <text x="19" y="80" font-size="7" text-anchor="middle" fill="#16a34a">↑ UP</text>
  <!-- Down Escalator -->
  <rect x="38" y="6" width="26" height="78" rx="2" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
  <line x1="38" y1="20" x2="64" y2="20" stroke="#64748b" stroke-width="1"/>
  <line x1="38" y1="40" x2="64" y2="40" stroke="#64748b" stroke-width="1"/>
  <line x1="38" y1="60" x2="64" y2="60" stroke="#64748b" stroke-width="1"/>
  <text x="51" y="80" font-size="7" text-anchor="middle" fill="#dc2626">↓ DN</text>
</svg>`,
  },
  {
    key: 'ramp_indoor',
    label: 'Wheelchair Accessible Floor Ramp',
    category: 'indoor',
    subcategory: 'Stairs & Elevators',
    defaultWidth: 110,
    defaultHeight: 40,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 40" preserveAspectRatio="none">
  <rect x="2" y="4" width="106" height="32" rx="2" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/>
  <polygon points="10,32 100,8 100,32" fill="#38bdf8" opacity="0.3"/>
  <text x="40" y="24" font-size="12" fill="#0284c7">♿</text>
  <text x="75" y="24" font-size="8" font-family="sans-serif" fill="#0284c7" font-weight="bold">RAMP ↑</text>
</svg>`,
  },
  {
    key: 'reception_desk',
    label: 'Curved Reception Counter',
    category: 'indoor',
    subcategory: 'Stairs & Elevators',
    defaultWidth: 120,
    defaultHeight: 65,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 65" preserveAspectRatio="none">
  <!-- Curved Desk -->
  <path d="M10 50 Q60 10 110 50 L100 58 Q60 22 20 58 Z" fill="#fbbf24" stroke="#d97706" stroke-width="2"/>
  <text x="60" y="38" font-size="8" text-anchor="middle" font-family="sans-serif" fill="#92400e" font-weight="bold">RECEPTION</text>
  <!-- Receptionist Chair -->
  <circle cx="60" cy="18" r="6" fill="#a78bfa"/>
</svg>`,
  },
  {
    key: 'lobby_lounge',
    label: 'Waiting Lounge Suite',
    category: 'indoor',
    subcategory: 'Stairs & Elevators',
    defaultWidth: 130,
    defaultHeight: 90,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 90" preserveAspectRatio="none">
  <!-- Area Rug -->
  <rect x="6" y="6" width="118" height="78" rx="4" fill="#ede9fe" stroke="#c4b5fd" stroke-width="1.5"/>
  <!-- Glass Coffee Table -->
  <rect x="45" y="30" width="40" height="30" rx="3" fill="#bfdbfe" stroke="#3b82f6" stroke-width="1"/>
  <!-- 4 Lounge Armchairs -->
  <rect x="14" y="30" width="22" height="30" rx="4" fill="#a78bfa"/>
  <rect x="94" y="30" width="22" height="30" rx="4" fill="#a78bfa"/>
  <rect x="50" y="10" width="30" height="15" rx="3" fill="#a78bfa"/>
  <rect x="50" y="65" width="30" height="15" rx="3" fill="#a78bfa"/>
</svg>`,
  },
  {
    key: 'fire_exit',
    label: 'Emergency Fire Exit',
    category: 'indoor',
    subcategory: 'Safety',
    defaultWidth: 55,
    defaultHeight: 55,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 55 55" preserveAspectRatio="none">
  <rect x="2" y="2" width="51" height="51" rx="4" fill="#15803d" stroke="#166534" stroke-width="2"/>
  <!-- Running Figure -->
  <circle cx="24" cy="14" r="5" fill="#ffffff"/>
  <line x1="24" y1="19" x2="22" y2="30" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
  <line x1="22" y1="24" x2="16" y2="20" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="22" y1="24" x2="28" y2="26" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="22" y1="30" x2="16" y2="38" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="22" y1="30" x2="28" y2="38" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Door & Arrow -->
  <rect x="32" y="16" width="14" height="24" rx="2" fill="none" stroke="#ffffff" stroke-width="2"/>
  <polygon points="40,36 46,30 40,24" fill="#ffffff"/>
  <text x="27" y="50" text-anchor="middle" font-size="6" font-family="sans-serif" fill="#ffffff" font-weight="bold">EXIT</text>
</svg>`,
  },
  {
    key: 'fire_extinguisher',
    label: 'Fire Extinguisher Station',
    category: 'indoor',
    subcategory: 'Safety',
    defaultWidth: 35,
    defaultHeight: 55,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 35 55" preserveAspectRatio="none">
  <rect x="9" y="14" width="17" height="34" rx="8" fill="#dc2626"/>
  <rect x="11" y="10" width="13" height="6" rx="2" fill="#b91c1c"/>
  <rect x="8" y="8" width="19" height="4" rx="2" fill="#374151"/>
  <!-- Nozzle & Hose -->
  <path d="M24 20 Q32 20 30 32 Q28 40 22 40" stroke="#374151" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <rect x="18" y="38" width="8" height="4" rx="1" fill="#1f2937"/>
  <rect x="9" y="26" width="17" height="8" rx="1" fill="#ffffff" opacity="0.4"/>
</svg>`,
  },
  {
    key: 'first_aid',
    label: 'First Aid Medical Box',
    category: 'indoor',
    subcategory: 'Safety',
    defaultWidth: 45,
    defaultHeight: 45,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" preserveAspectRatio="none">
  <rect x="2" y="2" width="41" height="41" rx="6" fill="#16a34a" stroke="#15803d" stroke-width="2"/>
  <rect x="18" y="9" width="9" height="27" rx="2" fill="#ffffff"/>
  <rect x="9" y="18" width="27" height="9" rx="2" fill="#ffffff"/>
</svg>`,
  },
  {
    key: 'fire_hose_reel',
    label: 'Fire Hose Reel Cabinet',
    category: 'indoor',
    subcategory: 'Safety',
    defaultWidth: 50,
    defaultHeight: 50,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" preserveAspectRatio="none">
  <rect x="2" y="2" width="46" height="46" rx="4" fill="#dc2626" stroke="#991b1b" stroke-width="2"/>
  <!-- Reel Drum -->
  <circle cx="25" cy="25" r="16" fill="#f87171" stroke="#ffffff" stroke-width="1.5"/>
  <circle cx="25" cy="25" r="7" fill="#dc2626"/>
  <text x="25" y="45" font-size="6" text-anchor="middle" font-family="sans-serif" fill="#ffffff" font-weight="bold">HOSE REEL</text>
</svg>`,
  },
  {
    key: 'emergency_eye_wash',
    label: 'Emergency Eye Wash Station',
    category: 'indoor',
    subcategory: 'Safety',
    defaultWidth: 45,
    defaultHeight: 55,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 55" preserveAspectRatio="none">
  <rect x="2" y="2" width="41" height="51" rx="3" fill="#15803d" stroke="#166534" stroke-width="2"/>
  <!-- Eye Wash Basin -->
  <ellipse cx="22" cy="26" rx="14" ry="8" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.5"/>
  <circle cx="17" cy="24" r="3" fill="#38bdf8"/>
  <circle cx="27" cy="24" r="3" fill="#38bdf8"/>
  <text x="22" y="46" font-size="6" text-anchor="middle" font-family="sans-serif" fill="#ffffff" font-weight="bold">EYE WASH</text>
</svg>`,
  },
  // ── STAIRS & ELEVATORS (VERTICAL TRANSIT) ──────────────────────────────────
  {
    key: 'stairs_straight_flight',
    label: 'Straight Staircase (Flight UP/DN)',
    category: 'indoor',
    subcategory: 'Stairs & Elevators',
    defaultWidth: 70,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 120" preserveAspectRatio="none">
  <rect x="2" y="2" width="66" height="116" rx="3" fill="#f8fafc" stroke="#334155" stroke-width="2.5"/>
  <rect x="6" y="6" width="58" height="18" fill="#e2e8f0" stroke="#64748b" stroke-width="1"/>
  <text x="35" y="18" font-size="8" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="#475569">LANDING</text>
  <line x1="6" y1="32" x2="64" y2="32" stroke="#475569" stroke-width="1.5"/>
  <line x1="6" y1="40" x2="64" y2="40" stroke="#475569" stroke-width="1.5"/>
  <line x1="6" y1="48" x2="64" y2="48" stroke="#475569" stroke-width="1.5"/>
  <line x1="6" y1="56" x2="64" y2="56" stroke="#475569" stroke-width="1.5"/>
  <line x1="6" y1="64" x2="64" y2="64" stroke="#475569" stroke-width="1.5"/>
  <line x1="6" y1="72" x2="64" y2="72" stroke="#475569" stroke-width="1.5"/>
  <line x1="6" y1="80" x2="64" y2="80" stroke="#475569" stroke-width="1.5"/>
  <line x1="6" y1="88" x2="64" y2="88" stroke="#475569" stroke-width="1.5"/>
  <line x1="6" y1="96" x2="64" y2="96" stroke="#475569" stroke-width="1.5"/>
  <line x1="35" y1="108" x2="35" y2="28" stroke="#2563eb" stroke-width="2.5"/>
  <polygon points="35,22 30,30 40,30" fill="#2563eb"/>
  <circle cx="35" cy="110" r="3" fill="#2563eb"/>
  <text x="35" y="117" font-size="8" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="#2563eb">UP</text>
  <line x1="5" y1="4" x2="5" y2="116" stroke="#0f172a" stroke-width="2"/>
  <line x1="65" y1="4" x2="65" y2="116" stroke="#0f172a" stroke-width="2"/>
</svg>`,
  },
  {
    key: 'stairs_l_shape',
    label: 'L-Shape Switchback Stairwell',
    category: 'indoor',
    subcategory: 'Stairs & Elevators',
    defaultWidth: 110,
    defaultHeight: 110,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 110" preserveAspectRatio="none">
  <polygon points="2,2 108,2 108,55 55,55 55,108 2,108" fill="#f8fafc" stroke="#334155" stroke-width="2.5"/>
  <rect x="55" y="2" width="53" height="53" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5"/>
  <text x="81" y="30" font-size="8" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="#475569">LANDING</text>
  <line x1="12" y1="2" x2="12" y2="55" stroke="#475569" stroke-width="1.5"/>
  <line x1="22" y1="2" x2="22" y2="55" stroke="#475569" stroke-width="1.5"/>
  <line x1="32" y1="2" x2="32" y2="55" stroke="#475569" stroke-width="1.5"/>
  <line x1="42" y1="2" x2="42" y2="55" stroke="#475569" stroke-width="1.5"/>
  <line x1="2" y1="65" x2="55" y2="65" stroke="#475569" stroke-width="1.5"/>
  <line x1="2" y1="75" x2="55" y2="75" stroke="#475569" stroke-width="1.5"/>
  <line x1="2" y1="85" x2="55" y2="85" stroke="#475569" stroke-width="1.5"/>
  <line x1="2" y1="95" x2="55" y2="95" stroke="#475569" stroke-width="1.5"/>
  <path d="M 28 102 L 28 28 L 50 28" fill="none" stroke="#2563eb" stroke-width="2.5"/>
  <polygon points="54,28 46,24 46,32" fill="#2563eb"/>
  <circle cx="28" cy="104" r="3" fill="#2563eb"/>
  <text x="28" y="100" font-size="7" font-weight="bold" fill="#2563eb" text-anchor="middle">UP</text>
</svg>`,
  },
  {
    key: 'stairs_u_shape',
    label: 'U-Shape Double Flight Staircase',
    category: 'indoor',
    subcategory: 'Stairs & Elevators',
    defaultWidth: 100,
    defaultHeight: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" preserveAspectRatio="none">
  <rect x="2" y="2" width="96" height="116" rx="3" fill="#f8fafc" stroke="#334155" stroke-width="2.5"/>
  <rect x="4" y="4" width="92" height="30" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5"/>
  <text x="50" y="21" font-size="8" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="#475569">HALF LANDING</text>
  <rect x="46" y="34" width="8" height="82" fill="#cbd5e1" stroke="#64748b" stroke-width="1"/>
  <line x1="4" y1="46" x2="46" y2="46" stroke="#475569" stroke-width="1.5"/>
  <line x1="4" y1="58" x2="46" y2="58" stroke="#475569" stroke-width="1.5"/>
  <line x1="4" y1="70" x2="46" y2="70" stroke="#475569" stroke-width="1.5"/>
  <line x1="4" y1="82" x2="46" y2="82" stroke="#475569" stroke-width="1.5"/>
  <line x1="4" y1="94" x2="46" y2="94" stroke="#475569" stroke-width="1.5"/>
  <line x1="4" y1="106" x2="46" y2="106" stroke="#475569" stroke-width="1.5"/>
  <path d="M 25 112 L 25 38" fill="none" stroke="#2563eb" stroke-width="2"/>
  <polygon points="25,34 22,40 28,40" fill="#2563eb"/>
  <text x="25" y="114" font-size="7" font-weight="bold" fill="#2563eb" text-anchor="middle">UP</text>
  <line x1="54" y1="46" x2="96" y2="46" stroke="#475569" stroke-width="1.5"/>
  <line x1="54" y1="58" x2="96" y2="58" stroke="#475569" stroke-width="1.5"/>
  <line x1="54" y1="70" x2="96" y2="70" stroke="#475569" stroke-width="1.5"/>
  <line x1="54" y1="82" x2="96" y2="82" stroke="#475569" stroke-width="1.5"/>
  <line x1="54" y1="94" x2="96" y2="94" stroke="#475569" stroke-width="1.5"/>
  <line x1="54" y1="106" x2="96" y2="106" stroke="#475569" stroke-width="1.5"/>
  <path d="M 75 38 L 75 110" fill="none" stroke="#dc2626" stroke-width="2"/>
  <polygon points="75,114 72,108 78,108" fill="#dc2626"/>
  <text x="75" y="44" font-size="7" font-weight="bold" fill="#dc2626" text-anchor="middle">DN</text>
</svg>`,
  },
  {
    key: 'stairs_spiral',
    label: 'Spiral Helical Staircase',
    category: 'indoor',
    subcategory: 'Stairs & Elevators',
    defaultWidth: 100,
    defaultHeight: 100,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
  <circle cx="50" cy="50" r="46" fill="#f8fafc" stroke="#334155" stroke-width="2.5"/>
  <line x1="50" y1="50" x2="50" y2="4" stroke="#475569" stroke-width="1.5"/>
  <line x1="50" y1="50" x2="73" y2="10" stroke="#475569" stroke-width="1.5"/>
  <line x1="50" y1="50" x2="89" y2="27" stroke="#475569" stroke-width="1.5"/>
  <line x1="50" y1="50" x2="96" y2="50" stroke="#475569" stroke-width="1.5"/>
  <line x1="50" y1="50" x2="89" y2="73" stroke="#475569" stroke-width="1.5"/>
  <line x1="50" y1="50" x2="73" y2="89" stroke="#475569" stroke-width="1.5"/>
  <line x1="50" y1="50" x2="50" y2="96" stroke="#475569" stroke-width="1.5"/>
  <line x1="50" y1="50" x2="27" y2="89" stroke="#475569" stroke-width="1.5"/>
  <line x1="50" y1="50" x2="11" y2="73" stroke="#475569" stroke-width="1.5"/>
  <line x1="50" y1="50" x2="4" y2="50" stroke="#475569" stroke-width="1.5"/>
  <line x1="50" y1="50" x2="11" y2="27" stroke="#475569" stroke-width="1.5"/>
  <line x1="50" y1="50" x2="27" y2="10" stroke="#475569" stroke-width="1.5"/>
  <path d="M 50 18 A 32 32 0 1 1 20 60" fill="none" stroke="#2563eb" stroke-width="2.5"/>
  <polygon points="18,66 16,58 24,61" fill="#2563eb"/>
  <circle cx="50" cy="50" r="10" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
  <text x="50" y="53" font-size="7" font-weight="bold" fill="#ffffff" text-anchor="middle">UP</text>
</svg>`,
  },
  {
    key: 'stairs_fire_escape',
    label: 'Emergency Fire Escape Stairs',
    category: 'indoor',
    subcategory: 'Stairs & Elevators',
    defaultWidth: 80,
    defaultHeight: 110,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 110" preserveAspectRatio="none">
  <rect x="2" y="2" width="76" height="106" rx="2" fill="#18181b" stroke="#ef4444" stroke-width="2.5"/>
  <line x1="6" y1="6" x2="74" y2="6" stroke="#eab308" stroke-width="2" stroke-dasharray="4,4"/>
  <line x1="6" y1="104" x2="74" y2="104" stroke="#eab308" stroke-width="2" stroke-dasharray="4,4"/>
  <rect x="6" y="14" width="68" height="8" fill="#3f3f46" stroke="#71717a" stroke-width="1"/>
  <rect x="6" y="26" width="68" height="8" fill="#3f3f46" stroke="#71717a" stroke-width="1"/>
  <rect x="6" y="38" width="68" height="8" fill="#3f3f46" stroke="#71717a" stroke-width="1"/>
  <rect x="6" y="50" width="68" height="8" fill="#3f3f46" stroke="#71717a" stroke-width="1"/>
  <rect x="6" y="62" width="68" height="8" fill="#3f3f46" stroke="#71717a" stroke-width="1"/>
  <rect x="6" y="74" width="68" height="8" fill="#3f3f46" stroke="#71717a" stroke-width="1"/>
  <rect x="6" y="86" width="68" height="8" fill="#3f3f46" stroke="#71717a" stroke-width="1"/>
  <text x="40" y="7" font-size="6" fill="#ef4444" font-family="sans-serif" font-weight="bold" text-anchor="middle">EMERGENCY EXIT</text>
  <text x="40" y="101" font-size="8" fill="#22c55e" font-family="sans-serif" font-weight="bold" text-anchor="middle">FIRE ESCAPE</text>
</svg>`,
  },
  {
    key: 'elevator_single_passenger',
    label: 'Modern Passenger Elevator',
    category: 'indoor',
    subcategory: 'Stairs & Elevators',
    defaultWidth: 80,
    defaultHeight: 80,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" preserveAspectRatio="none">
  <rect x="2" y="2" width="76" height="76" rx="4" fill="#f1f5f9" stroke="#334155" stroke-width="2.5"/>
  <rect x="6" y="6" width="68" height="68" rx="2" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <rect x="10" y="10" width="60" height="10" fill="#e0f2fe" opacity="0.6"/>
  <line x1="8" y1="22" x2="72" y2="22" stroke="#64748b" stroke-width="2"/>
  <rect x="10" y="60" width="28" height="12" rx="1" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
  <rect x="42" y="60" width="28" height="12" rx="1" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
  <line x1="39" y1="58" x2="39" y2="74" stroke="#0f172a" stroke-width="1.5"/>
  <line x1="41" y1="58" x2="41" y2="74" stroke="#0f172a" stroke-width="1.5"/>
  <rect x="28" y="32" width="24" height="18" rx="2" fill="#0f172a"/>
  <text x="40" y="44" font-size="10" font-family="sans-serif" font-weight="bold" fill="#22c55e" text-anchor="middle">▲ L1</text>
  <text x="40" y="55" font-size="6" font-family="sans-serif" fill="#64748b" text-anchor="middle">ELEVATOR</text>
</svg>`,
  },
  {
    key: 'elevator_double_shaft',
    label: 'Double Shaft Elevator Bank',
    category: 'indoor',
    subcategory: 'Stairs & Elevators',
    defaultWidth: 140,
    defaultHeight: 80,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 80" preserveAspectRatio="none">
  <rect x="2" y="2" width="136" height="76" rx="4" fill="#f8fafc" stroke="#334155" stroke-width="2.5"/>
  <rect x="6" y="6" width="60" height="68" rx="2" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <rect x="10" y="58" width="24" height="14" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
  <rect x="38" y="58" width="24" height="14" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
  <text x="36" y="38" font-size="8" font-family="sans-serif" font-weight="bold" fill="#2563eb" text-anchor="middle">LIFT 1 ▲</text>
  <rect x="74" y="6" width="60" height="68" rx="2" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <rect x="78" y="58" width="24" height="14" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
  <rect x="106" y="58" width="24" height="14" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
  <text x="104" y="38" font-size="8" font-family="sans-serif" font-weight="bold" fill="#2563eb" text-anchor="middle">LIFT 2 ▼</text>
  <line x1="70" y1="4" x2="70" y2="76" stroke="#475569" stroke-width="2"/>
  <text x="70" y="75" font-size="6" font-family="sans-serif" font-weight="bold" fill="#475569" text-anchor="middle">ELEVATOR BANK</text>
</svg>`,
  },
  {
    key: 'elevator_panoramic_glass',
    label: 'Panoramic Glass Lift',
    category: 'indoor',
    subcategory: 'Stairs & Elevators',
    defaultWidth: 85,
    defaultHeight: 85,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 85 85" preserveAspectRatio="none">
  <path d="M 10 35 A 32 32 0 0 1 75 35 L 75 75 L 10 75 Z" fill="#e0f2fe" stroke="#0284c7" stroke-width="2" opacity="0.8"/>
  <path d="M 16 35 A 26 26 0 0 1 69 35" fill="none" stroke="#38bdf8" stroke-width="3"/>
  <circle cx="10" cy="35" r="4" fill="#64748b"/>
  <circle cx="75" cy="35" r="4" fill="#64748b"/>
  <rect x="15" y="40" width="55" height="30" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <text x="42" y="52" font-size="8" font-family="sans-serif" font-weight="bold" fill="#0369a1" text-anchor="middle">GLASS LIFT</text>
  <text x="42" y="63" font-size="7" font-family="sans-serif" fill="#0284c7" text-anchor="middle">▲ PANORAMIC</text>
</svg>`,
  },
  {
    key: 'elevator_freight_cargo',
    label: 'Service & Freight Cargo Elevator',
    category: 'indoor',
    subcategory: 'Stairs & Elevators',
    defaultWidth: 100,
    defaultHeight: 90,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 90" preserveAspectRatio="none">
  <rect x="2" y="2" width="96" height="86" rx="2" fill="#334155" stroke="#0f172a" stroke-width="3"/>
  <rect x="6" y="6" width="88" height="78" fill="#f8fafc" stroke="#eab308" stroke-width="2" stroke-dasharray="8,6"/>
  <rect x="12" y="12" width="36" height="66" fill="#64748b" stroke="#1e293b" stroke-width="1.5"/>
  <rect x="52" y="12" width="36" height="66" fill="#64748b" stroke="#1e293b" stroke-width="1.5"/>
  <text x="50" y="44" font-size="8" font-family="sans-serif" font-weight="bold" fill="#f8fafc" text-anchor="middle">FREIGHT</text>
  <text x="50" y="55" font-size="6" font-family="sans-serif" font-weight="bold" fill="#facc15" text-anchor="middle">MAX 3000 KG</text>
</svg>`,
  },
  {
    key: 'elevator_accessible',
    label: 'ADA Wheelchair Accessible Elevator',
    category: 'indoor',
    subcategory: 'Stairs & Elevators',
    defaultWidth: 80,
    defaultHeight: 80,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" preserveAspectRatio="none">
  <rect x="2" y="2" width="76" height="76" rx="4" fill="#eff6ff" stroke="#2563eb" stroke-width="2.5"/>
  <circle cx="40" cy="32" r="16" fill="#2563eb"/>
  <text x="40" y="39" font-size="20" fill="#ffffff" text-anchor="middle">♿</text>
  <rect x="8" y="28" width="6" height="24" rx="1" fill="#1e293b"/>
  <rect x="10" y="62" width="60" height="12" rx="1" fill="#93c5fd" stroke="#1d4ed8" stroke-width="1.5"/>
  <text x="40" y="71" font-size="6" font-family="sans-serif" font-weight="bold" fill="#1e3a8a" text-anchor="middle">ACCESSIBLE LIFT</text>
</svg>`,
  },

  // ── ROOM INTERIORS: CABINS, DESKS & PARTITIONS ──────────────────────────────
  {
    key: 'office_hod_cabin',
    label: 'HOD Executive Cabin Suite',
    category: 'indoor',
    subcategory: 'Furniture',
    defaultWidth: 140,
    defaultHeight: 110,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 110" preserveAspectRatio="none">
  <rect x="2" y="2" width="136" height="106" rx="3" fill="#fdfbf7" stroke="#b45309" stroke-width="2"/>
  <rect x="10" y="10" width="120" height="90" rx="2" fill="#fef3c7" stroke="#fde68a" stroke-width="1" opacity="0.6"/>
  <rect x="24" y="20" width="80" height="34" rx="3" fill="#78350f" stroke="#451a03" stroke-width="2"/>
  <rect x="28" y="23" width="72" height="28" rx="2" fill="#92400e"/>
  <rect x="52" y="6" width="24" height="12" rx="3" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="64" cy="12" r="3" fill="#475569"/>
  <rect x="34" y="58" width="20" height="16" rx="3" fill="#b45309" stroke="#78350f" stroke-width="1"/>
  <rect x="74" y="58" width="20" height="16" rx="3" fill="#b45309" stroke="#78350f" stroke-width="1"/>
  <rect x="110" y="20" width="16" height="60" rx="2" fill="#451a03" stroke="#1e293b" stroke-width="1.5"/>
  <line x1="110" y1="40" x2="126" y2="40" stroke="#78350f" stroke-width="1"/>
  <line x1="110" y1="60" x2="126" y2="60" stroke="#78350f" stroke-width="1"/>
  <rect x="46" y="26" width="36" height="12" rx="1" fill="#fef3c7" stroke="#b45309" stroke-width="1"/>
  <text x="64" y="35" font-size="7" font-family="sans-serif" font-weight="bold" fill="#78350f" text-anchor="middle">HOD CABIN</text>
</svg>`,
  },
  {
    key: 'office_staff_cubicle_cluster',
    label: 'Staff Workstations (4-Pod Cluster)',
    category: 'indoor',
    subcategory: 'Furniture',
    defaultWidth: 130,
    defaultHeight: 110,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 110" preserveAspectRatio="none">
  <rect x="2" y="2" width="126" height="106" rx="3" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
  <rect x="62" y="6" width="6" height="98" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1"/>
  <rect x="8" y="52" width="54" height="6" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1"/>
  <rect x="68" y="52" width="54" height="6" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1"/>
  <rect x="8" y="20" width="52" height="30" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
  <rect x="22" y="8" width="18" height="10" rx="2" fill="#334155"/>
  <text x="34" y="38" font-size="6" font-family="sans-serif" fill="#475569" text-anchor="middle">STAFF 1</text>
  <rect x="8" y="60" width="52" height="30" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
  <rect x="22" y="92" width="18" height="10" rx="2" fill="#334155"/>
  <text x="34" y="78" font-size="6" font-family="sans-serif" fill="#475569" text-anchor="middle">STAFF 2</text>
  <rect x="70" y="20" width="52" height="30" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
  <rect x="90" y="8" width="18" height="10" rx="2" fill="#334155"/>
  <text x="96" y="38" font-size="6" font-family="sans-serif" fill="#475569" text-anchor="middle">STAFF 3</text>
  <rect x="70" y="60" width="52" height="30" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
  <rect x="90" y="92" width="18" height="10" rx="2" fill="#334155"/>
  <text x="96" y="78" font-size="6" font-family="sans-serif" fill="#475569" text-anchor="middle">STAFF 4</text>
</svg>`,
  },
  {
    key: 'office_staff_workstation_single',
    label: 'Staff Workstation / Single Cubicle',
    category: 'indoor',
    subcategory: 'Furniture',
    defaultWidth: 70,
    defaultHeight: 70,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70" preserveAspectRatio="none">
  <rect x="2" y="2" width="66" height="66" rx="2" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
  <line x1="2" y1="2" x2="68" y2="2" stroke="#2563eb" stroke-width="4"/>
  <line x1="2" y1="2" x2="2" y2="68" stroke="#2563eb" stroke-width="4"/>
  <rect x="8" y="8" width="54" height="34" rx="2" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
  <rect x="25" y="12" width="20" height="10" rx="1" fill="#1e293b"/>
  <circle cx="35" cy="54" r="8" fill="#475569" stroke="#1e293b" stroke-width="1.5"/>
  <text x="35" y="32" font-size="6" font-family="sans-serif" font-weight="bold" fill="#64748b" text-anchor="middle">STAFF DESK</text>
</svg>`,
  },
  {
    key: 'office_conference_room',
    label: 'Conference Table & Executive Chairs',
    category: 'indoor',
    subcategory: 'Furniture',
    defaultWidth: 150,
    defaultHeight: 90,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 90" preserveAspectRatio="none">
  <rect x="2" y="2" width="146" height="86" rx="4" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/>
  <rect x="25" y="22" width="100" height="46" rx="20" fill="#334155" stroke="#0f172a" stroke-width="2"/>
  <rect x="65" y="40" width="20" height="10" rx="1" fill="#0f172a"/>
  <circle cx="45" cy="12" r="5" fill="#64748b"/>
  <circle cx="65" cy="12" r="5" fill="#64748b"/>
  <circle cx="85" cy="12" r="5" fill="#64748b"/>
  <circle cx="105" cy="12" r="5" fill="#64748b"/>
  <circle cx="45" cy="78" r="5" fill="#64748b"/>
  <circle cx="65" cy="78" r="5" fill="#64748b"/>
  <circle cx="85" cy="78" r="5" fill="#64748b"/>
  <circle cx="105" cy="78" r="5" fill="#64748b"/>
  <circle cx="15" cy="45" r="5" fill="#64748b"/>
  <circle cx="135" cy="45" r="5" fill="#64748b"/>
  <text x="75" y="47" font-size="6" font-family="sans-serif" font-weight="bold" fill="#f8fafc" text-anchor="middle">MEETING ROOM</text>
</svg>`,
  },
  {
    key: 'office_glass_divider',
    label: 'Acoustic Glass Wall Divider',
    category: 'indoor',
    subcategory: 'Structure',
    defaultWidth: 120,
    defaultHeight: 16,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 16" preserveAspectRatio="none">
  <rect x="2" y="4" width="116" height="8" rx="1" fill="#bfdbfe" stroke="#3b82f6" stroke-width="1.5" opacity="0.75"/>
  <line x1="2" y1="8" x2="118" y2="8" stroke="#60a5fa" stroke-width="1"/>
  <circle cx="6" cy="8" r="3" fill="#1e293b"/>
  <circle cx="60" cy="8" r="3" fill="#1e293b"/>
  <circle cx="114" cy="8" r="3" fill="#1e293b"/>
</svg>`,
  },

];

/** Global in-memory cache for rendered HTMLImageElements */
const IMAGE_CACHE = new Map<string, HTMLImageElement>();

/** Convert inline SVG string → data URL */
export function svgToDataUrl(svgStr: string): string {
  const encoded = encodeURIComponent(svgStr.trim());
  return `data:image/svg+xml,${encoded}`;
}

/** Preload and retrieve cached HTMLImageElement synchronously when available */
export function getCachedImage(dataUrl: string, onLoad?: (img: HTMLImageElement) => void): HTMLImageElement | null {
  if (IMAGE_CACHE.has(dataUrl)) {
    const cached = IMAGE_CACHE.get(dataUrl)!;
    if (cached.complete && cached.naturalWidth > 0) return cached;
  }
  const img = new window.Image();
  img.src = dataUrl;
  img.onload = () => {
    IMAGE_CACHE.set(dataUrl, img);
    onLoad?.(img);
  };
  return null;
}

export const ELEMENT_SUBCATEGORIES = {
  outdoor: ['Buildings', 'Nature', 'Roads & Paths', 'Gates & Fences', 'Floors & Grounds', 'Facilities'],
  indoor:  ['Flooring & Surfaces', 'Floor Plan Rooms', 'Structure', 'Furniture', 'Stairs & Elevators', 'Safety'],
} as const;
