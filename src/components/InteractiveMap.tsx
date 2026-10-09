import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import L from 'leaflet';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  MapPin,
  Image as ImageIcon,
  Calendar,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Camera,
  Clock,
} from 'lucide-react';
import { PhotoEvent, CellInfo, ZoomLevel } from '../types';

interface InteractiveMapProps {
  visiblePhotos: PhotoEvent[];
  allPhotos: PhotoEvent[];
  totalPhotosCount: number;
  activeDateRangeText: string;
  selectedCell: CellInfo | null;
  selectedPhoto: PhotoEvent | null;
  lastChangeSource: 'CALENDAR' | 'MAP';
  calendarNavVersion?: number;
  zoomLevel?: ZoomLevel;
  showHeatmap: boolean;
  showRoutes: boolean;
  routesMode?: 'TEN_DAYS' | 'MAX_PHOTOS';
  routesMaxPhotos?: number;
  showClusters: boolean;
  routesMinPhotos?: number;
  routesOnlyFromTenDays?: boolean;
  heatmapOpacity?: number;
  onHeatmapOpacityChange?: (value: number) => void;
  onSelectPhoto: (photo: PhotoEvent) => void;
  onOpenFullPhoto?: (photo: PhotoEvent) => void;
  onMapViewportChange: (photosInView: PhotoEvent[]) => void;
  onUserMapNavigation?: (photosInView: PhotoEvent[]) => void;
}

// Custom Leaflet DivIcon for Photo Marker
// [WYDAJNOŚĆ] Zgodnie z wytycznymi zaremovano (zakomentowano) wyświetlanie ikonek miniatur oraz pasków nad miniaturkami z datą i godziną.
// Zastąpiono ultralekkim, płynnym punktem wektorowym (dot marker) dla natychmiastowego renderowania 60 FPS.
function createPhotoMarkerIcon(photo: PhotoEvent, isSelected: boolean) {
  /*
  === [ZAREMOWANE DLA WYDAJNOŚCI] Oryginalne formatowanie daty i style ramek miniatur ===
  const formattedDate = format(photo.timestamp, 'dd.MM.yyyy HH:mm', { locale: pl });

  const borderClass = isSelected
    ? 'border-2 border-amber-400 scale-110 z-50 ring-4 ring-amber-500/50'
    : 'border-2 border-orange-500 hover:scale-105 shadow-[0_0_12px_rgba(249,115,22,0.6)]';

  const dateBoxClass = isSelected
    ? 'bg-amber-500 text-slate-950 border-amber-300 font-black shadow-[0_0_12px_rgba(245,158,11,0.8)] scale-105'
    : 'bg-[#0b0e17]/95 text-amber-300 border-orange-500/80 shadow-[0_4px_12px_rgba(0,0,0,0.85)]';
  */

  const formattedDateTooltip = format(photo.timestamp, 'dd.MM.yyyy HH:mm', { locale: pl });
  const dotClass = isSelected
    ? 'w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white shadow-[0_0_12px_rgba(251,191,36,1)] ring-2 ring-amber-500/60 scale-125'
    : 'w-2.5 h-2.5 rounded-full bg-orange-500 border border-slate-950 hover:bg-amber-400 hover:scale-125 shadow-[0_0_8px_rgba(249,115,22,0.8)]';

  const html = `
    <!-- [ZAREMOWANE DLA WYDAJNOŚCI] Pasek nad miniaturką z datą i godziną:
    <div class="px-2 py-0.5 mb-1 rounded-md border text-[10px] font-mono whitespace-nowrap flex items-center gap-1 backdrop-blur-md transition-transform group-hover:scale-105 \${dateBoxClass}">
      <span class="text-[9px]">📅</span>
      <span>\${formattedDate}</span>
    </div>
    -->

    <!-- [ZAREMOWANE DLA WYDAJNOŚCI] Ikonka miniatury zdjęcia z podglądem obrazu i odznaką:
    <div class="relative">
      <div class="w-8 h-8 rounded-full bg-slate-900 \${borderClass} overflow-hidden flex items-center justify-center ring-2 ring-slate-950 transition-all">
        <img src="\${photo.imageUrl}" alt="\${photo.title}" class="w-full h-full object-cover" />
      </div>
      <div class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-orange-500 border border-slate-900 flex items-center justify-center text-[8px] font-bold text-slate-950 shadow">
        📷
      </div>
    </div>
    -->

    <!-- Ultralekki punkt lokalizacyjny (60 FPS - brak obciążenia DOM i pobierania grafik) -->
    <div class="flex items-center justify-center cursor-pointer transition-transform" style="width: 14px; height: 14px;" title="${photo.title} (${formattedDateTooltip})">
      <div class="${dotClass}"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-photo-marker-wrapper',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -8],
  });
}

// Custom DivIcon for Cluster Count Badge with Date Range Window
function createClusterBadgeIcon(count: number, dateRangeText: string) {
  const html = `
    <div class="flex flex-col items-center group cursor-pointer transition-all duration-200" style="width: 140px;">
      <!-- Okienko z zakresem dat dla klastra -->
      <div class="px-2 py-0.5 mb-1 rounded-md bg-[#0b0e17]/95 border border-amber-400/80 text-amber-300 font-mono text-[10px] font-bold shadow-[0_4px_12px_rgba(0,0,0,0.85)] whitespace-nowrap flex items-center gap-1 backdrop-blur-md">
        <span class="text-[9px]">📅</span>
        <span>${dateRangeText}</span>
      </div>

      <!-- Licznik klastra -->
      <div class="flex items-center justify-center min-w-[34px] h-8 px-2.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 border-2 border-[#121622] text-white font-extrabold text-xs shadow-[0_0_12px_rgba(249,115,22,0.85)] group-hover:scale-110 transition-transform">
        ${count} ${count === 1 ? 'zdjęcie' : count < 5 ? 'zdjęcia' : 'zdjęć'}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-cluster-marker-wrapper',
    iconSize: [140, 60],
    iconAnchor: [70, 42],
  });
}

// Calculate compass bearing between two coordinates in degrees (0 = North, 90 = East, 180 = South, 270 = West)
function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lng2 - lng1);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return (toDeg(theta) + 360) % 360;
}

