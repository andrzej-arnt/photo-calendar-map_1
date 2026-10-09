import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import sql from 'mssql';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// MSSQL connection configuration
interface SqlConfig {
  server: string;
  database: string;
  user?: string;
  password?: string;
  port: number;
}

const CACHE_FILE = path.resolve('synced_photos_cache.json');
let syncedPhotosCache: any[] = [];

// Try to load cached synced photos on startup
try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    syncedPhotosCache = JSON.parse(raw);
    console.log(`[Cache] Załadowano ${syncedPhotosCache.length} zsynchronizowanych zdjęć z pamięci podręcznej.`);
  }
} catch (e) {
  console.log('[Cache] Brak wcześniejszego pliku pamięci podręcznej lub błąd odczytu');
}

// Wykrywanie środowiska chmurowego (Cloud Sandbox AI Studio)
const isCloudSandbox = Boolean(
  process.env.APP_URL?.includes('run.app') ||
  process.env.APP_URL?.includes('ai.studio') ||
  process.env.K_SERVICE ||
  process.env.GOOGLE_CLOUD_PROJECT
);

function isLocalHost(server: string): boolean {
  if (!server) return true;
  const s = server.toLowerCase().trim();
  return (
    s === 'localhost' ||
    s === '127.0.0.1' ||
    s === '::1' ||
    s.endsWith('.local') ||
    s.endsWith('.lan') ||
    !s.includes('.') // np. 'aat-ntb' bez sufiksu domeny internetowej
  );
}

let activeSqlConfig: SqlConfig = {
  server: process.env.MSSQL_SERVER || 'localhost',
  database: process.env.MSSQL_DATABASE || 'GeoPhotoTracker',
  user: process.env.MSSQL_USER || '',
  password: process.env.MSSQL_PASSWORD || '',
  port: Number(process.env.MSSQL_PORT) || 1433,
};

let pool: sql.ConnectionPool | null = null;
let lastConnectionAttempt = 0;
let lastConnectionError: string | null = null;

async function getSqlPool(forceTest = false): Promise<sql.ConnectionPool | null> {
  if (pool && pool.connected) {
    return pool;
  }

  // W kontenerze chmurowym nazwy komputerów lokalnych (np. AAT-NTB, localhost) nie mają tras routingu ani wpisów DNS.
  // Zamiast generować błędy getaddrinfo i opóźnienia, bezpiecznie informujemy o trybie chmury.
  if (isCloudSandbox && isLocalHost(activeSqlConfig.server) && !forceTest) {
    lastConnectionError = `W środowisku chmury nazwa lokalna komputera '${activeSqlConfig.server}' nie jest bezpośrednio osiągalna z zewnątrz.`;
    return null;
  }

  // Ochrona przed zbyt częstymi próbami połączenia po błędzie (30 sekund)
  const now = Date.now();
  if (lastConnectionError && !forceTest && now - lastConnectionAttempt < 30000) {
    return null;
  }

  lastConnectionAttempt = now;

  const config: sql.config = {
    server: activeSqlConfig.server,
    database: activeSqlConfig.database,
    port: activeSqlConfig.port,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      connectTimeout: 4000,
      requestTimeout: 8000,
    },
  };

  if (activeSqlConfig.user && activeSqlConfig.password) {
    config.user = activeSqlConfig.user;
    config.password = activeSqlConfig.password;
  }

  try {
    if (pool) {
      try {
        await pool.close();
      } catch {
        // Ignoruj
      }
    }
    pool = await new sql.ConnectionPool(config).connect();
    lastConnectionError = null;
    console.log(`[MSSQL] Połączono z bazą: ${activeSqlConfig.server}/${activeSqlConfig.database}`);
    return pool;
  } catch (err: any) {
    lastConnectionError = err?.message || 'Nie można nawiązać połączenia z serwerem MSSQL';
    console.log(`[MSSQL] Połączenie z ${activeSqlConfig.server}:${activeSqlConfig.port} niedostępne (${lastConnectionError})`);
    if (forceTest) {
      throw err;
    }
    return null;
  }
}

// ==========================================
// API ROUTES
// ==========================================

