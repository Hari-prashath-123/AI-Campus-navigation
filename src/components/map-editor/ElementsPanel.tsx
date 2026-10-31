import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Search, ChevronDown, ChevronRight, LayoutGrid, Home, Trees } from 'lucide-react';
import {
  MAP_ELEMENTS,
  MapElement,
  ElementCategory,
  ELEMENT_SUBCATEGORIES,
  svgToDataUrl,
} from '../../data/map-elements';

interface ElementsPanelProps {
  /** Called when the user drags an element and drops it on the canvas */
  onElementDrop?: (element: MapElement, canvasX: number, canvasY: number) => void;
  /** Called when user clicks an element tile (e.g. to skin currently selected building) */
  onElementClick?: (element: MapElement) => void;
  /** Ref to the canvas container DOM element so we can compute drop coords */
  canvasContainerRef?: React.RefObject<HTMLDivElement>;
  /** Current stage scale (zoom) so we can compensate drop position */
  stageScale?: number;
  /** Current stage pan position */
  stagePosition?: { x: number; y: number };
  /** Whether a shape is currently selected on canvas */
  hasSelectedShape?: boolean;
}

const CATEGORY_ICONS: Record<ElementCategory, React.FC<{ size?: number; className?: string }>> = {
  outdoor: Trees as any,
  indoor: Home as any,
};

// Pre-generate data URLs for all elements to avoid re-encoding on each render
const ELEMENT_DATA_URLS = new Map<string, string>(
  MAP_ELEMENTS.map((el) => [el.key, svgToDataUrl(el.svg)])
);

