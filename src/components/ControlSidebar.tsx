import React from 'react';
import { ZoomLevel, CellInfo } from '../types';
import { CalendarGrid } from './CalendarGrid';
import { CalendarHeader } from './CalendarHeader';
import { MapPin, Camera, Flame, Route, Layers, Eye, Sliders } from 'lucide-react';

const PHOTO_THRESHOLDS = [10, 25, 50, 100, 200, 500, 1000, 2000];

interface ControlSidebarProps {
  now?: Date;
  focusDate?: Date;
  mapPhotosCount: number;
  totalPhotosCount: number;
  selectedRangeText: string;
  zoomLevel: ZoomLevel;
  cells: CellInfo[];
  showPhotoPreview: boolean;
  showHeatmap: boolean;
  heatmapOpacity?: number;
  onHeatmapOpacityChange?: (val: number) => void;
  showRoutes: boolean;
  routesMode?: 'TEN_DAYS' | 'MAX_PHOTOS';
  routesMaxPhotos?: number;
  onChangeRoutesMode?: (mode: 'TEN_DAYS' | 'MAX_PHOTOS') => void;
  onChangeRoutesMaxPhotos?: (val: number) => void;
  showClusters: boolean;
  routesMinPhotos?: number;
  routesOnlyFromTenDays?: boolean;
  onChangeRoutesMinPhotos?: (count: number) => void;
  onToggleRoutesOnlyFromTenDays?: (enabled: boolean) => void;
  onZoomChange: (newZoom: ZoomLevel) => void;
  onTogglePhotoPreview: (val: boolean) => void;
  onToggleHeatmap: (val: boolean) => void;
  onToggleRoutes: (val: boolean) => void;
  onToggleClusters: (val: boolean) => void;
  onCellClick: (cell: CellInfo) => void;
  onZoomInCell: (cell: CellInfo) => void;
  onZoomOut: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenJumpModal: () => void;
  onResetToNow: () => void;
  onOpenMssqlModal?: () => void;
  isMssqlConnected?: boolean;
  mssqlPhotoCount?: number;
  useMockMode?: boolean;
}

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  now = new Date(),
  focusDate = new Date(),
  mapPhotosCount,
  totalPhotosCount,
  selectedRangeText,
  zoomLevel,
  cells,
  showPhotoPreview,
  showHeatmap,
  heatmapOpacity = 0.85,
  onHeatmapOpacityChange,
  showRoutes,
  routesMode = 'TEN_DAYS',
  routesMaxPhotos = 200,
  onChangeRoutesMode,
  onChangeRoutesMaxPhotos,
  showClusters,
  routesMinPhotos = 2,
  routesOnlyFromTenDays = true,
  onChangeRoutesMinPhotos,
  onToggleRoutesOnlyFromTenDays,
  onZoomChange,
  onTogglePhotoPreview,
  onToggleHeatmap,
  onToggleRoutes,
  onToggleClusters,
  onCellClick,
  onZoomInCell,
  onZoomOut,
  onPrev,
  onNext,
  onOpenJumpModal,
  onResetToNow,
  onOpenMssqlModal,
  isMssqlConnected,
  mssqlPhotoCount,
  useMockMode,
}) => {
  return (
    <aside className="w-full h-full overflow-y-auto custom-scrollbar flex flex-col gap-2.5 shrink-0 pr-1 p-2.5 sm:p-3">
      {/* Calendar Header with real-time clock, actions, date range, scale buttons */}
      <CalendarHeader
        focusDate={focusDate}
        zoomLevel={zoomLevel}
        dateRangeText={selectedRangeText}
        now={now}
        onZoomChange={onZoomChange}
        onPrev={onPrev}
        onNext={onNext}
        onResetToNow={onResetToNow}
        onOpenJumpModal={onOpenJumpModal}
        showPhotoPreview={showPhotoPreview}
        onTogglePhotoPreview={onTogglePhotoPreview}
        onOpenMssqlModal={onOpenMssqlModal}
        isMssqlConnected={isMssqlConnected}
        mssqlPhotoCount={mssqlPhotoCount}
        useMockMode={useMockMode}
      />

      {/* Photo counters */}
      <div className="flex items-center justify-between px-1 text-[10px] font-mono">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px]" title="Zdjęcia w bieżącym widoku mapy">
            <MapPin className="w-3 h-3 fill-current" />
            {mapPhotosCount} na mapie
          </span>
          <span className="flex items-center gap-1 font-bold text-orange-400 bg-orange-500/20 border border-orange-500/30 px-1.5 py-0.5 rounded text-[10px]" title="Wszystkie zdjęcia w wybranym oknie">
            <Camera className="w-3 h-3 text-orange-400" />
            {totalPhotosCount} w przedziale
          </span>
        </div>
        <span className="text-slate-400">Kółko myszy = zoom</span>
      </div>

      {/* 5x5 Matrix Calendar Selector */}
      <div className="bg-[#131622] rounded-2xl border border-[#252a3a] p-3 shadow-xl flex flex-col items-center">
        <div className="w-full flex justify-center">
          <CalendarGrid
            cells={cells}
            zoomLevel={zoomLevel}
            showPhotoPreview={showPhotoPreview}
            onCellClick={onCellClick}
            onZoomInCell={onZoomInCell}
            onZoomOut={onZoomOut}
          />
        </div>
      </div>

      {/* Layer Toggles Section */}
      <div className="bg-[#131622] rounded-2xl border border-[#252a3a] p-3.5 shadow-xl flex flex-col gap-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          WARSTWY MAPY & PREZENTACJA
        </span>

        <div className="space-y-2.5">
          {/* Heatmap Toggle & Opacity Slider */}
          <div className="bg-[#191d2c] p-2.5 rounded-xl border border-[#2c3348] flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full ${showHeatmap ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'bg-slate-600'}`} />
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">Pokaż heatmapę</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHeatmap}
                  onChange={(e) => onToggleHeatmap(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>

            {/* Suwak i szybkie presety przezroczystości */}
            {showHeatmap && (
              <div className="pt-2 border-t border-[#262c3e] flex flex-col gap-2 animate-fadeIn">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 flex items-center gap-1.5 font-medium">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>Przezroczystość:</span>
                  </span>
                  <span className="font-mono font-bold text-orange-400 tabular-nums px-2 py-0.5 rounded bg-[#12141c] border border-[#262c3e] text-[11px]">
                    {Math.round(heatmapOpacity * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-2 px-0.5">
                  <span className="text-[10px] text-slate-500 font-mono">10%</span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={Math.round(heatmapOpacity * 100)}
                    onChange={(e) => onHeatmapOpacityChange?.(Number(e.target.value) / 100)}
                    className="flex-1 h-1.5 bg-[#121520] rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all"
                    title={`Ustaw przezroczystość: ${Math.round(heatmapOpacity * 100)}%`}
                  />
                  <span className="text-[10px] text-slate-500 font-mono">100%</span>
                </div>

                <div className="grid grid-cols-4 gap-1 pt-0.5">
                  {[
                    { label: '30%', val: 0.30, title: 'Delikatna (30%)' },
                    { label: '60%', val: 0.60, title: 'Średnia (60%)' },
                    { label: '85%', val: 0.85, title: 'Domyślna (85%)' },
                    { label: '100%', val: 1.00, title: 'Pełna (100%)' },
                  ].map((preset) => {
                    const isSelected = Math.abs(heatmapOpacity - preset.val) < 0.04;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => onHeatmapOpacityChange?.(preset.val)}
                        className={`py-1 px-1 text-[10px] rounded-md font-mono font-semibold transition-all text-center ${
                          isSelected
                            ? 'bg-orange-500 text-slate-950 shadow-xs font-bold'
                            : 'bg-[#141724] border border-[#282f42] text-slate-400 hover:text-slate-200 hover:bg-[#1d2234]'
                        }`}
                        title={preset.title}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Route Lines Toggle */}
          <div className="flex flex-col gap-2.5 bg-[#191d2c] p-2.5 rounded-xl border border-[#2c3348]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full ${showRoutes ? 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]' : 'bg-slate-600'}`} />
                <Route className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-slate-200">Pokaż linie tras / strzałki</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRoutes}
                  onChange={(e) => onToggleRoutes(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>

            {/* Opcje dodatkowe dla linii tras (WZJEMNIE WYKLUCZAJĄCE SIĘ TRYBY W JEDNEJ LINII) */}
            {showRoutes && (
              <div className="pt-2 border-t border-[#262c3e] flex flex-col gap-2.5 animate-fadeIn text-[11px]">
                {/* Przełącznik trybu wykluczającego */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Warunek wyświetlania linii i strzałek
                  </span>
                  <div className="flex rounded-lg bg-[#121520] p-1 border border-[#282f42]">
                    <button
                      type="button"
                      onClick={() => onChangeRoutesMode?.('TEN_DAYS')}
                      className={`flex-1 py-1 px-2 text-[11px] font-semibold rounded-md transition-all text-center ${
                        routesMode === 'TEN_DAYS'
                          ? 'bg-orange-500 text-slate-950 font-bold shadow-xs'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1f30]'
                      }`}
                    >
                      Skala ≤ 10 dni
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeRoutesMode?.('MAX_PHOTOS')}
                      className={`flex-1 py-1 px-2 text-[11px] font-semibold rounded-md transition-all text-center ${
                        routesMode === 'MAX_PHOTOS'
                          ? 'bg-orange-500 text-slate-950 font-bold shadow-xs'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1f30]'
                      }`}
                    >
                      Liczba zdjęć na mapie
                    </button>
                  </div>
                </div>

                {/* Jeśli wybrano tryb liczbowy zdjęć: Progi graficzne w jednej linii (10 do 2000) */}
                {routesMode === 'MAX_PHOTOS' && (
                  <div className="flex flex-col gap-1.5 pt-1 border-t border-[#222736]">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-300 font-medium">Maks. zdjęć na mapie:</span>
                      <span className="font-mono font-bold text-orange-400 tabular-nums px-2 py-0.5 rounded bg-[#12141c] border border-[#262c3e]">
                        ≤ {routesMaxPhotos}
                      </span>
                    </div>
                    {/* Linia przycisków mieszcząca się w jednej linii */}
                    <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
                      {PHOTO_THRESHOLDS.map((thresh) => {
                        const isSelected = routesMaxPhotos === thresh;
                        return (
                          <button
                            key={thresh}
                            type="button"
                            onClick={() => onChangeRoutesMaxPhotos?.(thresh)}
                            className={`flex-1 min-w-[32px] py-1 text-[10px] font-mono font-bold rounded-md border transition-all text-center ${
                              isSelected
                                ? 'bg-orange-500 border-orange-400 text-slate-950 shadow-xs'
                                : 'bg-[#141724] border border-[#282f42] text-slate-400 hover:text-slate-200 hover:bg-[#1d2234]'
                            }`}
                            title={`Pokazuj strzałki gdy na mapie jest mniej niż ${thresh} zdjęć`}
                          >
                            {thresh >= 1000 ? `${thresh / 1000}k` : thresh}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Parametr dodatkowy: Minimalna liczba widocznych zdjęć na mapie do wyświetlania trasy */}
                <div className="flex items-center justify-between pt-1 border-t border-[#222736]">
                  <span className="text-slate-300 font-medium">Min. liczba zdjęć:</span>
                  <div className="flex items-center gap-1">
                    {[2, 3, 5, 10, 20].map((num) => {
                      const isSel = routesMinPhotos === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => onChangeRoutesMinPhotos?.(num)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                            isSel
                              ? 'bg-orange-500 text-slate-950 shadow-xs'
                              : 'bg-[#131622] border border-[#262c3e] text-slate-400 hover:text-slate-200 hover:bg-[#1d2234]'
                          }`}
                          title={`Rysuj linię trasy od minimum ${num} zdjęć`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Clusters Toggle */}
          <div className="flex items-center justify-between bg-[#191d2c] p-2.5 rounded-xl border border-[#2c3348]">
            <div className="flex items-center gap-2">
              <div className={`w-3.5 h-3.5 rounded-full ${showClusters ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600'}`} />
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">Pokaż klastry</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showClusters}
                onChange={(e) => onToggleClusters(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          {/* Photo Preview Toggle */}
          <div className="flex items-center justify-between bg-[#191d2c] p-2.5 rounded-xl border border-[#2c3348]">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-slate-200">Podgląd zdjęć w kafelkach</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showPhotoPreview}
                onChange={(e) => onTogglePhotoPreview(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>
        </div>
      </div>
    </aside>
  );
};