// 1. Sprawdzenie statusu MSSQL i pobranie statystyk bazy
app.get('/api/mssql/status', async (_req: Request, res: Response) => {
  let isConnected = false;
  let stats: any = {};

  try {
    const activePool = await getSqlPool(false);
    if (activePool && activePool.connected) {
      const result = await activePool.request().query(`
        SELECT 
          COUNT(*) AS totalPhotos,
          MIN(PhotoTimestamp) AS minDate,
          MAX(PhotoTimestamp) AS maxDate,
          COUNT(CASE WHEN ThumbnailPath IS NOT NULL THEN 1 END) AS photosWithThumbnail
        FROM dbo.Photos;
      `);

      stats = result.recordset[0] || {};
      isConnected = true;
    }
  } catch {
    isConnected = false;
  }

  if (isConnected) {
    res.json({
      connected: true,
      mode: 'direct_mssql',
      server: activeSqlConfig.server,
      database: activeSqlConfig.database,
      totalPhotos: stats.totalPhotos || 0,
      minDate: stats.minDate || null,
      maxDate: stats.maxDate || null,
      photosWithThumbnail: stats.photosWithThumbnail || 0,
      syncedPhotosCount: syncedPhotosCache.length,
    });
    return;
  }

  // Not directly connected to MSSQL (e.g. running in Cloud Sandbox)
  const hasSynced = syncedPhotosCache.length > 0;
  let minDate = null;
  let maxDate = null;
  if (hasSynced) {
    const timestamps = syncedPhotosCache
      .map((p) => new Date(p.timestamp || p.PhotoTimestamp).getTime())
      .filter((t) => !isNaN(t));
    if (timestamps.length > 0) {
      minDate = new Date(Math.min(...timestamps)).toISOString();
      maxDate = new Date(Math.max(...timestamps)).toISOString();
    }
  }

  const inCloud = isCloudSandbox && isLocalHost(activeSqlConfig.server);

  res.json({
    connected: false,
    mode: hasSynced ? 'synced_cache' : (inCloud ? 'cloud_sandbox' : 'disconnected'),
    server: activeSqlConfig.server,
    database: activeSqlConfig.database,
    totalPhotos: hasSynced ? syncedPhotosCache.length : 0,
    syncedPhotosCount: syncedPhotosCache.length,
    minDate,
    maxDate,
    isCloudSandbox,
    error: inCloud
      ? `Tryb chmury (Cloud Sandbox): Serwer bazy '${activeSqlConfig.server}' znajduje się na Twoim komputerze lokalnym. Połączenie bezpośrednie aktywuje się po uruchomieniu aplikacji na Twoim komputerze (npm run dev). W chmurze możesz wgrać dane przez JSON/PowerShell.`
      : (lastConnectionError || `Brak bezpośredniego połączenia z ${activeSqlConfig.server}:${activeSqlConfig.port}`),
    hint: inCloud
      ? 'Aplikacja uruchomiona lokalnie na Twoim komputerze (localhost:3000) łączy się z bazą bezpośrednio. W oknie podglądu możesz użyć importu JSON lub skryptu PowerShell.'
      : 'Upewnij się, że usługa SQL Server działa na Twoim komputerze i port 1433 jest otwarty.',
  });
});

