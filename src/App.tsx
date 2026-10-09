/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  addYears,
  addMonths,
  addDays,
  addHours,
  startOfMonth,
} from 'date-fns';
import { CellInfo, ZoomLevel, PhotoEvent } from './types';
import { MOCK_PHOTOS } from './data/mockPhotos';
import {
  generateGridCells,
  formatHeaderDateRange,
  ZOOM_LEVEL_ORDER,
  addDecades,
  addTenDays,
  getStartOfPeriod,
  getPhotoPeriods,
} from './utils/dateUtils';
import { InteractiveMap } from './components/InteractiveMap';
import { ControlSidebar } from './components/ControlSidebar';
import { CellDetailModal } from './components/CellDetailModal';
import { JumpToDateModal } from './components/JumpToDateModal';
import { ExifExtractionModal } from './components/ExifExtractionModal';
import { FullPhotoModal } from './components/FullPhotoModal';
import { MssqlStatusModal, MssqlStatusData } from './components/MssqlStatusModal';

function calculateOptimalFocusDate(newZoom: ZoomLevel, currentFocus: Date, allPhotos: PhotoEvent[]): Date {
  const photoPeriods = getPhotoPeriods(allPhotos, newZoom);
  if (photoPeriods.length === 0) return currentFocus;

  const currentMatch = photoPeriods.find(
    (p) => currentFocus >= p.startDate && currentFocus <= p.endDate
  );
  if (currentMatch) return currentMatch.startDate;

  const focusTime = currentFocus.getTime();
  let minDiff = Infinity;
  let closest = photoPeriods[0].startDate;
  for (const p of photoPeriods) {
    const diff = Math.abs(p.startDate.getTime() - focusTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = p.startDate;
    }
  }

  return closest;
}

