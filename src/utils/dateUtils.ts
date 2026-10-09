import {
  addYears,
  addMonths,
  addDays,
  addHours,
  startOfYear,
  startOfMonth,
  startOfDay,
  startOfHour,
  endOfYear,
  endOfMonth,
  endOfDay,
  endOfHour,
  format,
  isWithinInterval,
  isBefore,
  isAfter,
  differenceInMilliseconds,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { CellInfo, PhotoEvent, ZoomLevel } from '../types';

export function addDecades(date: Date, amount: number): Date {
  return addYears(date, amount * 10);
}

export function addTenDays(date: Date, amount: number): Date {
  return addDays(date, amount * 10);
}

export function startOfDecade(date: Date): Date {
  const year = date.getFullYear();
  const decadeStartYear = Math.floor(year / 10) * 10;
  return new Date(decadeStartYear, 0, 1, 0, 0, 0, 0);
}

export function endOfDecade(date: Date): Date {
  const year = date.getFullYear();
  const decadeStartYear = Math.floor(year / 10) * 10;
  return new Date(decadeStartYear + 9, 11, 31, 23, 59, 59, 999);
}

export function getStartOfPeriod(date: Date, zoomLevel: ZoomLevel): Date {
  switch (zoomLevel) {
    case 'DECADES':
      return startOfDecade(date);
    case 'YEARS':
      return startOfYear(date);
    case 'MONTHS':
      return startOfMonth(date);
    case 'TEN_DAYS':
    case 'DAYS':
      return startOfDay(date);
    case 'HOURS':
      return startOfHour(date);
  }
}

export const ZOOM_LEVEL_LABELS: Record<ZoomLevel, { name: string; icon: string; description: string }> = {
  DECADES: { name: 'Dziesięciolecia', icon: 'Globe', description: 'Widok 25 dziesięcioleci' },
  YEARS: { name: 'Lata', icon: 'CalendarDays', description: 'Widok 25 lat' },
  MONTHS: { name: 'Miesiące', icon: 'Calendar', description: 'Widok 25 miesięcy' },
  TEN_DAYS: { name: 'Dziesiątki dni', icon: 'Layers', description: 'Widok 25 dekad dni (bloki 10-dniowe)' },
  DAYS: { name: 'Dni', icon: 'Sun', description: 'Widok 25 dni' },
  HOURS: { name: 'Pory dnia', icon: 'Clock', description: 'Widok 25 pór dnia (Noc, Rano, Popołudnie, Wieczór — co 6h)' },
};

export const ZOOM_LEVEL_ORDER: ZoomLevel[] = ['DECADES', 'YEARS', 'MONTHS', 'TEN_DAYS', 'DAYS', 'HOURS'];

import { MOCK_PHOTOS } from '../data/mockPhotos';

export interface PhotoPeriod {
  startDate: Date;
  endDate: Date;
  label: string;
  subLabel?: string;
  matchingPhotos: PhotoEvent[];
}

const photoPeriodsCache = new Map<string, PhotoPeriod[]>();

export function getPhotoPeriods(photos: PhotoEvent[] = MOCK_PHOTOS, zoomLevel: ZoomLevel): PhotoPeriod[] {
  if (!photos || photos.length === 0) return [];

  const cacheKey = `${photos.length}_${photos[0]?.id}_${photos[photos.length - 1]?.id}_${zoomLevel}`;
  const cached = photoPeriodsCache.get(cacheKey);
  if (cached) return cached;

  const periodMap = new Map<number, PhotoPeriod>();

  for (const photo of photos) {
    const pDate = photo.timestamp;
    let startDate: Date;
    let endDate: Date;

    switch (zoomLevel) {
      case 'DECADES': {
        const cellDecadeStart = startOfDecade(pDate);
        startDate = cellDecadeStart;
        endDate = endOfDecade(cellDecadeStart);
        break;
      }
      case 'YEARS': {
        const cellYearStart = startOfYear(pDate);
        startDate = cellYearStart;
        endDate = endOfYear(cellYearStart);
        break;
      }
      case 'MONTHS': {
        const cellMonthStart = startOfMonth(pDate);
        startDate = cellMonthStart;
        endDate = endOfMonth(cellMonthStart);
        break;
      }
      case 'TEN_DAYS': {
        const year = pDate.getFullYear();
        const month = pDate.getMonth();
        const day = pDate.getDate();
        if (day <= 10) {
          startDate = new Date(year, month, 1, 0, 0, 0, 0);
          endDate = new Date(year, month, 10, 23, 59, 59, 999);
        } else if (day <= 20) {
          startDate = new Date(year, month, 11, 0, 0, 0, 0);
          endDate = new Date(year, month, 20, 23, 59, 59, 999);
        } else {
          startDate = new Date(year, month, 21, 0, 0, 0, 0);
          endDate = endOfMonth(pDate);
        }
        break;
      }
      case 'DAYS': {
        const cellDayStart = startOfDay(pDate);
        startDate = cellDayStart;
        endDate = endOfDay(cellDayStart);
        break;
      }
      case 'HOURS': {
        const baseDay = startOfDay(pDate);
        const hour = pDate.getHours();
        const hStart = Math.floor(hour / 6) * 6;
        const cellStart = addHours(baseDay, hStart);
        startDate = cellStart;
        endDate = new Date(cellStart.getTime() + 6 * 3600 * 1000 - 1);
        break;
      }
    }

    const key = startDate.getTime();
    const existing = periodMap.get(key);
    if (existing) {
      existing.matchingPhotos.push(photo);
    } else {
      let label = '';
      let subLabel: string | undefined = undefined;

      switch (zoomLevel) {
        case 'DECADES': {
          const startYear = startDate.getFullYear();
          const endYear = endDate.getFullYear();
          label = `${startYear} - ${endYear}`;
          subLabel = `Lata ${startYear}s`;
          break;
        }
        case 'YEARS': {
          label = format(startDate, 'yyyy');
          subLabel = format(startDate, 'yyyy', { locale: pl });
          break;
        }
        case 'MONTHS': {
          const mLabel = format(startDate, 'LLLL', { locale: pl });
          label = mLabel.charAt(0).toUpperCase() + mLabel.slice(1);
          subLabel = format(startDate, 'yyyy');
          break;
        }
        case 'TEN_DAYS': {
          const d1 = format(startDate, 'd MMM', { locale: pl });
          const d2 = format(endDate, 'd MMM', { locale: pl });
          label = `${d1}–${d2}`;
          subLabel = format(startDate, 'yyyy');
          break;
        }
        case 'DAYS': {
          const dayOfWeek = format(startDate, 'EEEE', { locale: pl });
          label = format(startDate, 'd MMMM', { locale: pl });
          subLabel = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
          break;
        }
        case 'HOURS': {
          const hStart = startDate.getHours();
          if (hStart < 6) {
            label = 'Noc';
          } else if (hStart < 12) {
            label = 'Rano';
          } else if (hStart < 18) {
            label = 'Popołudnie';
          } else {
            label = 'Wieczór';
          }

          subLabel = format(startDate, 'd MMM (EEE)', { locale: pl });
          break;
        }
      }

      periodMap.set(key, {
        startDate,
        endDate,
        label,
        subLabel,
        matchingPhotos: [photo],
      });
    }
  }

  const result = Array.from(periodMap.values()).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  photoPeriodsCache.set(cacheKey, result);
  return result;
}

export function generateGridCells(
  focusDate: Date,
  zoomLevel: ZoomLevel,
  now: Date,
  photos: PhotoEvent[] = MOCK_PHOTOS,
  mapViewportPhotoIds?: Set<string>
): CellInfo[] {
  const allPeriods = getPhotoPeriods(photos, zoomLevel);

  let photoPeriods = allPeriods;
  if (zoomLevel !== 'DECADES') {
    let parentStart: Date | undefined;
    let parentEnd: Date | undefined;
    switch (zoomLevel) {
      case 'YEARS':
        parentStart = startOfDecade(focusDate);
        parentEnd = endOfDecade(focusDate);
        break;
      case 'MONTHS':
        parentStart = startOfYear(focusDate);
        parentEnd = endOfYear(focusDate);
        break;
      case 'TEN_DAYS':
      case 'DAYS':
        parentStart = startOfMonth(focusDate);
        parentEnd = endOfMonth(focusDate);
        break;
      case 'HOURS':
        parentStart = startOfDay(focusDate);
        parentEnd = endOfDay(focusDate);
        break;
    }
    if (parentStart && parentEnd) {
      const filtered = allPeriods.filter(
        (p) => p.startDate >= parentStart! && p.startDate <= parentEnd!
      );
      if (filtered.length > 0) {
        photoPeriods = filtered;
      }
    }
  }

  if (photoPeriods.length === 0) {
    return Array.from({ length: 25 }, (_, i) => ({
      index: i,
      startDate: focusDate,
      endDate: focusDate,
      label: '',
      subLabel: undefined,
      isCurrent: false,
      isPast: false,
      isFuture: false,
      isOutOfBounds: true,
      progressPercent: 0,
      photoCount: 0,
      hasMapPhotos: false,
      mapPhotosCount: 0,
      locations: [],
      eventsCount: 0,
    }));
  }

  // Find period matching or closest to focusDate
  let matchedIndex = photoPeriods.findIndex(
    (p) => focusDate >= p.startDate && focusDate <= p.endDate
  );

  if (matchedIndex < 0) {
    const focusTime = focusDate.getTime();
    let minDiff = Infinity;
    matchedIndex = 0;
    photoPeriods.forEach((p, idx) => {
      const diff = Math.abs(p.startDate.getTime() - focusTime);
      if (diff < minDiff) {
        minDiff = diff;
        matchedIndex = idx;
      }
    });
  }

  const pageIndex = Math.floor(matchedIndex / 25);
  const pageStartIdx = pageIndex * 25;

  const cells: CellInfo[] = [];

  for (let i = 0; i < 25; i++) {
    const periodIdx = pageStartIdx + i;
    if (periodIdx < photoPeriods.length) {
      const period = photoPeriods[periodIdx];
      const { startDate, endDate, label, subLabel, matchingPhotos } = period;

      const isCurrent = isWithinInterval(now, { start: startDate, end: endDate });
      const isPast = isBefore(endDate, now);
      const isFuture = isAfter(startDate, now);

      let progressPercent = 0;
      if (isCurrent) {
        const total = differenceInMilliseconds(endDate, startDate);
        const elapsed = differenceInMilliseconds(now, startDate);
        progressPercent = Math.min(100, Math.max(0, (elapsed / total) * 100));
      } else if (isPast) {
        progressPercent = 100;
      }

      const photoCount = matchingPhotos.length;
      const locations = Array.from(new Set(matchingPhotos.map((p) => p.locationName)));

      const mapPhotosInCell = mapViewportPhotoIds
        ? matchingPhotos.filter((p) => mapViewportPhotoIds.has(p.id))
        : [];
      const hasMapPhotos = mapPhotosInCell.length > 0;
      const mapPhotosCount = mapPhotosInCell.length;

      cells.push({
        index: i,
        startDate,
        endDate,
        label,
        subLabel,
        isCurrent,
        isPast,
        isFuture,
        isOutOfBounds: false,
        progressPercent,
        photoCount,
        hasMapPhotos,
        mapPhotosCount,
        locations,
        eventsCount: photoCount,
      });
    } else {
      cells.push({
        index: i,
        startDate: focusDate,
        endDate: focusDate,
        label: '',
        subLabel: undefined,
        isCurrent: false,
        isPast: false,
        isFuture: false,
        isOutOfBounds: true,
        progressPercent: 0,
        photoCount: 0,
        hasMapPhotos: false,
        mapPhotosCount: 0,
        locations: [],
        eventsCount: 0,
      });
    }
  }

  return cells;
}

export function formatHeaderDateRange(focusDate: Date, zoomLevel: ZoomLevel, cells: CellInfo[]): string {
  const photoCells = cells.filter((c) => !c.isOutOfBounds && c.label !== '');
  if (photoCells.length === 0) return 'BRAK ZDJĘĆ';

  const first = photoCells[0].startDate;
  const last = photoCells[photoCells.length - 1].endDate;

  switch (zoomLevel) {
    case 'DECADES': {
      return `ZAKRES LAT: ${first.getFullYear()} — ${last.getFullYear()}`;
    }
    case 'YEARS': {
      return `ZAKRES LAT: ${first.getFullYear()} — ${last.getFullYear()}`;
    }
    case 'MONTHS': {
      return `ZAKRES MIESIĘCY: ${format(first, 'MMM yyyy', { locale: pl })} — ${format(last, 'MMM yyyy', { locale: pl })}`;
    }
    case 'TEN_DAYS': {
      return `ZAKRES DZIESIĄTEK DNI: ${format(first, 'd MMM yyyy', { locale: pl })} — ${format(last, 'd MMM yyyy', { locale: pl })}`;
    }
    case 'DAYS': {
      return `ZAKRES DNI: ${format(first, 'd MMM yyyy', { locale: pl })} — ${format(last, 'd MMM yyyy', { locale: pl })}`;
    }
    case 'HOURS': {
      return `ZAKRES PÓR DNIA: ${format(first, 'd MMM yyyy HH:00', { locale: pl })} — ${format(last, 'd MMM yyyy HH:00', { locale: pl })}`;
    }
  }
}

// Generate sample mock photos for selected cell to showcase future map correlation feature
export function getMockPhotosForCell(cell: CellInfo): PhotoEvent[] {
  if (!cell.photoCount || cell.photoCount === 0) return [];

  const photos: PhotoEvent[] = [];
  const sampleTitles = [
    'Spacer po starym mieście',
    'Zachód słońca nad rzeką',
    'Wyprawa górskim szlakiem',
    'Spotkanie przy kawie',
    'Panorama z punktu widokowego',
    'Architektura w świetle dnia',
    'Koncert plenerowy',
    'Zdjęcie przyrodnicze',
  ];

  const sampleImages = [
    'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80',
  ];

  const count = Math.min(cell.photoCount, 6);
  const loc = cell.locations?.[0] || 'Polska';

  for (let i = 0; i < count; i++) {
    const title = sampleTitles[i % sampleTitles.length];
    const img = sampleImages[i % sampleImages.length];
    photos.push({
      id: `photo-${cell.index}-${i}`,
      timestamp: new Date(cell.startDate.getTime() + i * 3600000),
      title: `${title} (${loc})`,
      locationName: loc,
      coordinates: { lat: 50.0647 + (i * 0.01), lng: 19.9450 + (i * 0.01) },
      imageUrl: img,
      category: i % 2 === 0 ? 'nature' : 'trip',
    });
  }

  return photos;
}

/**
 * Wyznacza optymalny poziom zoomu (ZoomLevel) i datę bazową (focusDate)
 * na podstawie zbioru zdjęć widocznych w kadrze mapy.
 *
 * Logika hierarchii:
 * - Przełom dziesięcioleci (np. 2019 i 2021) -> DECADES
 * - Ta sama dekada, ale różne lata (np. XI 2020 i II 2021) -> YEARS
 * - Ten sam rok, ale różne miesiące (np. V 2021 i VII 2021) -> MONTHS
 * - Ten sam miesiąc, ale różne tercje (1-10, 11-20, 21-koniec) lub > 10 dni -> TEN_DAYS
 * - Ten sam miesiąc i ta sama tercja, ale różne dni -> DAYS
 * - Ten sam dzień -> HOURS
 */
export function determineZoomAndFocusFromPhotos(
  photos: PhotoEvent[]
): { zoomLevel: ZoomLevel; focusDate: Date } | null {
  if (!photos || photos.length === 0) return null;

  if (photos.length === 1) {
    return {
      zoomLevel: 'HOURS',
      focusDate: photos[0].timestamp,
    };
  }

  let minTime = Infinity;
  let maxTime = -Infinity;
  let minDate = photos[0].timestamp;
  let maxDate = photos[0].timestamp;

  for (const p of photos) {
    const t = p.timestamp.getTime();
    if (t < minTime) {
      minTime = t;
      minDate = p.timestamp;
    }
    if (t > maxTime) {
      maxTime = t;
      maxDate = p.timestamp;
    }
  }

  const startDecadeYear = Math.floor(minDate.getFullYear() / 10) * 10;
  const endDecadeYear = Math.floor(maxDate.getFullYear() / 10) * 10;

  // 1. Różne dziesięciolecia (np. 11.10.2019 do 05.08.2021 -> dwa dziesięciolecia 2010s i 2020s)
  if (startDecadeYear !== endDecadeYear) {
    return {
      zoomLevel: 'DECADES',
      focusDate: minDate,
    };
  }

  // 2. Ta sama dekada, ale różne lata (np. XI 2020 do II 2021 -> dwa kafelki 2020 i 2021)
  if (minDate.getFullYear() !== maxDate.getFullYear()) {
    return {
      zoomLevel: 'YEARS',
      focusDate: minDate,
    };
  }

  // 3. Ten sam rok, ale różne miesiące -> MONTHS
  if (minDate.getMonth() !== maxDate.getMonth()) {
    return {
      zoomLevel: 'MONTHS',
      focusDate: minDate,
    };
  }

  // 4. Ten sam miesiąc, ale różne dni
  if (minDate.getDate() !== maxDate.getDate()) {
    const diffDays = Math.abs(maxDate.getDate() - minDate.getDate());
    const minThird = Math.min(2, Math.floor((minDate.getDate() - 1) / 10));
    const maxThird = Math.min(2, Math.floor((maxDate.getDate() - 1) / 10));

    if (minThird !== maxThird || diffDays > 10) {
      return {
        zoomLevel: 'TEN_DAYS',
        focusDate: minDate,
      };
    }

    return {
      zoomLevel: 'DAYS',
      focusDate: minDate,
    };
  }

  // 5. Ten sam dzień -> HOURS
  return {
    zoomLevel: 'HOURS',
    focusDate: minDate,
  };
}
