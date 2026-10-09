import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  Image as ImageIcon,
  Sparkles,
  Info,
  MapPin,
  SlidersHorizontal,
  Database,
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ZoomLevel } from '../types';
import { ZOOM_LEVEL_LABELS, ZOOM_LEVEL_ORDER } from '../utils/dateUtils';

interface CalendarHeaderProps {
  focusDate: Date;
  zoomLevel: ZoomLevel;
  dateRangeText: string;
  now?: Date;
  onZoomChange: (level: ZoomLevel) => void;
  onPrev: () => void;
  onNext: () => void;
  onResetToNow: () => void;
  onOpenJumpModal: () => void;
  showPhotoPreview: boolean;
  onTogglePhotoPreview: (val: boolean) => void;
  onOpenMssqlModal?: () => void;
  isMssqlConnected?: boolean;
  mssqlPhotoCount?: number;
  useMockMode?: boolean;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  focusDate,
  zoomLevel,
  dateRangeText,
  onZoomChange,
  onPrev,
  onNext,
  onResetToNow,
  onOpenJumpModal,
  showPhotoPreview,
  onTogglePhotoPreview,
  onOpenMssqlModal,
  isMssqlConnected,
  mssqlPhotoCount,
  useMockMode,
}) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="w-full bg-[#14161f] rounded-2xl border border-[#252836] p-2.5 sm:p-3 shadow-xl text-slate-100 flex flex-col gap-2">
      {/* Top line: Action Buttons */}
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={onOpenJumpModal}
          className="p-1.5 rounded-lg bg-[#1e222e] hover:bg-[#282d3d] border border-[#313648] text-xs font-medium text-slate-200 transition-all"
          title="Skocz do daty"
        >
          <Search className="w-3.5 h-3.5 text-slate-300" />
        </button>

        <button
          onClick={onResetToNow}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1e222e] hover:bg-[#282d3d] border border-orange-500/50 text-orange-400 text-xs font-bold transition-all"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Dziś</span>
        </button>

        <button
          onClick={() => onTogglePhotoPreview(!showPhotoPreview)}
          className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
            showPhotoPreview
              ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/30'
              : 'bg-[#1e222e] text-slate-300 hover:text-white border border-[#313648]'
          }`}
          title="Przełącz podgląd zdjęć"
        >
          <ImageIcon className="w-3.5 h-3.5" />
        </button>

        {onOpenMssqlModal && (
          <button
            onClick={onOpenMssqlModal}
            className={`p-1.5 rounded-lg border text-xs font-medium transition-all ${
              isMssqlConnected && !useMockMode
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/50'
                : 'bg-[#1e222e] border-[#313648] text-slate-300 hover:text-white hover:bg-[#282d3d]'
            }`}
            title={
              isMssqlConnected && !useMockMode
                ? `MSSQL połączony (${mssqlPhotoCount || 0} zdjęć)`
                : 'Ustawienia bazy MSSQL'
            }
          >
            <Database className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-1.5 rounded-lg bg-[#1e222e] hover:bg-[#282d3d] border border-[#313648] text-slate-400 hover:text-white"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Info Banner when expanded */}
      {showInfo && (
        <div className="p-2 bg-[#1e222e] border border-orange-500/40 rounded-xl text-xs text-slate-200 flex items-start gap-2 animate-fadeIn shadow-lg">
          <Sparkles className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-orange-400 uppercase tracking-wide text-[11px]">Nawigacja kółkiem myszy:</p>
            <p className="text-[11px] text-slate-300">
              Kółko w górę = Zoom IN | Kółko w dół = Zoom OUT. Krawędzie kwadratów są stałe (1px border).
            </p>
          </div>
        </div>
      )}

      {/* Time Control Panel */}
      <div className="bg-[#12141c] p-2 rounded-xl border border-[#252a38] flex flex-col gap-1.5">
        {/* Row 1: Date Range Description with Nav Arrows placed on the right, BEFORE the text */}
        <div className="flex items-center justify-between gap-1 border-b border-[#222634] pb-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            ZAKRES:
          </span>

          <div className="flex items-center gap-1.5 ml-auto min-w-0">
            {/* Navigation Arrows placed right before the date range text */}
            <div className="flex items-center gap-0.5 bg-[#1c1f2b] rounded-lg p-0.5 border border-[#2c3144] shrink-0">
              <button
                onClick={onPrev}
                className="p-1 hover:bg-[#282d3d] rounded text-slate-300 hover:text-white transition-colors"
                title="Poprzedni przedział"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onNext}
                className="p-1 hover:bg-[#282d3d] rounded text-slate-300 hover:text-white transition-colors"
                title="Następny przedział"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dynamic Range Text */}
            <div className="text-xs font-bold tracking-wider text-orange-400 font-mono text-right truncate">
              {dateRangeText}
            </div>
          </div>
        </div>

        {/* Row 2: Scale Selector Buttons pushed to the right */}
        <div className="flex items-center justify-end gap-1 overflow-x-auto max-w-full py-0.5 scrollbar-none">
          {ZOOM_LEVEL_ORDER.map((lvl) => {
            const isActive = zoomLevel === lvl;
            const meta = ZOOM_LEVEL_LABELS[lvl];

            let shortName = meta.name.toUpperCase();
            if (lvl === 'DECADES') shortName = 'WIELOLECIE';
            if (lvl === 'YEARS') shortName = 'ROK';
            if (lvl === 'MONTHS') shortName = 'MIESIĄC';
            if (lvl === 'TEN_DAYS') shortName = '10 DNI';
            if (lvl === 'DAYS') shortName = 'DZIEŃ';
            if (lvl === 'HOURS') shortName = 'GODZINY';

            return (
              <button
                key={lvl}
                onClick={() => onZoomChange(lvl)}
                className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition-all whitespace-nowrap ${
                  isActive
                    ? 'border border-orange-500 bg-[#1e222e] text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.3)]'
                    : 'bg-[#181b24] border border-[#2b3040] text-slate-400 hover:text-slate-200 hover:bg-[#202533]'
                }`}
                title={meta.description}
              >
                {shortName}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