export default function App() {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('YEARS');
  const [now, setNow] = useState<Date>(() => new Date());
  const [selectedCell, setSelectedCell] = useState<CellInfo | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoEvent | null>(null);

  // MSSQL State
  const [mssqlStatus, setMssqlStatus] = useState<MssqlStatusData | null>(null);
  const [isLoadingMssql, setIsLoadingMssql] = useState<boolean>(false);
  const [showMssqlModal, setShowMssqlModal] = useState<boolean>(false);
  const [useMockMode, setUseMockMode] = useState<boolean>(false);
  const [mssqlPhotos, setMssqlPhotos] = useState<PhotoEvent[]>([]);

  // Photos: use MSSQL photos if connected and not in mock mode, otherwise mock photos
  const activePhotos = useMemo<PhotoEvent[]>(() => {
    if (!useMockMode && mssqlPhotos.length > 0) {
      return mssqlPhotos;
    }
    return MOCK_PHOTOS;
  }, [useMockMode, mssqlPhotos]);

  const [focusDate, setFocusDate] = useState<Date>(() => {
    if (MOCK_PHOTOS.length > 0) {
      const recentPhotos = MOCK_PHOTOS.filter((p) => p.timestamp.getFullYear() >= 2024);
      if (recentPhotos.length > 0) {
        return recentPhotos[0].timestamp;
      }
      return MOCK_PHOTOS[MOCK_PHOTOS.length - 1].timestamp;
    }
    return new Date();
  });

  // Check MSSQL status and fetch photos
  const checkMssqlAndFetch = useCallback(async () => {
    setIsLoadingMssql(true);
    try {
      const res = await fetch('/api/mssql/status');
      if (!res.ok) throw new Error('Błąd odpowiedzi serwera');
      const data: MssqlStatusData = await res.json();
      setMssqlStatus(data);

      if ((data.connected || (data.totalPhotos && data.totalPhotos > 0)) && (data.totalPhotos || 0) > 0) {
        // Fetch photos from MSSQL or Synced cache
        const photosRes = await fetch('/api/photos?limit=50000');
        if (photosRes.ok) {
          const pData = await photosRes.json();
          if (Array.isArray(pData.photos) && pData.photos.length > 0) {
            const mapped: PhotoEvent[] = pData.photos.map((p: any) => ({
              id: p.id,
              timestamp: new Date(p.timestamp),
              title: p.title,
              locationName: p.locationName,
              coordinates: { lat: p.lat, lng: p.lng },
              imageUrl: p.imageUrl,
              category: 'trip',
              cameraModel: p.cameraModel,
              fileSize: p.fileSize,
              filePath: p.filePath,
            }));
            setMssqlPhotos(mapped);
            setUseMockMode(false);

            // Automatically set focus date to the latest photo
            if (mapped.length > 0) {
              setFocusDate(mapped[mapped.length - 1].timestamp);
            }
          }
        }
      }
    } catch {
      // Graceful fallback to mock mode if backend or MSSQL isn't available
      setMssqlStatus({
        connected: false,
        server: 'localhost',
        database: 'GeoPhotoTracker',
        error: 'Nie można połączyć się z lokalnym serwerem MSSQL.',
      });
    } finally {
      setIsLoadingMssql(false);
    }
  }, []);

  useEffect(() => {
    checkMssqlAndFetch();
  }, [checkMssqlAndFetch]);

  // Handle configuration from modal
  const handleConfigureMssql = useCallback(
    async (cfg: { server: string; database: string; user?: string; password?: string; port: number }) => {
      const res = await fetch('/api/mssql/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Błąd konfiguracji');
      }
      await checkMssqlAndFetch();
    },
    [checkMssqlAndFetch]
  );

  // Handle manual sync from JSON/SSMS
  const handleSyncPhotos = useCallback(
    async (photos: any[]) => {
      const res = await fetch('/api/photos/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(photos),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Błąd importu zdjęć');
      }
      await checkMssqlAndFetch();
    },
    [checkMssqlAndFetch]
  );

  // Handle clearing synced cache
  const handleClearSync = useCallback(async () => {
    await fetch('/api/photos/clear-sync', { method: 'POST' });
    setMssqlPhotos([]);
    setUseMockMode(true);
    await checkMssqlAndFetch();
  }, [checkMssqlAndFetch]);

  // Map Layer Toggles matching reference image
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const [routesMinPhotos, setRoutesMinPhotos] = useState<number>(2);
  const [routesOnlyFromTenDays, setRoutesOnlyFromTenDays] = useState<boolean>(true);
  const [showClusters, setShowClusters] = useState<boolean>(false);
  const [showPhotoPreview, setShowPhotoPreview] = useState<boolean>(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.85);

  // Modals
  const [showJumpModal, setShowJumpModal] = useState<boolean>(false);
  const [showExifModal, setShowExifModal] = useState<boolean>(false);
  const [fullPhotoModalItem, setFullPhotoModalItem] = useState<PhotoEvent | null>(null);

  const [mapViewportPhotos, setMapViewportPhotos] = useState<PhotoEvent[]>([]);
  const [lastChangeSource, setLastChangeSource] = useState<'CALENDAR' | 'MAP'>('CALENDAR');

  // Set of photo IDs currently visible on the map viewport
  const mapViewportPhotoIds = useMemo(
    () => new Set(mapViewportPhotos.map((p) => p.id)),
    [mapViewportPhotos]
  );

  // Compute the 25 grid cells dynamically with map photo highlighting
  const cells = useMemo(() => {
    return generateGridCells(focusDate, zoomLevel, now, activePhotos, mapViewportPhotoIds);
  }, [focusDate, zoomLevel, now, activePhotos, mapViewportPhotoIds]);

  const dateRangeText = useMemo(() => {
    return formatHeaderDateRange(focusDate, zoomLevel, cells);
  }, [focusDate, zoomLevel, cells]);

  // Compute active visible photos for current 25-cell window (or selected cell)
  const visiblePhotos = useMemo(() => {
    if (cells.length === 0) return [];

    if (selectedCell) {
      return activePhotos.filter(
        (p) => p.timestamp >= selectedCell.startDate && p.timestamp <= selectedCell.endDate
      );
    }

    const activeCells = cells.filter((c) => !c.isOutOfBounds && c.label !== '');
    if (activeCells.length === 0) return [];

    const windowStart = activeCells[0].startDate;
    const windowEnd = activeCells[activeCells.length - 1].endDate;
    return activePhotos.filter(
      (p) => p.timestamp >= windowStart && p.timestamp <= windowEnd
    );
  }, [cells, selectedCell, activePhotos]);

  // Handle zoom scale change
  const handleHeaderZoomChange = useCallback(
    (newZoom: ZoomLevel) => {
      setLastChangeSource('CALENDAR');
      setZoomLevel(newZoom);
      setFocusDate((prev) => calculateOptimalFocusDate(newZoom, prev, activePhotos));
    },
    [activePhotos]
  );

  // Reset focus date to present real-time moment
  const handleResetToNow = useCallback(() => {
    setLastChangeSource('CALENDAR');
    setSelectedCell(null);
    setSelectedPhoto(null);
    const currentDate = new Date();
    setNow(currentDate);
    setFocusDate(currentDate);
  }, []);

  // Jump to specific date
  const handleJumpToDate = useCallback((targetDate: Date) => {
    setLastChangeSource('CALENDAR');
    setSelectedCell(null);
    setSelectedPhoto(null);
    setFocusDate(targetDate);
    setShowJumpModal(false);
  }, []);

  // Zoom into specific cell (step down scale hierarchy)
  const handleZoomInCell = useCallback(
    (cell: CellInfo) => {
      setLastChangeSource('CALENDAR');
      const currentIndex = ZOOM_LEVEL_ORDER.indexOf(zoomLevel);
      if (currentIndex < ZOOM_LEVEL_ORDER.length - 1) {
        const nextZoom = ZOOM_LEVEL_ORDER[currentIndex + 1];
        setZoomLevel(nextZoom);
        setSelectedCell(null);
        setFocusDate(calculateOptimalFocusDate(nextZoom, cell.startDate, activePhotos));
      }
    },
    [zoomLevel, activePhotos]
  );

  // Zoom out (step up scale hierarchy)
  const handleZoomOut = useCallback(() => {
    setLastChangeSource('CALENDAR');
    const currentIndex = ZOOM_LEVEL_ORDER.indexOf(zoomLevel);
    if (currentIndex > 0) {
      const prevZoom = ZOOM_LEVEL_ORDER[currentIndex - 1];
      setZoomLevel(prevZoom);
      setSelectedCell(null);
      setFocusDate((prev) => calculateOptimalFocusDate(prevZoom, prev, activePhotos));
    }
  }, [zoomLevel, activePhotos]);

  // Navigation handlers (Step backward / forward)
  const handlePrev = useCallback(() => {
    setLastChangeSource('CALENDAR');
    setSelectedCell(null);
    switch (zoomLevel) {
      case 'DECADES':
        setFocusDate((prev) => addDecades(prev, -25));
        break;
      case 'YEARS':
        setFocusDate((prev) => addYears(prev, -25));
        break;
      case 'MONTHS':
        setFocusDate((prev) => addMonths(prev, -25));
        break;
      case 'TEN_DAYS':
        setFocusDate((prev) => addTenDays(prev, -25));
        break;
      case 'DAYS':
        setFocusDate((prev) => addDays(prev, -25));
        break;
      case 'HOURS':
        setFocusDate((prev) => addHours(prev, -25));
        break;
    }
  }, [zoomLevel]);

  const handleNext = useCallback(() => {
    setLastChangeSource('CALENDAR');
    setSelectedCell(null);
    switch (zoomLevel) {
      case 'DECADES':
        setFocusDate((prev) => addDecades(prev, 25));
        break;
      case 'YEARS':
        setFocusDate((prev) => addYears(prev, 25));
        break;
      case 'MONTHS':
        setFocusDate((prev) => addMonths(prev, 25));
        break;
      case 'TEN_DAYS':
        setFocusDate((prev) => addTenDays(prev, 25));
        break;
      case 'DAYS':
        setFocusDate((prev) => addDays(prev, 25));
        break;
      case 'HOURS':
        setFocusDate((prev) => addHours(prev, 25));
        break;
    }
  }, [zoomLevel]);

  // Global mouse wheel event for zoom navigation
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('aside') || target.closest('[data-calendar-grid="true"]')) {
        return;
      }
      if (e.deltaY < -40) {
        const currentIndex = ZOOM_LEVEL_ORDER.indexOf(zoomLevel);
        if (currentIndex < ZOOM_LEVEL_ORDER.length - 1) {
          handleHeaderZoomChange(ZOOM_LEVEL_ORDER[currentIndex + 1]);
        }
      } else if (e.deltaY > 40) {
        const currentIndex = ZOOM_LEVEL_ORDER.indexOf(zoomLevel);
        if (currentIndex > 0) {
          handleHeaderZoomChange(ZOOM_LEVEL_ORDER[currentIndex - 1]);
        }
      }
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleGlobalWheel);
  }, [zoomLevel, handleHeaderZoomChange]);

  // Real-time clock tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update visible map viewport photos
  const handleMapViewportChange = useCallback((visibleOnMap: PhotoEvent[]) => {
    setMapViewportPhotos(visibleOnMap);
  }, []);

  // Select photo from marker click
  const handleSelectPhotoFromMap = useCallback(
    (photo: PhotoEvent) => {
      setLastChangeSource('MAP');
      setSelectedPhoto(photo);
      const matchingCell = cells.find(
        (c) => photo.timestamp >= c.startDate && photo.timestamp <= c.endDate
      );
      if (matchingCell) {
        setSelectedCell(matchingCell);
      } else {
        setFocusDate(photo.timestamp);
      }
    },
    [cells]
  );

  return (
    <div className="w-screen h-screen flex flex-col bg-[#0b0d14] text-slate-100 font-sans select-none overflow-hidden">
      {/* Main Screen Layout: Separated Left Map Window + Right Control Sidebar Window */}
      <main className="flex-1 w-full min-h-0 flex flex-row gap-3 p-2.5 sm:p-3 overflow-hidden">
        {/* Left Window: Interactive Map (Dynamic size to browser window, no vertical scrollbar) */}
        <section className="flex-1 min-w-0 h-full flex flex-col overflow-hidden relative rounded-2xl bg-[#0e111a] border border-[#222736] shadow-2xl">
          <InteractiveMap
            visiblePhotos={visiblePhotos}
            allPhotos={activePhotos}
            totalPhotosCount={activePhotos.length}
            activeDateRangeText={selectedCell ? `KAFELEK: ${selectedCell.label}` : dateRangeText}
            selectedCell={selectedCell}
            selectedPhoto={selectedPhoto}
            lastChangeSource={lastChangeSource}
            zoomLevel={zoomLevel}
            showHeatmap={showHeatmap}
            showRoutes={showRoutes}
            showClusters={showClusters}
            routesMinPhotos={routesMinPhotos}
            routesOnlyFromTenDays={routesOnlyFromTenDays}
            heatmapOpacity={heatmapOpacity}
            onHeatmapOpacityChange={setHeatmapOpacity}
            onSelectPhoto={handleSelectPhotoFromMap}
            onOpenFullPhoto={(photo) => setFullPhotoModalItem(photo)}
            onMapViewportChange={handleMapViewportChange}
          />
        </section>

        {/* Right Window: Control Sidebar (Max 560px, independent window with independent vertical scrollbar) */}
        <div className="w-[420px] sm:w-[450px] xl:w-[480px] 2xl:w-[500px] max-w-[560px] h-full min-h-0 shrink-0 flex flex-col rounded-2xl bg-[#0b0d14] border border-[#222736] overflow-hidden shadow-2xl">
          <ControlSidebar
            now={now}
            focusDate={focusDate}
            mapPhotosCount={mapViewportPhotos.length}
            totalPhotosCount={visiblePhotos.length}
            selectedRangeText={selectedCell ? selectedCell.label : dateRangeText}
            zoomLevel={zoomLevel}
            cells={cells}
            showPhotoPreview={showPhotoPreview}
            showHeatmap={showHeatmap}
            heatmapOpacity={heatmapOpacity}
            onHeatmapOpacityChange={setHeatmapOpacity}
            showRoutes={showRoutes}
            showClusters={showClusters}
            routesMinPhotos={routesMinPhotos}
            routesOnlyFromTenDays={routesOnlyFromTenDays}
            onChangeRoutesMinPhotos={setRoutesMinPhotos}
            onToggleRoutesOnlyFromTenDays={setRoutesOnlyFromTenDays}
            onZoomChange={handleHeaderZoomChange}
            onTogglePhotoPreview={setShowPhotoPreview}
            onToggleHeatmap={setShowHeatmap}
            onToggleRoutes={setShowRoutes}
            onToggleClusters={setShowClusters}
            onCellClick={(cell) => {
              setLastChangeSource('CALENDAR');
              setSelectedCell(cell);
            }}
            onZoomInCell={handleZoomInCell}
            onZoomOut={handleZoomOut}
            onPrev={handlePrev}
            onNext={handleNext}
            onOpenJumpModal={() => setShowJumpModal(true)}
            onResetToNow={handleResetToNow}
            onOpenMssqlModal={() => setShowMssqlModal(true)}
            isMssqlConnected={mssqlStatus?.connected}
            mssqlPhotoCount={mssqlStatus?.totalPhotos}
            useMockMode={useMockMode}
          />
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="w-full py-1.5 px-4 text-center text-[10px] text-slate-500 border-t border-[#1a1d2b] bg-[#090b12] shrink-0 font-mono">
        <div className="max-w-[1900px] mx-auto flex justify-between items-center">
          <span>GeoPhoto Tracker 5×5 — Połączona Analiza Geoprzestrzenna EXIF</span>
          <span className="flex items-center gap-2">
            <button
              onClick={() => setShowMssqlModal(true)}
              className={`hover:underline cursor-pointer ${
                mssqlStatus?.connected && !useMockMode ? 'text-emerald-400 font-bold' : 'text-blue-400'
              }`}
            >
              {mssqlStatus?.connected && !useMockMode
                ? `● MSSQL: ${activePhotos.length} zdjęć (${mssqlStatus.database})`
                : `○ Tryb Demo: ${activePhotos.length} zdjęć`}
            </button>
          </span>
        </div>
      </footer>

      {/* Cell Inspector Modal */}
      <CellDetailModal
        cell={selectedCell}
        zoomLevel={zoomLevel}
        onClose={() => setSelectedCell(null)}
        onZoomIntoCell={handleZoomInCell}
        onOpenFullPhoto={(photo) => setFullPhotoModalItem(photo)}
      />

      {/* Jump To Date Picker Modal */}
      <JumpToDateModal
        isOpen={showJumpModal}
        onClose={() => setShowJumpModal(false)}
        currentDate={focusDate}
        onJump={handleJumpToDate}
      />

      {/* EXIF Extraction Modal */}
      <ExifExtractionModal
        isOpen={showExifModal}
        onClose={() => setShowExifModal(false)}
        onScanComplete={() => setShowExifModal(false)}
      />

      {/* MSSQL Status & Config Modal */}
      <MssqlStatusModal
        isOpen={showMssqlModal}
        onClose={() => setShowMssqlModal(false)}
        status={mssqlStatus}
        isLoading={isLoadingMssql}
        onRefresh={checkMssqlAndFetch}
        onConfigure={handleConfigureMssql}
        useMockMode={useMockMode}
        onToggleMockMode={setUseMockMode}
        onSyncPhotos={handleSyncPhotos}
        onClearSync={handleClearSync}
      />

      {/* Full Photo Lightbox Modal */}
      <FullPhotoModal
        photo={fullPhotoModalItem}
        photosList={visiblePhotos.length > 0 ? visiblePhotos : activePhotos}
        onClose={() => setFullPhotoModalItem(null)}
        onSelectPhoto={(photo) => {
          setFullPhotoModalItem(photo);
          setSelectedPhoto(photo);
        }}
      />
    </div>
  );
}
