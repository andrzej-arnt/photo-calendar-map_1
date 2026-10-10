# ==============================================================================
# GEOPHOTO TRACKER - EKSPRESOWY TEST IMPORTU EXIF DO MSSQL
# (Pełna obsługa formatów: JPG, PNG, HEIC/HEIF iPhone, RAW + Wykluczenia)
# ==============================================================================

# 1. PARAMETRY POŁĄCZENIA, FOLDERÓW I WYKLUCZEŃ:
$SourceFolder    = "f:\Zdjęcia"
$Server          = "localhost"              # Np. "localhost" lub "localhost\SQLEXPRESS"
$Database        = "GeoPhotoTracker"
$ExcludedFolders = "XXX, YYY"               # Nazwy folderów do zignorowania (rozdzielone przecinkami)
$MaxGpsPhotos    = 0	                  # Limit zdjęć z GPS do testów (0 = brak limitu)

# 2. SPRAWDZENIE FOLDERU:
if (-not (Test-Path -LiteralPath $SourceFolder)) {
    Write-Host "[!] Folder nie został znaleziony: $SourceFolder" -ForegroundColor Red
    return
}

# 3. ZAŁADOWANIE BIBLIOTEK GRAFICZNYCH (.NET GDI+ ORAZ WIC DLA HEIC/RAW):
Add-Type -AssemblyName System.Drawing
try { Add-Type -AssemblyName PresentationCore, WindowsBase } catch {}

# HashSet dla błyskawicznej weryfikacji wykluczonych katalogów
$ExcludedSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase);
$ExcludedFolders -split "," | ForEach-Object {
    $name = $_.Trim();
    if ($name) { [void]$ExcludedSet.Add($name) }
}

# Rozszerzenia plików graficznych (w tym zdjęcia z iPhone: HEIC, HEIF, DNG)
$PhotoExtensions = @(
    ".jpg", ".jpeg", ".heic", ".heif", ".png", ".tif", ".tiff",
    ".bmp", ".dng", ".cr2", ".cr3", ".nef", ".arw", ".webp", ".avif"
)
$PhotoExtensionSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase);
foreach ($ext in $PhotoExtensions) { [void]$PhotoExtensionSet.Add($ext) }

# Funkcja konwersji koordynatów EXIF w System.Drawing (GDI+)
function Convert-ExifGpsCoord($rationalArray, $ref) {
    if (-not $rationalArray -or $rationalArray.Length -lt 6) { return $null };
    $deg = [BitConverter]::ToUInt32($rationalArray, 0) / [BitConverter]::ToUInt32($rationalArray, 4);
    $min = [BitConverter]::ToUInt32($rationalArray, 8) / [BitConverter]::ToUInt32($rationalArray, 12);
    $sec = [BitConverter]::ToUInt32($rationalArray, 16) / [BitConverter]::ToUInt32($rationalArray, 20);
    $decimal = $deg + ($min / 60.0) + ($sec / 3600.0);
    if ($ref -eq 'S' -or $ref -eq 'W') { $decimal = -$decimal };
    return [Math]::Round($decimal, 6)
}