// 2. Synchronizacja / Import zdjęć z JSON (z SSMS lub PowerShell)
app.post('/api/photos/sync', (req: Request, res: Response) => {
  try {
    let incoming = req.body;
    if (incoming && incoming.photos && Array.isArray(incoming.photos)) {
      incoming = incoming.photos;
    } else if (typeof incoming === 'string') {
      try {
        incoming = JSON.parse(incoming);
      } catch {
        res.status(400).json({ error: 'Niepoprawny format JSON' });
        return;
      }
    }

    if (!Array.isArray(incoming)) {
      res.status(400).json({ error: 'Oczekiwano tablicy obiektów ze zdjęciami' });
      return;
    }

    const normalized = incoming
      .map((p: any, idx: number) => {
        const rawDate = p.PhotoTimestamp || p.timestamp || p.Date || new Date().toISOString();
        const lat = Number(p.Latitude !== undefined ? p.Latitude : p.lat);
        const lng = Number(p.Longitude !== undefined ? p.Longitude : p.lng);
        return {
          id: String(p.Id || p.id || idx + 1),
          timestamp: new Date(rawDate).toISOString(),
          lat: isNaN(lat) ? 0 : lat,
          lng: isNaN(lng) ? 0 : lng,
          title: p.Title || p.title || p.FileName || p.fileName || `Zdjęcie #${p.Id || idx + 1}`,
          locationName: p.LocationName || p.locationName || 'Lokalna kolekcja',
          imageUrl: `/api/image?id=${p.Id || p.id || idx + 1}`,
          cameraModel: p.CameraModel || p.cameraModel || undefined,
          fileSize: p.FileSize || p.fileSize || undefined,
          filePath: p.FilePath || p.filePath || undefined,
          thumbnailPath: p.ThumbnailPath || p.thumbnailPath || undefined,
        };
      })
      .filter((p: any) => !isNaN(p.lat) && !isNaN(p.lng) && (p.lat !== 0 || p.lng !== 0));

    if (normalized.length === 0) {
      res.status(400).json({ error: 'Przesłane dane nie zawierają poprawnych współrzędnych GPS (Latitude/Longitude).' });
      return;
    }

    syncedPhotosCache = normalized;

    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(normalized, null, 2), 'utf-8');
    } catch (saveErr) {
      console.warn('[Cache] Nie udało się zapisać pliku cache:', saveErr);
    }

    console.log(`[Sync] Pomyślnie zaimportowano ${normalized.length} zdjęć.`);
    res.json({
      success: true,
      count: normalized.length,
      message: `Pomyślnie zaimportowano ${normalized.length} zdjęć!`,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Błąd przetwarzania danych: ${err?.message}` });
  }
});

// Wyczyść zsynchronizowane dane
app.post('/api/photos/clear-sync', (_req: Request, res: Response) => {
  syncedPhotosCache = [];
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
    }
  } catch {
    // Ignoruj błąd kasowania
  }
  res.json({ success: true, message: 'Wyczyszczono pamięć podręczną zdjęć.' });
});

// 3. Konfiguracja parametrów połączenia MSSQL
app.post('/api/mssql/configure', async (req: Request, res: Response) => {
  const { server, database, user, password, port } = req.body;
  if (server) activeSqlConfig.server = String(server);
  if (database) activeSqlConfig.database = String(database);
  if (user !== undefined) activeSqlConfig.user = String(user);
  if (password !== undefined) activeSqlConfig.password = String(password);
  if (port) activeSqlConfig.port = Number(port);

  // Zresetuj bieżącą pulę, aby wymusić ponowne połączenie
  if (pool) {
    try {
      await pool.close();
    } catch {
      // Ignoruj błąd zamykania
    }
    pool = null;
  }
  lastConnectionError = null;

  try {
    const newPool = await getSqlPool(true);
    if (newPool && newPool.connected) {
      res.json({ success: true, message: 'Połączono pomyślnie z MSSQL!' });
    } else {
      res.status(400).json({ success: false, error: lastConnectionError || 'Nie udało się nawiązać połączenia' });
    }
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'Nie udało się połączyć z podanymi danymi' });
  }
});

// 4. Pobranie zdjęć w oknie czasowym (dla Kalendarza 5x5 i Mapy)
app.get('/api/photos', async (req: Request, res: Response) => {
  const { startTime, endTime, minLat, maxLat, minLng, maxLng, limit } = req.query;

  // 1. Najpierw próba pobrania bezpośrednio z MSSQL (jeśli połączono)
  try {
    const activePool = await getSqlPool(false);
    if (activePool && activePool.connected) {
      const request = activePool.request();

      let query = `
        SELECT TOP (@limit)
          Id,
          FilePath,
          FileName,
          ThumbnailPath,
          PhotoTimestamp,
          Latitude,
          Longitude,
          CameraModel,
          FileSize,
          Title,
          LocationName
        FROM dbo.Photos
        WHERE 1=1
      `;

      const maxLimit = Math.min(Number(limit) || 50000, 2000000);
      request.input('limit', sql.Int, maxLimit);

      if (startTime) {
        request.input('startTime', sql.DateTime2, new Date(String(startTime)));
        query += ` AND PhotoTimestamp >= @startTime`;
      }

      if (endTime) {
        request.input('endTime', sql.DateTime2, new Date(String(endTime)));
        query += ` AND PhotoTimestamp <= @endTime`;
      }

      if (minLat && maxLat) {
        request.input('minLat', sql.Decimal(9, 6), Number(minLat));
        request.input('maxLat', sql.Decimal(9, 6), Number(maxLat));
        query += ` AND Latitude BETWEEN @minLat AND @maxLat`;
      }

      if (minLng && maxLng) {
        request.input('minLng', sql.Decimal(9, 6), Number(minLng));
        request.input('maxLng', sql.Decimal(9, 6), Number(maxLng));
        query += ` AND Longitude BETWEEN @minLng AND @maxLng`;
      }

      query += ` ORDER BY PhotoTimestamp ASC;`;

      const result = await request.query(query);

      const photos = result.recordset.map((row) => ({
        id: String(row.Id),
        timestamp: new Date(row.PhotoTimestamp).toISOString(),
        lat: Number(row.Latitude),
        lng: Number(row.Longitude),
        title: row.Title || row.FileName || `Zdjęcie #${row.Id}`,
        locationName: row.LocationName || 'Lokalna kolekcja',
        imageUrl: `/api/image?id=${row.Id}`,
        cameraModel: row.CameraModel || undefined,
        fileSize: row.FileSize || undefined,
        filePath: row.FilePath,
        thumbnailPath: row.ThumbnailPath || undefined,
      }));

      res.json({
        source: 'mssql',
        count: photos.length,
        photos,
      });
      return;
    }
  } catch {
    // MSSQL bezpośrednio niedostępny - przejdź do cache
  }

  // 2. Obsługa danych ze zsynchronizowanego cache
  if (syncedPhotosCache.length > 0) {
    let filtered = [...syncedPhotosCache];

    if (startTime) {
      const s = new Date(String(startTime)).getTime();
      filtered = filtered.filter((p) => new Date(p.timestamp).getTime() >= s);
    }
    if (endTime) {
      const e = new Date(String(endTime)).getTime();
      filtered = filtered.filter((p) => new Date(p.timestamp).getTime() <= e);
    }
    if (minLat && maxLat) {
      const minL = Number(minLat);
      const maxL = Number(maxLat);
      filtered = filtered.filter((p) => p.lat >= minL && p.lat <= maxL);
    }
    if (minLng && maxLng) {
      const minLn = Number(minLng);
      const maxLn = Number(maxLng);
      filtered = filtered.filter((p) => p.lng >= minLn && p.lng <= maxLn);
    }

    const maxLimit = Math.min(Number(limit) || 50000, 200000);
    const sliced = filtered.slice(0, maxLimit);

    res.json({
      source: 'synced_cache',
      count: sliced.length,
      photos: sliced,
    });
    return;
  }

  res.json({
    source: 'none',
    count: 0,
    photos: [],
  });
});

