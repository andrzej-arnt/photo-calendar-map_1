export type ZoomLevel = 'DECADES' | 'YEARS' | 'MONTHS' | 'TEN_DAYS' | 'DAYS' | 'HOURS';

export interface CellInfo {
  index: number; // 0 to 24
  startDate: Date;
  endDate: Date;
  label: string;
  subLabel?: string;
  secondaryInfo?: string;
  isCurrent: boolean; // Contains NOW
  isPast: boolean;
  isFuture: boolean;
  isOutOfBounds?: boolean; // Out of allowed decade range (1970 - 2060)
  progressPercent: number; // 0 - 100 for current time progress inside cell
  photoCount?: number;
  hasMapPhotos?: boolean;
  mapPhotosCount?: number;
  locations?: string[];
  eventsCount?: number;
}

export interface CalendarViewState {
  zoomLevel: ZoomLevel;
  focusDate: Date; // Center/anchor date of the 25-cell window
  selectedCellIndex: number | null;
}

export interface PhotoEvent {
  id: string;
  timestamp: Date;
  title: string;
  locationName: string;
  coordinates: { lat: number; lng: number };
  imageUrl: string;
  category: 'trip' | 'nature' | 'urban' | 'family' | 'event';
  cameraModel?: string;
  fileSize?: number;
  filePath?: string;
}

export interface AppSettings {
  showConnectionLines: boolean;
  arrowDirection: 'forward' | 'backward';
  markerType: 'thumbnail' | 'dot';
  lineThickness: number;
  lineColor: string;
  linesMode: 'days' | 'count'; // 'days' = skala 10 dni i mniej, 'count' = progi liczbowe zdjęć
  photoCountThreshold: number; // np. 10, 25, 50, 100, 200, 500, 1000, 2000
}