# Funkcja odczytu GPS z metadanych WIC (dla plików HEIC / HEIF / DNG z iPhone)
function Get-WicPhotoMetadata($filePath) {
    try {
        $stream = [System.IO.File]::Open($filePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite);
        $decoder = [System.Windows.Media.Imaging.BitmapDecoder]::Create($stream, [System.Windows.Media.Imaging.BitmapCreateOptions]::None, [System.Windows.Media.Imaging.BitmapCacheOption]::OnDemand);
        $frame = $decoder.Frames[0];
        $metadata = $frame.Metadata -as [System.Windows.Media.Imaging.BitmapMetadata];
        
        if ($null -eq $metadata) {
            $stream.Close(); $stream.Dispose();
            return $null
        }

        $latQuery = $metadata.GetQuery("/app1/ifd/gps/{ushort=2}");
        $latRef   = $metadata.GetQuery("/app1/ifd/gps/{ushort=1}");
        $lngQuery = $metadata.GetQuery("/app1/ifd/gps/{ushort=4}");
        $lngRef   = $metadata.GetQuery("/app1/ifd/gps/{ushort=3}");

        $lat = $null;
        $lng = $null;

        if ($latQuery -and $lngQuery) {
            $lat = $latQuery[0] + ($latQuery[1] / 60.0) + ($latQuery[2] / 3600.0);
            if ($latRef -eq "S") { $lat = -$lat }

            $lng = $lngQuery[0] + ($lngQuery[1] / 60.0) + ($lngQuery[2] / 3600.0);
            if ($lngRef -eq "W") { $lng = -$lng }
        }

        $dateStr = $metadata.GetQuery("/app1/ifd/exif/{ushort=36867}");
        $photoDate = $null;
        if ($dateStr) {
            [DateTime]::TryParseExact($dateStr, "yyyy:MM:dd HH:mm:ss", [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::None, [ref]$photoDate) | Out-Null
        }

        $cameraModel = $metadata.GetQuery("/app1/ifd/{ushort=272}");

        $stream.Close();
        $stream.Dispose();

        if ($lat -and $lng) {
            return @{
                Latitude       = [Math]::Round([decimal]$lat, 6)
                Longitude      = [Math]::Round([decimal]$lng, 6)
                PhotoTimestamp = $photoDate
                CameraModel    = [string]$cameraModel
            }
        }
    }
    catch {
        if ($null -ne $stream) { $stream.Close(); $stream.Dispose() }
    }
    return $null
}

# 4. STRUKTURA DANYCH W PAMIĘCI:
$dataTable = New-Object System.Data.DataTable "PhotosBatch";
$dataTable.Columns.Add("FilePath", [string]) | Out-Null;
$dataTable.Columns.Add("FileName", [string]) | Out-Null;
$dataTable.Columns.Add("ThumbnailPath", [string]) | Out-Null;
$dataTable.Columns.Add("PhotoTimestamp", [DateTime]) | Out-Null;
$dataTable.Columns.Add("Latitude", [decimal]) | Out-Null;
$dataTable.Columns.Add("Longitude", [decimal]) | Out-Null;
$dataTable.Columns.Add("CameraModel", [string]) | Out-Null;
$dataTable.Columns.Add("FileSize", [int64]) | Out-Null;
$dataTable.Columns.Add("Title", [string]) | Out-Null;

# 5. SKANOWANIE I FILTROWANIE PLIKÓW:
Write-Host "Szukanie zdjęć w: $SourceFolder..." -ForegroundColor Yellow;
if ($ExcludedSet.Count -gt 0) {
    Write-Host "Wykluczone foldery: $ExcludedFolders" -ForegroundColor DarkGray;
}

$allFiles = Get-ChildItem -LiteralPath $SourceFolder -Recurse -File;
$files = [System.Collections.Generic.List[System.IO.FileInfo]]::new();

foreach ($file in $allFiles) {
    if (-not $PhotoExtensionSet.Contains($file.Extension)) { continue }

    $relativePath = $file.DirectoryName.Substring($SourceFolder.Length).TrimStart("\");
    $pathParts = $relativePath -split "\\";
    $isExcluded = $false;
    foreach ($part in $pathParts) {
        if ($ExcludedSet.Contains($part)) {
            $isExcluded = $true;
            break
        }
    }

    if (-not $isExcluded) {
        $files.Add($file)

        # DODANA LINIA: Ograniczenie listy plików do testu (np. 100 sztuk)
        if ($MaxFilesToScan -gt 0 -and $files.Count -ge $MaxFilesToScan) { break }
    }
}

$totalFiles = $files.Count;
Write-Host "Znaleziono $totalFiles pasujących plików do przetworzenia. Odczytywanie tagów EXIF..." -ForegroundColor Cyan;

$processed = 0;
$savedWithGps = 0;
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew();

foreach ($file in $files) {
    $processed++;

    # Wyliczenia postępu i prędkości
    $percent = [Math]::Round(($processed / $totalFiles) * 100, 1);
    $elapsedSec = [Math]::Max($stopwatch.Elapsed.TotalSeconds, 0.001);
    $speed = [Math]::Round($processed / $elapsedSec, 1);
    $remainingSec = if ($speed -gt 0) { [Math]::Round(($totalFiles - $processed) / $speed) } else { 0 };
    $etaFormatted = [TimeSpan]::FromSeconds($remainingSec).ToString("mm\:ss");

    # 1. Czysty pasek postępu PowerShell u góry (bez \vert{} i \%)
    Write-Progress -Activity "Skanowanie metadanych EXIF do bazy MSSQL" `
        -Status "Przetworzono: $processed z $totalFiles ($percent\%) \vert{} Z GPS:$savedWithGps | Prędkość: $speed plik/s \vert{} ETA:$etaFormatted" `
        -PercentComplete $percent `
        -SecondsRemaining $remainingSec `
        -CurrentOperation "$($file.Name)"

    # 2. Skracanie dłuższego adresu pliku do podglądu w konsoli
    $displayPath = $file.FullName;
    if ($displayPath.Length -gt 60) {
        $displayPath = "..." + $displayPath.Substring($displayPath.Length - 57);
    }

    # 3. Podgląd wiersza w konsoli
    $statusLine = "`r[Postęp: $processed/$totalFiles ($percent%) | GPS: $savedWithGps]$displayPath";
    Write-Host $statusLine.PadRight(110) -NoNewline -ForegroundColor Cyan;

    $lat =$null;
    $lng =$null;
    $photoDate =$file.LastWriteTime;
    $camModel = "";
    $gotGps =$false;

    # --- PRÓBA 1: System.Drawing (Szybka dla standardowych JPG/PNG/TIF) ---
    try {
        $img = [System.Drawing.Image]::FromFile($file.FullName);
        
        $dateProp = $null;
        foreach ($prop in $img.PropertyItems) {
            if ($prop.Id -eq 0x9003 -or ($prop.Id -eq 0x0132 -and -not $dateProp)) {
                $dateProp = [System.Text.Encoding]::ASCII.GetString($prop.Value).Trim([char]0);
            }
        }
        if ($dateProp -and $dateProp -match '^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})') {
            $photoDate = [DateTime]::ParseExact($dateProp, "yyyy:MM:dd HH:mm:ss", [System.Globalization.CultureInfo]::InvariantCulture);
        }

        $latProp    = $img.PropertyItems | Where-Object { $_.Id -eq 0x0002 };
        $latRefProp = $img.PropertyItems | Where-Object { $_.Id -eq 0x0001 };
        $lngProp    = $img.PropertyItems | Where-Object { $_.Id -eq 0x0004 };
        $lngRefProp = $img.PropertyItems | Where-Object { $_.Id -eq 0x0003 };

        if ($latProp -and $lngProp) {
            $latRef = if ($latRefProp) { [char]$latRefProp.Value[0] } else { 'N' };
            $lngRef = if ($lngRefProp) { [char]$lngRefProp.Value[0] } else { 'E' };
            $lat = Convert-ExifGpsCoord $latProp.Value $latRef;
            $lng = Convert-ExifGpsCoord $lngProp.Value $lngRef;

            if ($lat -and $lng) {
                $camProp = $img.PropertyItems | Where-Object { $_.Id -eq 0x0110 };
                $camModel = if ($camProp) { [System.Text.Encoding]::ASCII.GetString($camProp.Value).Trim([char]0) } else { "" };
                $gotGps = $true;
            }
        }
        $img.Dispose();
    }
    catch {
        # Przejście do WIC
    }

    # --- PRÓBA 2: WIC (Windows Imaging Component dla HEIC / HEIF / DNG z iPhone) ---
    if (-not $gotGps) {
        $wicData = Get-WicPhotoMetadata $file.FullName;
        if ($wicData) {
            $lat = $wicData.Latitude;
            $lng = $wicData.Longitude;
            if ($wicData.PhotoTimestamp) { $photoDate = $wicData.PhotoTimestamp }
            if ($wicData.CameraModel)    { $camModel  = $wicData.CameraModel }
            $gotGps = $true;
        }
    }

# ==============================================================================
# 3. TUTAJ WSTAWIASZ DODATEK (Weryfikacja duplikatów)
# ==============================================================================
    # Tworzymy unikalny klucz: Data z EXIF + Dokładny rozmiar pliku w bajtach
    $exifTimeStamp = $photoDate.ToString("yyyyMMdd_HHmmss");
    $photoKey = "${exifTimeStamp}_$($file.Length)";

    # Jeśli klucz już istnieje w pamięci, pomijamy ten plik i przechodzimy do następnego
    if ($seenPhotosSet.Contains($photoKey)) {
        $skippedDuplicates++;
        continue;
    }
    [void]$seenPhotosSet.Add($photoKey);

# ZAPIS DO TABELI W PAMIĘCI
    if ($gotGps -and $lat -and $lng) {
        $row = $dataTable.NewRow();
        $row["FilePath"]       = $file.FullName;
        $row["FileName"]       = $file.Name;
        $row["ThumbnailPath"]  = [System.DBNull]::Value;
        $row["PhotoTimestamp"] = $photoDate;
        $row["Latitude"]       = $lat;
        $row["Longitude"]      = $lng;
        $row["CameraModel"]    = $camModel;
        $row["FileSize"]       = $file.Length;
        $row["Title"]          = [System.IO.Path]::GetFileNameWithoutExtension($file.Name);
        $dataTable.Rows.Add($row);
        $savedWithGps++;

        # WARUNEK ZATRZYMANIA: Przerywa pętlę natychmiast po znalezieniu 100 zdjęć z GPS
        if ($MaxGpsPhotos -gt 0 -and $savedWithGps -ge $MaxGpsPhotos) {
            Write-Host "`n[!] Osiągnięto limit $MaxGpsPhotos zdjęć z GPS. Przerywam dalsze skanowanie." -ForegroundColor Yellow;
            break;
        }
    }
}

# Zamknięcie paska postępu
Write-Progress -Activity "Skanowanie metadanych EXIF do bazy MSSQL" -Completed;
$stopwatch.Stop();
Write-Host "";

# 6. MASOWY ZAPIS DO MSSQL (SqlBulkCopy):
$connStr = "Server=$Server;Database=$Database;Integrated Security=True;TrustServerCertificate=True;";

if ($dataTable.Rows.Count -gt 0) {
    Write-Host "Zapisywanie $savedWithGps zdjęć z GPS do bazy MSSQL..." -ForegroundColor Cyan;
    $bulk = New-Object System.Data.SqlClient.SqlBulkCopy($connStr);
    $bulk.DestinationTableName = "dbo.Photos";
    $dataTable.Columns | ForEach-Object { $bulk.ColumnMappings.Add($_.ColumnName, $_.ColumnName) | Out-Null };
    $bulk.WriteToServer($dataTable);
    $bulk.Close();

    # 7. GENEROWANIE PUNKTÓW GEOGRAPHY DO BŁYSKAWICZNEJ MAPY:
    Write-Host "Aktualizowanie punktów GEOGRAPHY w SQL..." -ForegroundColor Yellow;
    $conn = New-Object System.Data.SqlClient.SqlConnection($connStr);
    $conn.Open();
    $cmd = $conn.CreateCommand();
    $cmd.CommandText = "UPDATE dbo.Photos SET GeoLocation = geography::Point(Latitude, Longitude, 4326) WHERE GeoLocation IS NULL;";
    $cmd.ExecuteNonQuery() | Out-Null;
    $conn.Close();

    $totalSeconds = [Math]::Max($stopwatch.Elapsed.TotalSeconds, 0.01);
    $avgSpeed = [Math]::Round($processed / $totalSeconds, 1);
    $timeFormatted = $stopwatch.Elapsed.ToString("mm\:ss\.fff");

    Write-Host "==========================================================" -ForegroundColor Green;
    Write-Host " SUKCES! Zapisano $($dataTable.Rows.Count) zdjęć do bazy $Database" -ForegroundColor Green;
    Write-Host " Przetworzono plików:          $processed" -ForegroundColor White;
    Write-Host " Zapisano z tagami GPS:        $savedWithGps" -ForegroundColor White;
    Write-Host " Pominięto (brak GPS w EXIF):  $($processed - $savedWithGps)" -ForegroundColor Gray;
    Write-Host " Całkowity czas skanowania:    $timeFormatted ($avgSpeed plików/sek)" -ForegroundColor Cyan;
    Write-Host " Status kolumny ThumbnailPath: Zarezerwowana (NULL)" -ForegroundColor Yellow;
    Write-Host "==========================================================" -ForegroundColor Green;
} else {
    Write-Host "[!] Przetworzono $processed plików, ale żaden nie zawierał współrzędnych GPS w EXIF." -ForegroundColor Yellow;
}