// 5. Serwowanie pliku zdjęcia z dysku lokalnego (dla popupu i znaczników)
app.get('/api/image', async (req: Request, res: Response) => {
  const { id, path: customPath } = req.query;

  try {
    let targetFilePath = '';

    if (id) {
      // Sprawdź czy MSSQL jest aktywny
      try {
        const activePool = await getSqlPool(false);
        if (activePool && activePool.connected) {
          const result = await activePool
            .request()
            .input('id', sql.BigInt, Number(id))
            .query(`SELECT FilePath, ThumbnailPath FROM dbo.Photos WHERE Id = @id`);

          if (result.recordset.length > 0) {
            const row = result.recordset[0];
            targetFilePath = row.ThumbnailPath && fs.existsSync(row.ThumbnailPath)
              ? row.ThumbnailPath
              : row.FilePath;
          }
        }
      } catch {
        // Fallback do synced cache
        const cached = syncedPhotosCache.find((p) => String(p.id) === String(id));
        if (cached) {
          targetFilePath = cached.thumbnailPath || cached.filePath || '';
        }
      }
    } else if (customPath) {
      targetFilePath = String(customPath);
    }

    if (!targetFilePath || !fs.existsSync(targetFilePath)) {
      const filename = targetFilePath ? path.basename(targetFilePath) : `Zdjęcie #${id || ''}`;
      // Estetyczny SVG placeholder dla chmury (z informacją o ścieżce na dysku C:)
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(`
        <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="#0b0d14">
          <rect width="600" height="400" fill="#131722"/>
          <circle cx="300" cy="160" r="45" fill="#1e2436"/>
          <path d="M280 150 L300 130 L320 150 M300 130 L300 185" stroke="#3b82f6" stroke-width="4" stroke-linecap="round"/>
          <circle cx="300" cy="160" r="3" fill="#60a5fa"/>
          <text x="300" y="240" fill="#f1f5f9" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="16" text-anchor="middle">${filename}</text>
          <text x="300" y="270" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="12" text-anchor="middle">Plik na dysku użytkownika: ${targetFilePath.replace(/\\/g, '\\\\') || 'Lokalny dysk'}</text>
          <text x="300" y="295" fill="#38bdf8" font-family="system-ui, -apple-system, sans-serif" font-size="11" text-anchor="middle">Metadane EXIF i GPS wczytane z bazy SQL</text>
        </svg>
      `);
      return;
    }

    res.sendFile(path.resolve(targetFilePath));
  } catch (err: any) {
    res.status(500).send(`Błąd serwowania obrazu: ${err?.message}`);
  }
});

// ==========================================
// VITE / STATIC CLIENT INTEGRATION
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve('dist'))) {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GeoPhoto Tracker] Serwer uruchomiony na porcie ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[GeoPhoto Tracker] Błąd uruchomienia serwera:', err);
});