export const ElementsPanel: React.FC<ElementsPanelProps> = ({
  onElementDrop,
  onElementClick,
  canvasContainerRef,
  stageScale = 1,
  stagePosition = { x: 0, y: 0 },
  hasSelectedShape = false,
}) => {
  const [activeCategory, setActiveCategory] = useState<ElementCategory>('outdoor');
  const [search, setSearch] = useState('');
  const [collapsedSubs, setCollapsedSubs] = useState<Set<string>>(new Set());

  // Track the currently dragged element
  const dragElementRef = useRef<MapElement | null>(null);

  /** Toggle subcategory collapse */
  const toggleSub = useCallback((sub: string) => {
    setCollapsedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(sub)) next.delete(sub);
      else next.add(sub);
      return next;
    });
  }, []);

  /** Filter elements by category + search */
  const filtered = MAP_ELEMENTS.filter(
    (el) =>
      el.category === activeCategory &&
      (search === '' || el.label.toLowerCase().includes(search.toLowerCase()) || el.subcategory.toLowerCase().includes(search.toLowerCase()))
  );

  /** Group by subcategory */
  const subcategories = ELEMENT_SUBCATEGORIES[activeCategory];
  const grouped = subcategories.map((sub) => ({
    sub,
    items: filtered.filter((el) => el.subcategory === sub),
  })).filter((g) => g.items.length > 0);

  /* ── Native HTML5 Drag & Drop handlers ──────────────────────────────── */

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, element: MapElement) => {
      dragElementRef.current = element;
      e.dataTransfer.effectAllowed = 'copy';
      // Encode element key in transfer data
      e.dataTransfer.setData('application/map-element', element.key);
      // Use a transparent ghost
      const ghost = document.createElement('div');
      ghost.style.opacity = '0';
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 0, 0);
      setTimeout(() => document.body.removeChild(ghost), 0);
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    dragElementRef.current = null;
  }, []);

  /* ── Canvas drop zone handler (registered on canvasContainerRef) ────── */
  useEffect(() => {
    const container = canvasContainerRef?.current;
    if (!container) return;

    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('application/map-element')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const key = e.dataTransfer?.getData('application/map-element');
      if (!key) return;
      const element = MAP_ELEMENTS.find((el) => el.key === key);
      if (!element || !onElementDrop) return;

      const rect = container.getBoundingClientRect();
      // Raw pixel position relative to the canvas container
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      // Convert screen pixel → canvas coordinate (inverse of Konva stage transform)
      const canvasX = (rawX - stagePosition.x) / stageScale;
      const canvasY = (rawY - stagePosition.y) / stageScale;
      onElementDrop(element, canvasX, canvasY);
    };

    container.addEventListener('dragover', onDragOver);
    container.addEventListener('drop', onDrop);
    return () => {
      container.removeEventListener('dragover', onDragOver);
      container.removeEventListener('drop', onDrop);
    };
  }, [canvasContainerRef, onElementDrop, stageScale, stagePosition]);

  return (
    <div className="w-64 bg-white border-r border-slate-200 h-full flex flex-col z-10 shadow-sm shrink-0">
      {/* Panel Header */}
      <div className="px-3 py-2.5 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-indigo-50 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <LayoutGrid size={15} className="text-violet-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Elements</span>
          <span className={`ml-auto text-[10px] px-2 py-0.5 rounded border font-medium ${
            hasSelectedShape
              ? 'bg-violet-100 text-violet-700 border-violet-300 animate-pulse'
              : 'text-slate-500 bg-white border-slate-200'
          }`}>
            {hasSelectedShape ? '⚡ Click to skin shape' : 'drag to canvas'}
          </span>
        </div>

        {/* Category toggle */}
        <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-white">
          {(['outdoor', 'indoor'] as ElementCategory[]).map((cat) => {
            const Icon = CATEGORY_ICONS[cat];
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold transition-colors capitalize ${
                  activeCategory === cat
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon size={12} />
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-100 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
          <input
            type="text"
            placeholder={`Search ${activeCategory} elements…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:border-violet-400"
          />
        </div>
      </div>

      {/* Elements grid */}
      <div className="flex-1 overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <LayoutGrid size={28} className="mb-2 opacity-30" />
            <p className="text-xs">No elements found</p>
          </div>
        ) : (
          grouped.map(({ sub, items }) => (
            <div key={sub}>
              {/* Subcategory header */}
              <button
                onClick={() => toggleSub(sub)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 transition-colors border-b border-slate-100"
              >
                {collapsedSubs.has(sub) ? (
                  <ChevronRight size={11} />
                ) : (
                  <ChevronDown size={11} />
                )}
                {sub}
                <span className="ml-auto text-[9px] text-slate-400 font-normal normal-case">
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </span>
              </button>

              {/* Element tiles */}
              {!collapsedSubs.has(sub) && (
                <div className="grid grid-cols-3 gap-2 p-2">
                  {items.map((element) => {
                    const dataUrl = ELEMENT_DATA_URLS.get(element.key) || '';
                    return (
                      <ElementTile
                        key={element.key}
                        element={element}
                        dataUrl={dataUrl}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onClick={() => onElementClick?.(element)}
                        hasSelectedShape={hasSelectedShape}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 shrink-0">
        <p className="text-[10px] text-slate-400 text-center leading-tight">
          Drag any element onto the canvas.<br/>
          Resize &amp; rotate after placing.
        </p>
      </div>
    </div>
  );
};

/* ─── Individual Element Tile ─────────────────────────────────────────────── */

interface ElementTileProps {
  element: MapElement;
  dataUrl: string;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, el: MapElement) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  onClick?: () => void;
  hasSelectedShape?: boolean;
}

const ElementTile: React.FC<ElementTileProps> = React.memo(({ element, dataUrl, onDragStart, onDragEnd, onClick, hasSelectedShape }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, element)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex flex-col items-center gap-1 p-1.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all select-none ${
        hovered
          ? 'border-violet-500 bg-violet-50 shadow-md scale-105'
          : hasSelectedShape
          ? 'border-violet-300 bg-violet-50/30 hover:border-violet-500'
          : 'border-slate-200 bg-white hover:border-violet-300'
      }`}
      title={hasSelectedShape ? `Click to apply ${element.label} to selected shape, or drag to place` : `Drag to place: ${element.label}`}
    >
      {/* SVG preview */}
      <div className="w-full aspect-square flex items-center justify-center">
        <img
          src={dataUrl}
          alt={element.label}
          className="w-full h-full object-contain pointer-events-none"
          draggable={false}
        />
      </div>
      {/* Label */}
      <span
        className={`text-[9px] text-center leading-tight w-full truncate font-medium transition-colors ${
          hovered ? 'text-violet-700' : 'text-slate-600'
        }`}
      >
        {element.label}
      </span>
      {/* Drag hint on hover */}
      {hovered && (
        <div className="absolute inset-0 rounded-lg border-2 border-violet-400 pointer-events-none" />
      )}
    </div>
  );
});

ElementTile.displayName = 'ElementTile';

