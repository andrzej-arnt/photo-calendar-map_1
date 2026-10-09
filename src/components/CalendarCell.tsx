import React from 'react';
import { Camera, MapPin, Zap, ChevronRight, Ban } from 'lucide-react';
import { CellInfo, ZoomLevel } from '../types';

interface CalendarCellProps {
  cell: CellInfo;
  zoomLevel: ZoomLevel;
  showPhotoPreview: boolean;
  onClick: () => void;
  onWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const CalendarCell: React.FC<CalendarCellProps> = React.memo(({
  cell,
  zoomLevel,
  showPhotoPreview,
  onClick,
  onWheel,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}) => {
  const {
    label,
    subLabel,
    isCurrent,
    isPast,
    isFuture,
    isOutOfBounds,
    progressPercent,
    photoCount,
    hasMapPhotos,
    mapPhotosCount,
    locations,
  } = cell;

  if (isOutOfBounds || !label) {
    return (
      <div
        data-cell-index={cell.index}
        className="relative rounded-lg border border-[#1e2230]/40 bg-[#12141a]/20 select-none flex items-center justify-center h-[68px] sm:h-[76px] md:h-[84px] w-full opacity-25 pointer-events-none"
      >
        <span className="text-[10px] text-slate-700/50 font-mono">—</span>
      </div>
    );
  }

  // Visual style rules matching GeoPhoto Tracker theme
  let bgClasses = 'bg-[#181b24] border border-[#2b3042] text-slate-300 hover:bg-[#202533] hover:border-orange-400';

  if (isCurrent) {
    bgClasses =
      'bg-[#222736] border border-orange-500 text-white shadow-[0_0_12px_rgba(249,115,22,0.35)]';
  } else if (isHovered) {
    bgClasses =
      'bg-[#222736] border border-orange-400 text-white shadow-[0_0_10px_rgba(249,115,22,0.25)]';
  }

  const isLongLabel = label.length > 7 || zoomLevel === 'TEN_DAYS';

  return (
    <div
      data-cell-index={cell.index}
      onClick={isOutOfBounds ? undefined : onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`relative group rounded-lg p-0.5 sm:p-1 border transition-all duration-200 select-none flex flex-col justify-between overflow-hidden h-[68px] sm:h-[76px] md:h-[84px] w-full ${
        isOutOfBounds ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${bgClasses}`}
    >
      {/* Real-time Progress Bar at bottom */}
      {!isOutOfBounds && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#12141c] overflow-hidden pointer-events-none">
          <div
            className={`h-full transition-all duration-300 ${
              isCurrent ? 'bg-orange-500 animate-pulse' : 'bg-slate-700'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Top Header inside tile */}
      <div className="flex items-center justify-between gap-1 z-10 h-3">
        {isCurrent ? (
          <span className="flex items-center gap-1 text-[8px] font-black uppercase px-1 py-0.2 rounded bg-orange-500 text-slate-950 tracking-wider ml-auto">
            <Zap className="w-2 h-2 fill-current" />
            TERAZ
          </span>
        ) : (
          <span />
        )}

        {isOutOfBounds && (
          <span className="flex items-center gap-1 text-[8px] uppercase font-bold px-1 py-0.2 rounded bg-red-950/80 text-red-400 border border-red-800/50 ml-auto">
            <Ban className="w-2 h-2" />
            Poza
          </span>
        )}
      </div>

      {/* Center Main Time Unit Label - constant height & whitespace-nowrap to prevent layout shifts */}
      <div className="my-auto text-center py-0.5 z-10 leading-none min-w-0">
        <div
          className={`font-black tracking-tight font-mono transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${
            isLongLabel
              ? 'text-[9px] sm:text-[10px] md:text-xs'
              : 'text-xs sm:text-sm md:text-base'
          } ${
            isCurrent
              ? 'text-orange-400 drop-shadow'
              : isOutOfBounds
              ? 'text-slate-600 line-through'
              : 'text-slate-200 group-hover:text-white'
          }`}
        >
          {label}
        </div>
        {subLabel && (
          <div className="text-[9px] font-semibold text-slate-400 group-hover:text-slate-300 mt-0.5 leading-none whitespace-nowrap overflow-hidden text-ellipsis">
            {subLabel}
          </div>
        )}
      </div>

      {/* Bottom info inside tile: Left = Map photos count, Right = Total photos count */}
      <div className="flex items-center justify-between text-[8px] pt-0.5 z-10 border-t border-[#2a2f40]/50 h-3.5 leading-none">
        {/* Left: Photos visible on map */}
        {!isOutOfBounds && mapPhotosCount && mapPhotosCount > 0 ? (
          <span className="flex items-center gap-0.5 font-bold px-1 py-0.5 rounded bg-amber-400 text-slate-950 text-[8px] shadow-xs">
            <MapPin className="w-2 h-2 fill-current shrink-0" />
            {mapPhotosCount}
          </span>
        ) : (
          <span />
        )}

        {/* Right: Total photos in period */}
        {!isOutOfBounds && photoCount && photoCount > 0 ? (
          <span className="flex items-center gap-0.5 font-bold text-orange-400 bg-orange-500/20 border border-orange-500/30 px-1 py-0.5 rounded text-[8px]">
            <Camera className="w-2 h-2 text-orange-400 shrink-0" />
            {photoCount}
          </span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
});
