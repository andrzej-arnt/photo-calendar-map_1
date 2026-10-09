import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CellInfo, ZoomLevel } from '../types';
import { CalendarCell } from './CalendarCell';
import { ZOOM_LEVEL_LABELS, ZOOM_LEVEL_ORDER } from '../utils/dateUtils';
import { Sparkles, ZoomIn, ZoomOut, MousePointer } from 'lucide-react';

interface CalendarGridProps {
  cells: CellInfo[];
  zoomLevel: ZoomLevel;
  showPhotoPreview: boolean;
  onCellClick: (cell: CellInfo) => void;
  onZoomInCell: (cell: CellInfo) => void;
  onZoomOut: () => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  cells,
  zoomLevel,
  showPhotoPreview,
  onCellClick,
  onZoomInCell,
  onZoomOut,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lastZoomNotice, setLastZoomNotice] = useState<string | null>(null);
  const lastWheelTime = useRef<number>(0);
  const gridRef = useRef<HTMLDivElement>(null);

  // Native non-passive wheel handler to block page scrolling and trigger zoom
  useEffect(() => {
    const gridEl = gridRef.current;
    if (!gridEl) return;

    const handleWheelNative = (e: WheelEvent) => {
      // Prevent browser default window scrolling
      e.preventDefault();
      e.stopPropagation();

      const now = Date.now();
      if (now - lastWheelTime.current < 250) return;
      lastWheelTime.current = now;

      // Identify which cell is under the mouse cursor
      const cellEl = (e.target as HTMLElement).closest('[data-cell-index]');
      const cellIdxStr = cellEl?.getAttribute('data-cell-index');
      const targetIdx = cellIdxStr ? parseInt(cellIdxStr, 10) : 12; // default center cell
      const targetCell = cells[targetIdx] || cells[0];

      if (e.deltaY < 0) {
        // Scroll UP -> Zoom IN
        const currentIndex = ZOOM_LEVEL_ORDER.indexOf(zoomLevel);
        if (currentIndex < ZOOM_LEVEL_ORDER.length - 1) {
          const nextLevel = ZOOM_LEVEL_ORDER[currentIndex + 1];
          setLastZoomNotice(`Przybliżono (Zoom IN) do: ${ZOOM_LEVEL_LABELS[nextLevel].name}`);
          onZoomInCell(targetCell);
        } else {
          setLastZoomNotice(`Osiągnięto najniższy poziom widoku (${ZOOM_LEVEL_LABELS[zoomLevel].name})`);
        }
      } else if (e.deltaY > 0) {
        // Scroll DOWN -> Zoom OUT
        const currentIndex = ZOOM_LEVEL_ORDER.indexOf(zoomLevel);
        if (currentIndex > 0) {
          const prevLevel = ZOOM_LEVEL_ORDER[currentIndex - 1];
          setLastZoomNotice(`Oddalono (Zoom OUT) do: ${ZOOM_LEVEL_LABELS[prevLevel].name}`);
          onZoomOut();
        } else {
          setLastZoomNotice(`Osiągnięto najwyższy poziom widoku (${ZOOM_LEVEL_LABELS[zoomLevel].name})`);
        }
      }

      setTimeout(() => {
        setLastZoomNotice(null);
      }, 2000);
    };

    gridEl.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => {
      gridEl.removeEventListener('wheel', handleWheelNative);
    };
  }, [cells, zoomLevel, onZoomInCell, onZoomOut]);

  return (
    <div ref={gridRef} className="relative w-full max-w-[540px] mx-auto p-1 sm:p-1.5">
      {/* Zoom Toast Notification */}
      <AnimatePresence>
        {lastZoomNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1 rounded-full bg-orange-500 text-slate-950 text-[11px] font-bold shadow-lg shadow-orange-500/30 flex items-center gap-1.5 pointer-events-none"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lastZoomNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3x4 Grid Container */}
      <motion.div
        key={zoomLevel + (cells[0]?.startDate.getTime() || 0)}
        initial={{ opacity: 0.7, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="grid grid-cols-5 grid-rows-5 gap-1 sm:gap-1.5 bg-[#12141c] p-1.5 sm:p-2 rounded-xl border border-[#252a38] shadow-2xl"
      >
        {cells.map((cell) => (
          <CalendarCell
            key={cell.index}
            cell={cell}
            zoomLevel={zoomLevel}
            showPhotoPreview={showPhotoPreview}
            onClick={() => onCellClick(cell)}
            onWheel={() => {}}
            isHovered={hoveredIndex === cell.index}
            onMouseEnter={() => setHoveredIndex(cell.index)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ))}
      </motion.div>

      {/* Bottom Floating Control Bar & Mouse Wheel Guide */}
      <div className="mt-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 bg-[#161822] p-2 sm:p-2.5 rounded-xl border border-[#252a38]">
        <div className="flex items-center gap-2 text-slate-300">
          <MousePointer className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          <span>
            <strong className="text-white">Kółko myszy nad kwadratem:</strong> <span className="text-orange-400 font-bold">góra = przybliż (Zoom IN)</span> | <span className="text-orange-400 font-bold">dół = oddal (Zoom OUT)</span>.
          </span>
        </div>

        {/* Manual Quick Zoom Buttons for Touch/Click Convenience */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onZoomOut}
            disabled={zoomLevel === 'DECADES'}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1e222e] hover:bg-[#282d3d] disabled:opacity-40 border border-[#313648] text-slate-200 transition-all text-[11px] font-semibold"
          >
            <ZoomOut className="w-3 h-3 text-orange-400" />
            <span>Oddal</span>
          </button>
          <button
            onClick={() => {
              if (cells[12]) onZoomInCell(cells[12]);
            }}
            disabled={zoomLevel === 'HOURS'}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1e222e] hover:bg-[#282d3d] disabled:opacity-40 border border-[#313648] text-slate-200 transition-all text-[11px] font-semibold"
          >
            <ZoomIn className="w-3 h-3 text-orange-400" />
            <span>Przybliż środek</span>
          </button>
        </div>
      </div>
    </div>
  );
};