// Custom DivIcon for delicate directional arrow along route
function createRouteArrowIcon(bearing: number) {
  const html = `
    <div style="transform: rotate(${bearing.toFixed(1)}deg); width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" style="filter: drop-shadow(0 0 2px rgba(0,0,0,0.9)) drop-shadow(0 0 4px rgba(249,115,22,0.8));">
        <path d="M12 3 L4 18 L12 14 L20 18 Z" fill="#fb923c" stroke="#ea580c" stroke-width="1.2" stroke-linejoin="round" />
      </svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-route-arrow',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

// Custom DivIcon for Route Date Badge (matching screenshot like 5/06, 13/06, 16/06 with arrow)
function createRouteBadgeIcon(dateText: string) {
  const html = `
    <div class="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-900/90 border border-amber-400 text-amber-300 font-mono text-[9px] font-bold shadow-lg backdrop-blur-sm">
      <span>▲</span>
      <span>${dateText}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-route-badge',
    iconSize: [48, 20],
    iconAnchor: [24, 10],
  });
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  visiblePhotos,
  allPhotos,
  totalPhotosCount,
  activeDateRangeText,
  selectedCell,
  selectedPhoto,
  lastChangeSource,
  calendarNavVersion,
  zoomLevel,
  showHeatmap,
  showRoutes,
  routesMode = 'TEN_DAYS',
  routesMaxPhotos = 200,
  showClusters,
  routesMinPhotos = 2,
  routesOnlyFromTenDays = true,
  heatmapOpacity = 0.30,
  onHeatmapOpacityChange,
  onSelectPhoto,
  onOpenFullPhoto,
  onMapViewportChange,
  onUserMapNavigation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const isProgrammaticMoveRef = useRef<boolean>(false);
  const isUserInteractingRef = useRef<boolean>(false);
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false);
  const [mapTheme, setMapTheme] = React.useState<'dark' | 'osm' | 'satellite'>('dark');
  const [mapViewportVersion, setMapViewportVersion] = React.useState<number>(0);
  const [isStripCollapsed, setIsStripCollapsed] = useState<boolean>(false);
  const [currentMapBounds, setCurrentMapBounds] = useState<L.LatLngBounds | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const allPhotosRef = useRef(allPhotos);
  allPhotosRef.current = allPhotos;
  const onMapViewportChangeRef = useRef(onMapViewportChange);
  onMapViewportChangeRef.current = onMapViewportChange;
  const onUserMapNavigationRef = useRef(onUserMapNavigation);
  onUserMapNavigationRef.current = onUserMapNavigation;
  const onOpenFullPhotoRef = useRef(onOpenFullPhoto);
  onOpenFullPhotoRef.current = onOpenFullPhoto;
  const hoverCardTimerRef = useRef<any>(null);

  // Initialize Leaflet Map safely
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    // Default view centered over Europe
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([52.5, 15.5], 5);

    // Tiles layer group
    const tileGroup = L.layerGroup().addTo(map);
    tileLayerGroupRef.current = tileGroup;

    // Default: Esri World Dark Gray Base + Reference (no API key required)
    const darkBase = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 16 }
    );
    const darkRef = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 16 }
    );
    tileGroup.addLayer(darkBase);
    tileGroup.addLayer(darkRef);

    markersLayerRef.current = L.layerGroup().addTo(map);
    routesLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Listeners to detect when user specifically interacts with map
    const onUserGesture = () => {
      if (!isProgrammaticMoveRef.current) {
        isUserInteractingRef.current = true;
      }
    };

    map.on('dragstart', onUserGesture);
    map.on('zoomstart', onUserGesture);

    const containerEl = mapContainerRef.current;
    containerEl.addEventListener('wheel', onUserGesture, { passive: true });
    containerEl.addEventListener('mousedown', onUserGesture, { passive: true });
    containerEl.addEventListener('touchstart', onUserGesture, { passive: true });

    // Listener when map moves or zooms
    const handleMapMoveEnd = () => {
      if (!mapInstanceRef.current) return;
      const bounds = mapInstanceRef.current.getBounds();
      setCurrentMapBounds(bounds);

      const currentPhotos = allPhotosRef.current;
      const photosInView = currentPhotos.filter((p) =>
        bounds.contains([p.coordinates.lat, p.coordinates.lng])
      );

      setMapViewportVersion((v) => v + 1);

      // ZAWSZE aktualizuj zdjęcia w kadrze (dla wskaźnika "X na mapie" oraz żółtych odznak na kafelkach)
      onMapViewportChangeRef.current(photosInView);

      // TYLKO jeśli ruch był bezpośrednim gestem użytkownika na mapie i nie był ruchem programowym:
      if (!isProgrammaticMoveRef.current && isUserInteractingRef.current) {
        isUserInteractingRef.current = false;
        onUserMapNavigationRef.current?.(photosInView);
      }
    };

    map.on('moveend zoomend viewreset resize', handleMapMoveEnd);
    // Początkowe pobranie granic mapy i przeliczenie widocznych punktów
    handleMapMoveEnd();

    // Listen for clicks and 0.5s hover on thumbnail/button inside marker popups to open full photo
    const handlePopupOpen = (e: L.PopupEvent) => {
      const el = e.popup.getElement();
      if (!el) return;
      const clickables = el.querySelectorAll('[data-fullphoto-id]');
      clickables.forEach((item) => {
        let popupHoverTimer: any = null;

        item.addEventListener('mouseenter', () => {
          popupHoverTimer = setTimeout(() => {
            const id = item.getAttribute('data-fullphoto-id');
            const found = allPhotosRef.current.find((p) => p.id === id);
            if (found) {
              onOpenFullPhotoRef.current?.(found);
            }
          }, 500);
        });

        item.addEventListener('mouseleave', () => {
          if (popupHoverTimer) {
            clearTimeout(popupHoverTimer);
            popupHoverTimer = null;
          }
        });

        item.addEventListener('click', (evt) => {
          if (popupHoverTimer) {
            clearTimeout(popupHoverTimer);
            popupHoverTimer = null;
          }
          evt.preventDefault();
          evt.stopPropagation();
          const id = item.getAttribute('data-fullphoto-id');
          const found = allPhotosRef.current.find((p) => p.id === id);
          if (found) {
            onOpenFullPhotoRef.current?.(found);
          }
        });
      });
    };
    map.on('popupopen', handlePopupOpen);

    // Force Leaflet to compute exact container dimensions
    map.invalidateSize();
    const initTimer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(containerEl);
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(initTimer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      containerEl.removeEventListener('wheel', onUserGesture);
      containerEl.removeEventListener('mousedown', onUserGesture);
      containerEl.removeEventListener('touchstart', onUserGesture);
      map.off('popupopen', handlePopupOpen);
      map.off('moveend zoomend viewreset resize', handleMapMoveEnd);
      map.off('dragstart', onUserGesture);
      map.off('zoomstart', onUserGesture);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update base tiles on map theme switch
  useEffect(() => {
    const group = tileLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (mapTheme === 'dark') {
      const darkBase = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 16 }
      );
      const darkRef = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 16 }
      );
      group.addLayer(darkBase);
      group.addLayer(darkRef);
    } else if (mapTheme === 'osm') {
      const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      });
      group.addLayer(osm);
    } else if (mapTheme === 'satellite') {
      const sat = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      );
      group.addLayer(sat);
    }
  }, [mapTheme]);

  const shadowCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const paletteRef = useRef<Uint8ClampedArray | null>(null);
  const lastFittedNavVersionRef = useRef<number>(-1);

  const programmaticMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Alias dla czytelności w callbackach (prop z App.tsx)
  const HEATMAP_OPACITY = heatmapOpacity;


  // Generate 256-color thermal gradient palette lookup table
  // Tworzy płynne, bogate przejście od transparentnego błękitu/cyjanu przez zieleń, żółć, pomarańcz aż do czerwieni w samym centrum o najwyższym zagęszczeniu.
  const getPalette = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new Uint8ClampedArray(256 * 4);

    const o = HEATMAP_OPACITY; // skrót do skalowania alpha
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    // Skala termiczna z pełnym spektrum kolorystycznym (niebieski -> cyjan -> zieleń -> żółć -> pomarańcz -> karmin):
    grad.addColorStop(0.00, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.05, `rgba(30, 60, 160,  ${(0.30 * o).toFixed(3)})`);  // delikatny granat/błękit na obrzeżach
    grad.addColorStop(0.20, `rgba(0, 150, 255,  ${(0.55 * o).toFixed(3)})`);  // jasny błękit
    grad.addColorStop(0.40, `rgba(0, 225, 200,  ${(0.70 * o).toFixed(3)})`);  // cyjan / turkus
    grad.addColorStop(0.55, `rgba(50, 205, 50,  ${(0.80 * o).toFixed(3)})`);  // zieleń (płynne przejście)
    grad.addColorStop(0.70, `rgba(255, 215, 0,  ${(0.88 * o).toFixed(3)})`);  // ciepły żółty
    grad.addColorStop(0.85, `rgba(255, 120, 0,  ${(0.92 * o).toFixed(3)})`);  // pomarańcz
    grad.addColorStop(1.00, `rgba(220, 20, 40,  ${(0.96 * o).toFixed(3)})`);  // czerwień / purpura tylko w jądrze skupiska

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1, 256);
    return ctx.getImageData(0, 0, 1, 256).data;
  }, [HEATMAP_OPACITY]);

  // Render pure HTML5 Canvas Heatmap layer (60 FPS, smooth thermal gradient)
  const drawHeatmap = React.useCallback(() => {
    try {
      const canvas = canvasRef.current;
      const map = mapInstanceRef.current;
      if (!canvas || !map) return;

      const size = map.getSize();
      if (!size || size.x <= 0 || size.y <= 0) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (canvas.width !== size.x || canvas.height !== size.y) {
        canvas.width = size.x;
        canvas.height = size.y;
      }

      ctx.clearRect(0, 0, size.x, size.y);
      if (!showHeatmap) return;

      const photosToHeat = visiblePhotos.length > 0 ? visiblePhotos : allPhotos;
      if (photosToHeat.length === 0) return;

      // Create / size offscreen shadow canvas for alpha accumulation
      if (!shadowCanvasRef.current) {
        shadowCanvasRef.current = document.createElement('canvas');
      }
      const shadow = shadowCanvasRef.current;
      if (shadow.width !== size.x || shadow.height !== size.y) {
        shadow.width = size.x;
        shadow.height = size.y;
      }
      const shadowCtx = shadow.getContext('2d');
      if (!shadowCtx) return;
      shadowCtx.clearRect(0, 0, size.x, size.y);

      // Adjust disc radius dynamically based on map zoom level for optimal density blending
      const currentZoom = map.getZoom();
      const radius = Math.max(22, Math.min(60, currentZoom * 6.5));

      // Obliczamy wagę pojedynczego punktu w zależności od liczby punktów w widoku,
      // aby uniknąć natychmiastowego przepalenia (nasycenia na 100% czerwień).
      // Dla 1-5 punktów waga jest nieco wyższa, dla setek/tysięcy punktów płynnie skaluje się w dół,
      // dając piękne, szerokie spektrum barwne (niebieski -> cyjan -> zieleń -> żółty -> pomarańcz -> czerwony).
      const pointCount = photosToHeat.length;
      const baseAlpha = Math.max(0.04, Math.min(0.22, 1.2 / Math.sqrt(Math.max(1, pointCount))));

      // High-performance stamp canvas: pre-render the radial blur disc ONCE, then stamp it with fast drawImage
      const stamp = document.createElement('canvas');
      stamp.width = radius * 2;
      stamp.height = radius * 2;
      const stampCtx = stamp.getContext('2d');
      if (stampCtx) {
        const blurGradient = stampCtx.createRadialGradient(radius, radius, 0, radius, radius, radius);
        blurGradient.addColorStop(0,   `rgba(0,0,0,${baseAlpha.toFixed(3)})`);
        blurGradient.addColorStop(0.35, `rgba(0,0,0,${(baseAlpha * 0.55).toFixed(3)})`);
        blurGradient.addColorStop(0.7, `rgba(0,0,0,${(baseAlpha * 0.20).toFixed(3)})`);
        blurGradient.addColorStop(1,   'rgba(0,0,0,0)');
        stampCtx.fillStyle = blurGradient;
        stampCtx.beginPath();
        stampCtx.arc(radius, radius, radius, 0, Math.PI * 2);
        stampCtx.fill();

        // 1. Accumulate point intensity smoothly on shadow canvas using GPU-accelerated drawImage
        photosToHeat.forEach((p) => {
          const point = map.latLngToContainerPoint([
            p.coordinates.lat,
            p.coordinates.lng,
          ]);

          if (
            point.x < -radius ||
            point.x > size.x + radius ||
            point.y < -radius ||
            point.y > size.y + radius
          ) {
            return;
          }

          shadowCtx.drawImage(stamp, point.x - radius, point.y - radius);
        });
      }

      // 2. Normalizacja maksymalnej intensywności dla uzyskania pełnej dynamiki tonalnej
      const shadowImgData = shadowCtx.getImageData(0, 0, size.x, size.y);
      const alphaBuffer = shadowImgData.data;

      // Znajdźmy maksymalny poziom alpha w nałożonych punktach
      let maxAlpha = 0;
      for (let i = 3; i < alphaBuffer.length; i += 4) {
        if (alphaBuffer[i] > maxAlpha) {
          maxAlpha = alphaBuffer[i];
        }
      }

      // Skaluj mapowanie palety: jeśli maxAlpha jest niski lub wysoki,
      // normalizujemy indeks palety (0..255) z krzywą gamma (np. 0.8), aby rozciągnąć kolory
      // i zagwarantować pełne przejście od błękitu, przez cyjan, zieleń, żółć, aż po czerwień w pikach.
      const palette = getPalette();
      const palette32 = new Uint32Array(palette.buffer);
      const pixels32 = new Uint32Array(shadowImgData.data.buffer);

      const targetMax = Math.max(maxAlpha, 1);
      const invMax = 255 / targetMax;

      for (let i = 0; i < pixels32.length; i++) {
        const rawAlpha = alphaBuffer[i * 4 + 3];
        if (rawAlpha > 0) {
          // Normalizacja z lekką krzywą, by zachować subtelne brzegi i wyrazisty gradient
          const normalized = Math.min(255, Math.round(Math.pow(rawAlpha / targetMax, 0.75) * 255));
          pixels32[i] = palette32[normalized];
        }
      }

      ctx.putImageData(shadowImgData, 0, 0);
    } catch (err) {
      console.warn('Canvas heatmap render warning:', err);
    }
  }, [showHeatmap, visiblePhotos, allPhotos, getPalette, HEATMAP_OPACITY]);

  const rafIdRef = useRef<number | null>(null);

  const requestDrawHeatmap = useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      drawHeatmap();
    });
  }, [drawHeatmap]);

  // Update canvas heatmap on map move/zoom and data updates
  useEffect(() => {
    drawHeatmap();
    const map = mapInstanceRef.current;
    if (!map) return;

    map.on('move zoom viewreset resize', requestDrawHeatmap);
    return () => {
      map.off('move zoom viewreset resize', requestDrawHeatmap);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [drawHeatmap, requestDrawHeatmap]);

  // Update Route Polyline & Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const routesLayer = routesLayerRef.current;
    if (!map || !markersLayer || !routesLayer) return;

    markersLayer.clearLayers();
    routesLayer.clearLayers();

    const photosToRender = visiblePhotos.length > 0 ? visiblePhotos : allPhotos;
    if (photosToRender.length === 0) return;

    const bounds = L.latLngBounds([]);

    // 1. Draw Trajectory Routes if enabled (available across all time scales and zoom levels)
    const validPhotosForRoute = photosToRender.filter(
      (p) =>
        p &&
        p.coordinates &&
        typeof p.coordinates.lat === 'number' &&
        typeof p.coordinates.lng === 'number' &&
        !isNaN(p.coordinates.lat) &&
        !isNaN(p.coordinates.lng)
    );

    // Sprawdź, czy skala czasu lub limit liczby punktów pozwala na wyświetlanie linii trasy (wzajemnie wykluczające się tryby)
    const isRouteAllowed =
      routesMode === 'MAX_PHOTOS'
        ? validPhotosForRoute.length <= routesMaxPhotos
        : (zoomLevel === 'TEN_DAYS' || zoomLevel === 'DAYS' || zoomLevel === 'HOURS');

    const minRequiredPhotos = 2;

    if (showRoutes && isRouteAllowed && validPhotosForRoute.length >= minRequiredPhotos) {
      if (!map.hasLayer(routesLayer)) {
        routesLayer.addTo(map);
      }

      // Sort chronologically ascending
      const sorted = [...validPhotosForRoute].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );
      const routeCoords: [number, number][] = sorted.map((p) => [
        p.coordinates.lat,
        p.coordinates.lng,
      ]);

      // Kontrastowy ciemny obrys pod spodem (widoczny na każdym podkładzie mapy)
      const polylineBg = L.polyline(routeCoords, {
        color: '#060812',
        weight: 6,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      });
      routesLayer.addLayer(polylineBg);

      // Główna, jaskrawa pomarańczowa linia przerywana
      const polyline = L.polyline(routeCoords, {
        color: '#f97316',
        weight: 3.5,
        opacity: 0.95,
        dashArray: '7, 8',
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      });
      routesLayer.addLayer(polyline);

      // Dodaj subtelne strzałki kierunku trasy
      const arrowStep = Math.max(1, Math.floor(sorted.length / 20));
      for (let i = 0; i < sorted.length - 1; i += arrowStep) {
        const p1 = sorted[i];
        const p2 = sorted[i + 1];
        if (!p1 || !p2) continue;
        const dist = Math.hypot(
          p2.coordinates.lat - p1.coordinates.lat,
          p2.coordinates.lng - p1.coordinates.lng
        );

        if (dist > 0.0001) {
          const midLat = (p1.coordinates.lat + p2.coordinates.lat) / 2;
          const midLng = (p1.coordinates.lng + p2.coordinates.lng) / 2;
          const bearing = calculateBearing(
            p1.coordinates.lat,
            p1.coordinates.lng,
            p2.coordinates.lat,
            p2.coordinates.lng
          );

          const arrowMarker = L.marker([midLat, midLng], {
            icon: createRouteArrowIcon(bearing),
            interactive: false,
          });
          routesLayer.addLayer(arrowMarker);
        }
      }

      // Dodaj plakietki z datami w kluczowych punktach trasy
      const step = Math.max(1, Math.floor(sorted.length / 8));
      for (let i = 0; i < sorted.length; i += step) {
        const photo = sorted[i];
        if (!photo) continue;
        const dateStr = format(photo.timestamp, 'd/MM', { locale: pl });
        const badgeMarker = L.marker([photo.coordinates.lat, photo.coordinates.lng], {
          icon: createRouteBadgeIcon(dateStr),
          interactive: false,
        });
        routesLayer.addLayer(badgeMarker);
      }
    }

    // 2. Render Markers or Cluster Badges
    if (showClusters) {
      // Group nearby photos into cluster badges
      const clusters: {
        lat: number;
        lng: number;
        count: number;
        photos: PhotoEvent[];
      }[] = [];
      const threshold = 1.2; // lat/lng distance threshold

      photosToRender.forEach((photo) => {
        let added = false;
        for (const c of clusters) {
          const dist = Math.hypot(
            c.lat - photo.coordinates.lat,
            c.lng - photo.coordinates.lng
          );
          if (dist < threshold) {
            c.count++;
            c.photos.push(photo);
            added = true;
            break;
          }
        }
        if (!added) {
          clusters.push({
            lat: photo.coordinates.lat,
            lng: photo.coordinates.lng,
            count: 1,
            photos: [photo],
          });
        }
      });

      clusters.forEach((cluster) => {
        if (cluster.count === 1) {
          const singlePhoto = cluster.photos[0];
          const isSelected = selectedPhoto?.id === singlePhoto.id;
          const marker = L.marker([cluster.lat, cluster.lng], {
            icon: createPhotoMarkerIcon(singlePhoto, isSelected),
          });

          let hoverTimer: any = null;
          marker.on('mouseover', () => {
            hoverTimer = setTimeout(() => {
              onOpenFullPhotoRef.current?.(singlePhoto);
            }, 500);
          });
          marker.on('mouseout', () => {
            if (hoverTimer) {
              clearTimeout(hoverTimer);
              hoverTimer = null;
            }
          });
          marker.on('click', () => {
            if (hoverTimer) {
              clearTimeout(hoverTimer);
              hoverTimer = null;
            }
            onSelectPhoto(singlePhoto);
          });

          markersLayer.addLayer(marker);
          bounds.extend([cluster.lat, cluster.lng]);
          return;
        }

        const sortedClusterPhotos = [...cluster.photos].sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
        );
        const firstDate = sortedClusterPhotos[0].timestamp;
        const lastDate = sortedClusterPhotos[sortedClusterPhotos.length - 1].timestamp;

        let rangeText = format(firstDate, 'dd.MM.yyyy', { locale: pl });
        if (firstDate.toDateString() !== lastDate.toDateString()) {
          rangeText = `${format(firstDate, 'd.MM')} – ${format(lastDate, 'd.MM.yyyy')}`;
        } else {
          rangeText = `${format(firstDate, 'dd.MM.yy')} (${format(firstDate, 'HH:mm')}–${format(lastDate, 'HH:mm')})`;
        }

        const marker = L.marker([cluster.lat, cluster.lng], {
          icon: createClusterBadgeIcon(cluster.count, rangeText),
        });

        let clusterHoverTimer: any = null;
        marker.on('mouseover', () => {
          clusterHoverTimer = setTimeout(() => {
            onOpenFullPhotoRef.current?.(cluster.photos[0]);
          }, 500);
        });
        marker.on('mouseout', () => {
          if (clusterHoverTimer) {
            clearTimeout(clusterHoverTimer);
            clusterHoverTimer = null;
          }
        });
        marker.on('click', () => {
          if (clusterHoverTimer) {
            clearTimeout(clusterHoverTimer);
            clusterHoverTimer = null;
          }
          onSelectPhoto(cluster.photos[0]);
        });

        markersLayer.addLayer(marker);
        bounds.extend([cluster.lat, cluster.lng]);
      });
    } else {
      // Calculate overall bounds for calendar navigation
      photosToRender.forEach((photo) => {
        bounds.extend([photo.coordinates.lat, photo.coordinates.lng]);
      });

      // Viewport culling for high performance:
      // When dataset is large (>50 photos), instantiate DOM markers only for photos within visible map viewport (+20% margin)
      const currentMapBounds = map.getBounds().pad(0.2);
      const isLargeSet = photosToRender.length > 50;

      const photosToInstantiate = isLargeSet
        ? photosToRender
            .filter(
              (photo) =>
                (selectedPhoto && selectedPhoto.id === photo.id) ||
                currentMapBounds.contains([photo.coordinates.lat, photo.coordinates.lng])
            )
            .slice(0, 100) // cap DOM markers to 100 for instant 60 FPS
        : photosToRender;

      photosToInstantiate.forEach((photo) => {
        const isSelected = selectedPhoto?.id === photo.id;
        const marker = L.marker([photo.coordinates.lat, photo.coordinates.lng], {
          icon: createPhotoMarkerIcon(photo, isSelected),
        });

        const popupHtml = `
          <div style="width: 210px; padding: 4px;">
            <div data-fullphoto-id="${photo.id}" style="border-radius: 8px; overflow: hidden; height: 115px; margin-bottom: 8px; background: #000; cursor: pointer; position: relative;" title="Kliknij miniaturkę, aby otworzyć pełne zdjęcie">
              <img src="${photo.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; bottom: 5px; right: 5px; background: rgba(15,23,42,0.85); color: #fb923c; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; border: 1px solid rgba(249,115,22,0.5); display: flex; align-items: center; gap: 3px; backdrop-filter: blur(4px);">
                <span>🔍 Powiększ</span>
              </div>
            </div>
            <div style="font-weight: 800; font-size: 13px; color: #f97316; margin-bottom: 2px;">
              ${photo.title}
            </div>
            <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
              📍 ${photo.locationName}
            </div>
            <div style="font-size: 10px; font-family: monospace; color: #94a3b8; margin-bottom: 6px;">
              📅 ${format(photo.timestamp, 'd MMMM yyyy, HH:mm', { locale: pl })}
            </div>
            <button data-fullphoto-id="${photo.id}" style="width: 100%; padding: 5px 8px; border-radius: 6px; background: #f97316; color: #0b0e17; font-weight: 700; font-size: 11px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
              <span>Wyświetl pełne zdjęcie</span>
              <span>↗</span>
            </button>
          </div>
        `;

        marker.bindPopup(popupHtml);

        let hoverTimer: any = null;
        marker.on('mouseover', () => {
          hoverTimer = setTimeout(() => {
            onOpenFullPhotoRef.current?.(photo);
          }, 500);
        });
        marker.on('mouseout', () => {
          if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
          }
        });
        marker.on('click', () => {
          if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
          }
          onSelectPhoto(photo);
        });

        markersLayer.addLayer(marker);
      });
    }

    // Auto-fit bounds ONLY when triggered by calendar navigation (zoom/scroll/click/jump) and photos exist
    const isCalendarTrigger =
      lastChangeSource === 'CALENDAR' &&
      calendarNavVersion !== undefined &&
      lastFittedNavVersionRef.current !== calendarNavVersion;

    const photosForBounds = visiblePhotos.length > 0 ? visiblePhotos : [];
    const calendarBounds = L.latLngBounds([]);
    photosForBounds.forEach((p) => {
      if (
        p &&
        p.coordinates &&
        typeof p.coordinates.lat === 'number' &&
        typeof p.coordinates.lng === 'number' &&
        !isNaN(p.coordinates.lat) &&
        !isNaN(p.coordinates.lng)
      ) {
        calendarBounds.extend([p.coordinates.lat, p.coordinates.lng]);
      }
    });

    if (calendarBounds.isValid() && isCalendarTrigger && photosForBounds.length > 0) {
      lastFittedNavVersionRef.current = calendarNavVersion;
      isProgrammaticMoveRef.current = true;
      isUserInteractingRef.current = false;
      
      let moveEndFired = false;
      const onProgrammaticMoveEnd = () => {
        moveEndFired = true;
        isProgrammaticMoveRef.current = false;
        isUserInteractingRef.current = false;
      };
      
      map.once('moveend', onProgrammaticMoveEnd);
      
      if (photosForBounds.length === 1) {
        map.setView(
          [photosForBounds[0].coordinates.lat, photosForBounds[0].coordinates.lng],
          12,
          { animate: true }
        );
      } else {
        map.fitBounds(calendarBounds, {
          padding: [50, 50],
          maxZoom: 13,
          animate: true,
        });
      }
      
      // Fallback in case moveend doesn't fire (e.g. map already exactly at these bounds)
      if (programmaticMoveTimeoutRef.current) {
        clearTimeout(programmaticMoveTimeoutRef.current);
      }
      programmaticMoveTimeoutRef.current = setTimeout(() => {
        if (!moveEndFired) {
          map.off('moveend', onProgrammaticMoveEnd);
          isProgrammaticMoveRef.current = false;
          isUserInteractingRef.current = false;
        }
      }, 800);
    }
  }, [
    visiblePhotos,
    selectedPhoto,
    lastChangeSource,
    calendarNavVersion,
    onSelectPhoto,
    allPhotos,
    showRoutes,
    showClusters,
    routesMinPhotos,
    routesOnlyFromTenDays,
    zoomLevel,
    mapViewportVersion,
  ]);

  // Oblicz punkty widoczne w bieżącym kadrze mapy:
  // "mają być pokazywane zdjęcia dla punktów widocznych w danym memoncie na mapie,
  // ale powiedzmy, że pierwsze 20 zdjęć, tylko tyle, żeby zapełnić pasek z możliwością
  // przewijania w lewo i prawo. Od lewej mają być najstarsze zdjęcia - odpowiedniki
  // dla widocznych na mapie w danym momencie punktów"
  const { stripPhotos, totalVisibleOnMapCount } = useMemo(() => {
    const sourcePhotos = visiblePhotos.length > 0 ? visiblePhotos : allPhotos;
    const valid = sourcePhotos.filter(
      (p) =>
        p &&
        p.coordinates &&
        typeof p.coordinates.lat === 'number' &&
        typeof p.coordinates.lng === 'number' &&
        !isNaN(p.coordinates.lat) &&
        !isNaN(p.coordinates.lng)
    );

    let inBounds = valid;
    if (currentMapBounds) {
      inBounds = valid.filter((p) =>
        currentMapBounds.contains([p.coordinates.lat, p.coordinates.lng])
      );
    }

    // Od lewej mają być najstarsze zdjęcia - sortowanie rosnąco chronologicznie
    const sorted = [...inBounds].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    return {
      stripPhotos: sorted.slice(0, 20),
      totalVisibleOnMapCount: sorted.length,
    };
  }, [visiblePhotos, allPhotos, currentMapBounds]);

  // Przewijanie paska miniatur w lewo i prawo
  const handleScrollStrip = (direction: 'left' | 'right') => {
    if (stripRef.current) {
      const scrollOffset = direction === 'left' ? -280 : 280;
      stripRef.current.scrollBy({ left: scrollOffset, behavior: 'smooth' });
    }
  };

  const handleStripWheel = (e: React.WheelEvent) => {
    if (stripRef.current && (e.deltaY !== 0 || e.deltaX !== 0)) {
      e.stopPropagation();
      stripRef.current.scrollLeft += e.deltaY !== 0 ? e.deltaY : e.deltaX;
    }
  };

  // Automatyczne dopasowanie przewinięcia paska do zaznaczonego zdjęcia
  useEffect(() => {
    if (selectedPhoto && stripRef.current) {
      const targetEl = stripRef.current.querySelector(
        `[data-photo-id="${selectedPhoto.id}"]`
      ) as HTMLElement | null;
      if (targetEl) {
        targetEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [selectedPhoto]);

  // Kliknięcie miniaturki w pasku: centruje mapę na punkcie i zaznacza zdjęcie
  const handleStripPhotoClick = (photo: PhotoEvent) => {
    onSelectPhoto(photo);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo(
        [photo.coordinates.lat, photo.coordinates.lng],
        { animate: true, duration: 0.4 }
      );
    }
  };

  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!isFullscreen) {
      if (mapContainerRef.current.parentElement?.requestFullscreen) {
        mapContainerRef.current.parentElement.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div className="w-full h-full rounded-2xl bg-[#0b0d14] border border-[#222736] overflow-hidden flex flex-col shadow-2xl relative min-h-0">
      {/* Main Map Canvas View */}
      <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-[1]"
        />

        {/* Custom Map Navigation Controls (Zoom In/Out, Fullscreen) matching screenshot */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1">
          <button
            onClick={() => {
              isUserInteractingRef.current = true;
              mapInstanceRef.current?.zoomIn();
            }}
            className="w-8 h-8 rounded-lg bg-[#181b26]/90 border border-[#2f354a] text-slate-200 font-bold text-base hover:bg-orange-500 hover:text-slate-950 transition-all flex items-center justify-center shadow-lg backdrop-blur-md"
            title="Przybliż"
          >
            +
          </button>
          <button
            onClick={() => {
              isUserInteractingRef.current = true;
              mapInstanceRef.current?.zoomOut();
            }}
            className="w-8 h-8 rounded-lg bg-[#181b26]/90 border border-[#2f354a] text-slate-200 font-bold text-base hover:bg-orange-500 hover:text-slate-950 transition-all flex items-center justify-center shadow-lg backdrop-blur-md"
            title="Oddal"
          >
            -
          </button>
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-lg bg-[#181b26]/90 border border-[#2f354a] text-slate-300 hover:text-orange-400 hover:bg-[#222738] transition-all flex items-center justify-center shadow-lg backdrop-blur-md mt-1"
            title="Tryb pełnoekranowy"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Map Theme Mode Switcher */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-[#181b26]/90 border border-[#2f354a] rounded-lg p-1 shadow-lg backdrop-blur-md text-[11px]">
          <button
            onClick={() => setMapTheme('dark')}
            className={`px-2.5 py-1 rounded transition-colors ${
              mapTheme === 'dark'
                ? 'bg-amber-400 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Ciemny motyw kartograficzny (Esri Dark)"
          >
            Ciemna
          </button>
          <button
            onClick={() => setMapTheme('osm')}
            className={`px-2.5 py-1 rounded transition-colors ${
              mapTheme === 'osm'
                ? 'bg-amber-400 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
            title="OpenStreetMap"
          >
            Ulice
          </button>
          <button
            onClick={() => setMapTheme('satellite')}
            className={`px-2.5 py-1 rounded transition-colors ${
              mapTheme === 'satellite'
                ? 'bg-amber-400 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Zdjęcia satelitarne (Esri World Imagery)"
          >
            Satelita
          </button>
        </div>

        {/* Heatmap Quick Opacity Control directly on the map (visible when heatmap is enabled) */}
        {showHeatmap && onHeatmapOpacityChange && (
          <div className="absolute top-16 right-4 z-20 flex items-center gap-2 bg-[#181b26]/90 border border-[#2f354a] rounded-lg px-2.5 py-1.5 shadow-lg backdrop-blur-md text-[11px]">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <span>🔥</span>
              <span className="text-slate-300 font-medium hidden sm:inline">Przezroczystość:</span>
            </span>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={Math.round(heatmapOpacity * 100)}
              onChange={(e) => onHeatmapOpacityChange(Number(e.target.value) / 100)}
              className="w-16 sm:w-24 h-1.5 bg-[#121520] rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400"
              title={`Przezroczystość heatmapy: ${Math.round(heatmapOpacity * 100)}%`}
            />
            <span className="font-mono font-bold text-orange-400 tabular-nums text-[10px]">
              {Math.round(heatmapOpacity * 100)}%
            </span>
          </div>
        )}

        {/* Cartographic Attribution Overlay */}
        <div className="absolute bottom-1 right-2 z-10 text-[9px] font-mono text-slate-500 bg-slate-950/70 px-2 py-0.5 rounded">
          © Esri, OpenStreetMap contributors
        </div>

        {/* Empty state overlay */}
        {visiblePhotos.length === 0 && (
          <div className="absolute inset-x-6 top-6 bg-slate-900/90 border border-slate-700 rounded-xl p-3 backdrop-blur-md flex items-center justify-between z-10 text-slate-200 shadow-xl">
            <div className="flex items-center gap-2 text-xs">
              <ImageIcon className="w-4 h-4 text-orange-400" />
              <span>
                Brak zdjęć w wybranym przedziale. Zmień datę w prawym panelu
                lub przesuń mapę.
              </span>
            </div>
          </div>
        )}

        {/* Selected Photo Floating Inspector Card */}
        {selectedPhoto && (
          <div
            onClick={() => {
              if (hoverCardTimerRef.current) clearTimeout(hoverCardTimerRef.current);
              onOpenFullPhoto?.(selectedPhoto);
            }}
            onMouseEnter={() => {
              if (hoverCardTimerRef.current) clearTimeout(hoverCardTimerRef.current);
              hoverCardTimerRef.current = setTimeout(() => {
                onOpenFullPhoto?.(selectedPhoto);
              }, 500);
            }}
            onMouseLeave={() => {
              if (hoverCardTimerRef.current) {
                clearTimeout(hoverCardTimerRef.current);
                hoverCardTimerRef.current = null;
              }
            }}
            className="absolute bottom-4 left-4 right-4 sm:left-4 sm:right-auto sm:max-w-xs bg-[#151824]/95 hover:bg-[#1c2030] backdrop-blur-md border border-orange-500/60 hover:border-orange-400 rounded-xl p-3 shadow-2xl z-20 animate-fadeIn text-slate-100 flex items-center gap-3 cursor-pointer group transition-all hover:scale-[1.02]"
            title="Kliknij lub zatrzymaj kursor na 0,5 sek., aby otworzyć pełne zdjęcie"
          >
            <div className="relative shrink-0">
              <img
                src={selectedPhoto.imageUrl}
                alt={selectedPhoto.title}
                className="w-14 h-14 rounded-lg object-cover border border-slate-700 group-hover:border-orange-400 transition-colors"
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent rounded-lg flex items-center justify-center transition-colors">
                <Maximize2 className="w-4 h-4 text-white opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all drop-shadow" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-orange-400 truncate flex items-center justify-between gap-1">
                <span className="truncate">{selectedPhoto.title}</span>
                <span className="text-[10px] text-slate-400 shrink-0">↗</span>
              </div>
              <div className="text-[11px] text-slate-300 truncate">
                {selectedPhoto.locationName}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                {format(selectedPhoto.timestamp, 'd MMM yyyy, HH:mm', {
                  locale: pl,
                })}
              </div>
              <div className="text-[9px] text-orange-400/90 font-medium mt-1 flex items-center gap-1">
                <span>🔍 Kliknij miniaturkę</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dolny poziomy pasek miniatur dla punktów widocznych w bieżącym kadrze mapy */}
      <div className="shrink-0 border-t border-[#222736] bg-[#0c0e17]/95 backdrop-blur-md flex flex-col z-20 select-none">
        {/* Nagłówek i kontrolki przewijania paska */}
        <div className="h-7 px-3 bg-[#111420]/90 border-b border-[#1f2434] flex items-center justify-between text-[11px] text-slate-300">
          <div className="flex items-center gap-2 min-w-0">
            <Camera className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="font-semibold text-slate-200 shrink-0">
              Zdjęcia w kadrze mapy:
            </span>
            <span className="font-mono text-orange-400 font-bold shrink-0">
              {totalVisibleOnMapCount > 0
                ? `${stripPhotos.length} z ${totalVisibleOnMapCount}`
                : '0'}
            </span>
            <span className="text-[10px] text-slate-400 hidden md:inline truncate">
              {stripPhotos.length > 0
                ? '(od lewej najstarsze zdjęcia)'
                : '(przesuń lub oddal mapę, aby objąć punkty)'}
            </span>
            {stripPhotos.length > 0 && (
              <span className="text-[10px] text-slate-400 font-mono hidden lg:inline border-l border-slate-700 pl-2">
                📅 {format(stripPhotos[0].timestamp, 'd.MM', { locale: pl })} – {format(stripPhotos[stripPhotos.length - 1].timestamp, 'd.MM.yyyy', { locale: pl })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Przewijanie w lewo */}
            <button
              type="button"
              onClick={() => handleScrollStrip('left')}
              className="w-5 h-5 rounded bg-[#181d2a] hover:bg-orange-500 hover:text-slate-950 text-slate-300 border border-[#2a3147] flex items-center justify-center transition-all cursor-pointer"
              title="Przewiń w lewo"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {/* Przewijanie w prawo */}
            <button
              type="button"
              onClick={() => handleScrollStrip('right')}
              className="w-5 h-5 rounded bg-[#181d2a] hover:bg-orange-500 hover:text-slate-950 text-slate-300 border border-[#2a3147] flex items-center justify-center transition-all cursor-pointer"
              title="Przewiń w prawo"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            {/* Zwiń / rozwiń pasek */}
            <button
              type="button"
              onClick={() => setIsStripCollapsed((prev) => !prev)}
              className="ml-1 px-1.5 py-0.5 rounded bg-[#181d2a] hover:bg-[#252b3d] text-slate-300 hover:text-orange-400 border border-[#2a3147] flex items-center gap-1 text-[10px] transition-all cursor-pointer"
              title={isStripCollapsed ? 'Rozwiń pasek miniatur' : 'Zwiń pasek miniatur'}
            >
              {isStripCollapsed ? (
                <>
                  <ChevronUp className="w-3 h-3 text-orange-400" />
                  <span className="hidden sm:inline">Rozwiń</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 text-orange-400" />
                  <span className="hidden sm:inline">Zwiń</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Lista poziomych miniatur */}
        {!isStripCollapsed && (
          <div
            ref={stripRef}
            onWheel={handleStripWheel}
            className="flex items-center gap-2 p-2 overflow-x-auto scroll-smooth scrollbar-thin scrollbar-thumb-orange-500/40 scrollbar-track-transparent"
            style={{ minHeight: '94px', maxHeight: '100px' }}
          >
            {stripPhotos.length === 0 ? (
              <div className="w-full flex items-center justify-center py-4 text-xs text-slate-400 gap-2">
                <ImageIcon className="w-4 h-4 text-slate-500" />
                <span>Brak zdjęć w bieżącym kadrze mapy — przesuń lub oddal widok.</span>
              </div>
            ) : (
              stripPhotos.map((photo, index) => {
                const isSelected = selectedPhoto?.id === photo.id;
                const dateStr = format(photo.timestamp, 'dd.MM HH:mm', { locale: pl });
                return (
                  <div
                    key={photo.id}
                    data-photo-id={photo.id}
                    onClick={() => handleStripPhotoClick(photo)}
                    onDoubleClick={() => onOpenFullPhoto?.(photo)}
                    className={`relative shrink-0 w-28 h-20 rounded-lg overflow-hidden cursor-pointer group transition-all duration-150 border ${
                      isSelected
                        ? 'border-2 border-amber-400 ring-2 ring-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.6)] scale-[1.02]'
                        : 'border-[#262c3e] hover:border-orange-400/80 hover:scale-[1.02]'
                    }`}
                    title={`${photo.title} (${format(photo.timestamp, 'd MMMM yyyy, HH:mm', { locale: pl })}) - Kliknij, aby wyśrodkować punkt`}
                  >
                    <img
                      src={photo.imageUrl}
                      alt={photo.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />

                    {/* Numer indeksu od najstarszego */}
                    <div className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-slate-950/80 text-amber-300 font-mono text-[8px] font-bold shadow pointer-events-none">
                      #{index + 1}
                    </div>

                    {/* Przycisk powiększenia */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenFullPhoto?.(photo);
                      }}
                      className="absolute top-1 right-1 w-5 h-5 rounded bg-slate-950/80 hover:bg-orange-500 hover:text-slate-950 text-slate-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      title="Otwórz pełne zdjęcie"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>

                    {/* Gradient z datą i lokalizacją na dole */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-1 pointer-events-none">
                      <div className="text-[9px] font-mono font-bold text-amber-300 truncate">
                        {dateStr}
                      </div>
                      <div className="text-[8px] text-slate-300 truncate opacity-90">
                        {photo.locationName}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

