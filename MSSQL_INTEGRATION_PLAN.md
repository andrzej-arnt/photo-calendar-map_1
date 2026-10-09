# Plan Integracji: 100 000 Zdjęć Lokalnych z Microsoft SQL Server (MSSQL)

Dokument stanowi kompletny plan techniczny, architekturę oraz zbiór gotowych skryptów (SQL + PowerShell) do zasilenia aplikacji **GeoPhoto Tracker 5×5** realnymi zdjęciami z dysku lokalnego (100 000+ plików) z zachowaniem pełnej płynności (60 FPS).

> **Uwaga dot. aktualizacji (Etap 1):**  
> Zgodnie z ustaleniami **odpuszczamy generowanie plików miniatur** na wstępnym etapie. Skupiamy się na błyskawicznym wyciągnięciu metadanych EXIF (współrzędne GPS, data wykonania, model aparatu) i masowym zapisie do MSSQL.  
> **W strukturze bazy SQL pozostawiono dedykowaną kolumnę `ThumbnailPath`**, dzięki czemu w przyszłości będzie można bez żadnych zmian w schemacie tabeli dogenerować miniatury i zaktualizować ścieżki.

---

## 1. Założenia Architektoniczne

* **Wolumen:** ~100 000 zdjęć z aparatu/smartfona (ok. 300–800 GB na dysku).
* **Strategia dwufazowa:**
  1. **Faza 1 (Aktualna): Błyskawiczny indeks EXIF do MSSQL**  
     Brak konieczności renderowania i skalowania 100 000 grafik na dysku. Skaner czyta tylko nagłówki EXIF (parę kilobajtów z każdego pliku) i masowo wrzuca dane do bazy. Czas skanowania 100k plików skraca się z kilku godzin do zaledwie **1–3 minut**!
  2. **Faza 2 (Przyszła / Opcjonalna): Uzupełnienie miniatur**  
     Struktura bazy MSSQL ma już przygotowaną kolumnę `ThumbnailPath NULL`. W dowolnym momencie będzie można uruchomić osobny proces generujący miniatury (np. w tle lub tylko dla przeglądanych zakresów) i zaktualizować bazę prostym `UPDATE`.
* **Rola MSSQL:** Przechowuje wyłącznie metadane tekstowo-liczbowe (~25–35 MB dla 100 000 wpisów). Zapytania o przedziały z kalendarza 5×5 wykonują się w **1–3 ms**.

---

## 2. Struktura Bazy Danych MSSQL (DDL)

Poniższy skrypt SQL tworzy dedykowaną bazę, tabelę oraz kluczowe indeksy (w tym indeks przestrzenny `SPATIAL INDEX` do błyskawicznego filtrowania kadru mapy).

```sql
-- 1. Tworzenie bazy danych
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'GeoPhotoTracker')
BEGIN
    CREATE DATABASE GeoPhotoTracker;
END
GO

USE GeoPhotoTracker;
GO

-- 2. Tabela ze zdjęciami i metadanymi EXIF
IF OBJECT_ID('dbo.Photos', 'U') IS NOT NULL
    DROP TABLE dbo.Photos;
GO

CREATE TABLE dbo.Photos (
    Id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED,
    FilePath NVARCHAR(500) NOT NULL,               -- Pełna ścieżka do oryginału: 'D:\Zdjecia\2024\DSC_0001.JPG'
    FileName NVARCHAR(255) NOT NULL,               -- Nazwa pliku: 'DSC_0001.JPG'
    ThumbnailPath NVARCHAR(500) NULL,              -- [ZAREZERWOWANE NA PRZYSZŁOŚĆ] Ścieżka do miniatury (na razie NULL)
    PhotoTimestamp DATETIME2(0) NOT NULL,          -- Data i czas z EXIF (DateTimeOriginal)
    Latitude DECIMAL(9, 6) NOT NULL,               -- Szerokość geograficzna GPS, np. 49.296500
    Longitude DECIMAL(9, 6) NOT NULL,              -- Długość geograficzna GPS, np. 19.953000
    GeoLocation GEOGRAPHY NULL,                    -- Typ przestrzenny: geography::Point(Lat, Lng, 4326)
    CameraModel NVARCHAR(150) NULL,                -- Model aparatu (np. 'NIKON Z6', 'iPhone 15 Pro')
    FileSize BIGINT NULL,                          -- Rozmiar pliku w bajtach
    Title NVARCHAR(250) NULL,                      -- Opcjonalny tytuł / etykieta (np. nazwa pliku bez rozszerzenia)
    LocationName NVARCHAR(250) NULL,               -- Opcjonalna nazwa miejscowości / szlaku
    ImportDate DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- 3. Kluczowe indeksy dla kalendarza 5x5 i mapy
-- Indeks czasowy (dla matrycy 5x5: wyszukiwanie zakresu w czasie O(log N))
CREATE NONCLUSTERED INDEX IX_Photos_Timestamp 
ON dbo.Photos(PhotoTimestamp)
INCLUDE (Latitude, Longitude, ThumbnailPath, FilePath, Title, LocationName);
GO

-- Indeks przestrzenny (dla kadru mapy: Bounding Box STIntersects)
CREATE SPATIAL INDEX SIX_Photos_GeoLocation 
ON dbo.Photos(GeoLocation)
USING GEOGRAPHY_GRID;
GO

-- 4. Przykładowa procedura dla zapytania z kalendarza 5x5 (zwraca zdjęcia w 1-2 ms):
CREATE OR ALTER PROCEDURE dbo.usp_GetPhotosForTimeWindow
    @StartTime DATETIME2(0),
    @EndTime DATETIME2(0),
    @MinLat DECIMAL(9,6) = NULL,
    @MaxLat DECIMAL(9,6) = NULL,
    @MinLng DECIMAL(9,6) = NULL,
    @MaxLng DECIMAL(9,6) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        Id,
        FilePath,
        ThumbnailPath,   -- Może być NULL (wówczas aplikacja odwołuje się bezpośrednio do FilePath)
        PhotoTimestamp,
        Latitude,
        Longitude,
        Title,
        LocationName,
        CameraModel
    FROM dbo.Photos WITH (INDEX(IX_Photos_Timestamp))
    WHERE PhotoTimestamp >= @StartTime 
      AND PhotoTimestamp <= @EndTime
      AND (@MinLat IS NULL OR (Latitude BETWEEN @MinLat AND @MaxLat AND Longitude BETWEEN @MinLng AND @MaxLng))
    ORDER BY PhotoTimestamp ASC;
END
GO
```

---

## 3. Zoptymalizowany Skrypt PowerShell (`Scan-PhotosToMssql.ps1`)

Dzięki **odpuszczeniu generowania miniatur**:
* Skrypt nie musi przetwarzać pamięciożernych bitmap ani zapisywać tysięcy plików `.webp`/`.jpg` na dysku.
* Działa **ekspresowo** – odczytuje jedynie kilkaset bajtów nagłówków EXIF z każdego pliku.
* Kolumnę `ThumbnailPath` zasila wartością `$null` (lub pustą), zachowując pełną zgodność ze schematem bazy MSSQL.
* Zastosowano **`SqlBulkCopy`**, co daje przepustowość rzędu 5000–10000 rekordów na sekundę.

```powershell
<#
.SYNOPSIS
    Ekspresowy skaner metadanych EXIF do bazy Microsoft SQL Server (bez generowania miniatur).
.DESCRIPTION
    Przeszukuje podany katalog, odczytuje tagi GPS, datę i model aparatu,
    pozostawia kolumnę ThumbnailPath jako NULL (do uzupełnienia w przyszłości)
    i masowo zapisuje dane do MSSQL przez SqlBulkCopy.
.EXAMPLE
    .\Scan-PhotosToMssql.ps1 -SourceFolder "D:\MojeZdjecia" -Server "localhost" -Database "GeoPhotoTracker"
#>

param (
    [Parameter(Mandatory = $true)]
    [string]$SourceFolder,

    [string]$Server = "localhost",
    [string]$Database = "GeoPhotoTracker",
    [int]$BatchSize = 3000
)

# Całkowite wyciszenie dzwonka i powiadomień dźwiękowych konsoli (brak jakichkolwiek sygnałów audio)
Set-PSReadLineOption -BellStyle None -ErrorAction SilentlyContinue

# Ładowanie lekkiej biblioteki do odczytu nagłówków
Add-Type -AssemblyName System.Drawing

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " GeoPhoto Tracker: Ekspresowy Skaner EXIF -> MSSQL" -ForegroundColor Cyan
Write-Host " Źródło: $SourceFolder" -ForegroundColor Gray
Write-Host " Baza:   $Server -> $Database" -ForegroundColor Gray
Write-Host " Tryb:   Tylko metadane (miniatury pominięte, ThumbnailPath = NULL)" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Definicja DataTable zgodnej ze strukturą tabeli dbo.Photos
$dataTable = New-Object System.Data.DataTable "PhotosBatch"
$dataTable.Columns.Add("FilePath", [string]) | Out-Null
$dataTable.Columns.Add("FileName", [string]) | Out-Null
$dataTable.Columns.Add("ThumbnailPath", [string]) | Out-Null    # Pozostaje $null
$dataTable.Columns.Add("PhotoTimestamp", [DateTime]) | Out-Null
$dataTable.Columns.Add("Latitude", [decimal]) | Out-Null
$dataTable.Columns.Add("Longitude", [decimal]) | Out-Null
$dataTable.Columns.Add("CameraModel", [string]) | Out-Null
$dataTable.Columns.Add("FileSize", [int64]) | Out-Null
$dataTable.Columns.Add("Title", [string]) | Out-Null

# Funkcja pomocnicza: konwersja stopni GPS z formatu ułamkowego EXIF
function Convert-ExifGpsCoord($rationalArray, $ref) {
    if (-not $rationalArray -or $rationalArray.Length -lt 6) { return $null }
    $deg = [BitConverter]::ToUInt32($rationalArray, 0) / [BitConverter]::ToUInt32($rationalArray, 4)
    $min = [BitConverter]::ToUInt32($rationalArray, 8) / [BitConverter]::ToUInt32($rationalArray, 12)
    $sec = [BitConverter]::ToUInt32($rationalArray, 16) / [BitConverter]::ToUInt32($rationalArray, 20)
    $decimal = $deg + ($min / 60.0) + ($sec / 3600.0)
    if ($ref -eq 'S' -or $ref -eq 'W') { $decimal = -$decimal }
    return [Math]::Round($decimal, 6)
}

# 2. Szybkie indeksowanie listy plików
Write-Host "Wyszukiwanie plików graficznych na dysku..." -ForegroundColor Yellow
$files = Get-ChildItem -Path $SourceFolder -Include *.jpg, *.jpeg, *.png -Recurse -File
$totalFiles = $files.Count
Write-Host "Znaleziono $totalFiles plików. Rozpoczynanie czytania EXIF..." -ForegroundColor Green

$connectionString = "Server=$Server;Database=$Database;Integrated Security=True;TrustServerCertificate=True;"
$processed = 0
$savedWithGps = 0
$skippedFiles = New-Object System.Collections.Generic.List[string]
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

foreach ($file in $files) {
    $processed++
    
    # Płynna aktualizacja paska postępu co 15 plików lub dla ostatniego pliku
    if ($processed % 15 -eq 0 -or $processed -eq $totalFiles) {
        $percent = [Math]::Round(($processed / $totalFiles) * 100, 1)
        $elapsedSec = [Math]::Max($stopwatch.Elapsed.TotalSeconds, 0.001)
        $speed = [Math]::Round($processed / $elapsedSec, 1)
        $remainingSec = if ($speed -gt 0) { [Math]::Round(($totalFiles - $processed) / $speed) } else { 0 }
        $etaFormatted = [TimeSpan]::FromSeconds($remainingSec).ToString("mm\:ss")

        # 1. Graficzny pasek postępu PowerShell (nagłówek)
        Write-Progress -Activity "Skanowanie metadanych EXIF do bazy MSSQL" `
            -Status "Przetworzono: $processed z $totalFiles ($percent%) | Z GPS: $savedWithGps | Prędkość: $speed plik/s | ETA: $etaFormatted" `
            -PercentComplete $percent `
            -SecondsRemaining $remainingSec `
            -CurrentOperation "$($file.Name)"

        # 2. Dynamiczny licznik w konsoli
        $statusLine = "`r  [Postęp] $processed / $totalFiles ($percent%) | GPS: $savedWithGps | $speed plik/s | ETA: $etaFormatted    "
        Write-Host $statusLine -NoNewline -ForegroundColor Cyan
    }

    $hasGps = $false
    try {
        # Otwieramy plik tylko do odczytu nagłówków (bez dekodowania pikseli!)
        $img = [System.Drawing.Image]::FromFile($file.FullName)

        # 0x0132 = DateTime, 0x9003 = DateTimeOriginal
        $dateProp = $null
        foreach ($prop in $img.PropertyItems) {
            if ($prop.Id -eq 0x9003 -or ($prop.Id -eq 0x0132 -and -not $dateProp)) {
                $dateProp = [System.Text.Encoding]::ASCII.GetString($prop.Value).Trim([char]0)
            }
        }

        # Parsowanie daty wykonania zdjęcia
        $photoDate = $file.LastWriteTime
        if ($dateProp -and $dateProp -match '^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})') {
            $photoDate = [DateTime]::ParseExact($dateProp, "yyyy:MM:dd HH:mm:ss", [System.Globalization.CultureInfo]::InvariantCulture)
        }

        # Odczyt współrzędnych GPS (0x0002 = Lat, 0x0001 = LatRef, 0x0004 = Lng, 0x0003 = LngRef)
        $latProp = $img.PropertyItems | Where-Object { $_.Id -eq 0x0002 }
        $latRefProp = $img.PropertyItems | Where-Object { $_.Id -eq 0x0001 }
        $lngProp = $img.PropertyItems | Where-Object { $_.Id -eq 0x0004 }
        $lngRefProp = $img.PropertyItems | Where-Object { $_.Id -eq 0x0003 }

        if ($latProp -and $lngProp) {
            $latRef = if ($latRefProp) { [char]$latRefProp.Value[0] } else { 'N' }
            $lngRef = if ($lngRefProp) { [char]$lngRefProp.Value[0] } else { 'E' }
            $lat = Convert-ExifGpsCoord $latProp.Value $latRef
            $lng = Convert-ExifGpsCoord $lngProp.Value $lngRef

            if ($lat -and $lng) {
                # Model aparatu (0x0110)
                $camProp = $img.PropertyItems | Where-Object { $_.Id -eq 0x0110 }
                $camModel = if ($camProp) { [System.Text.Encoding]::ASCII.GetString($camProp.Value).Trim([char]0) } else { "" }

                # Wstawienie rekordu do bufora
                $row = $dataTable.NewRow()
                $row["FilePath"] = $file.FullName
                $row["FileName"] = $file.Name
                $row["ThumbnailPath"] = [System.DBNull]::Value  # Miejsce na miniaturę zarezerwowane na przyszłość
                $row["PhotoTimestamp"] = $photoDate
                $row["Latitude"] = $lat
                $row["Longitude"] = $lng
                $row["CameraModel"] = $camModel
                $row["FileSize"] = $file.Length
                $row["Title"] = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
                $dataTable.Rows.Add($row)
                $savedWithGps++
                $hasGps = $true
            }
        }
        $img.Dispose()
    }
    catch {
        # Plik uszkodzony lub brak uprawnień - pomijamy bez przerywania pętli
    }

    if (-not $hasGps) {
        $skippedFiles.Add($file.FullName)
    }

    # Błyskawiczny zrzut partii danych do bazy przez SqlBulkCopy
    if ($dataTable.Rows.Count -ge $BatchSize) {
        $bulk = New-Object System.Data.SqlClient.SqlBulkCopy($connectionString)
        $bulk.DestinationTableName = "dbo.Photos"
        $bulk.ColumnMappings.Add("FilePath", "FilePath") | Out-Null
        $bulk.ColumnMappings.Add("FileName", "FileName") | Out-Null
        $bulk.ColumnMappings.Add("ThumbnailPath", "ThumbnailPath") | Out-Null
        $bulk.ColumnMappings.Add("PhotoTimestamp", "PhotoTimestamp") | Out-Null
        $bulk.ColumnMappings.Add("Latitude", "Latitude") | Out-Null
        $bulk.ColumnMappings.Add("Longitude", "Longitude") | Out-Null
        $bulk.ColumnMappings.Add("CameraModel", "CameraModel") | Out-Null
        $bulk.ColumnMappings.Add("FileSize", "FileSize") | Out-Null
        $bulk.ColumnMappings.Add("Title", "Title") | Out-Null
        $bulk.WriteToServer($dataTable)
        $bulk.Close()
        $dataTable.Clear()
    }
}

# Zamknięcie paska postępu
Write-Progress -Activity "Skanowanie metadanych EXIF do bazy MSSQL" -Completed
$stopwatch.Stop()
Write-Host "" # Nowa linia po dynamicznym liczniku

# Zapisanie pozostałych rekordów z ostatniej partii
if ($dataTable.Rows.Count -gt 0) {
    Write-Host "Zapisywanie ostatniej partii $($dataTable.Rows.Count) rekordów do bazy..." -ForegroundColor Cyan
    $bulk = New-Object System.Data.SqlClient.SqlBulkCopy($connectionString)
    $bulk.DestinationTableName = "dbo.Photos"
    $bulk.ColumnMappings.Add("FilePath", "FilePath") | Out-Null
    $bulk.ColumnMappings.Add("FileName", "FileName") | Out-Null
    $bulk.ColumnMappings.Add("ThumbnailPath", "ThumbnailPath") | Out-Null
    $bulk.ColumnMappings.Add("PhotoTimestamp", "PhotoTimestamp") | Out-Null
    $bulk.ColumnMappings.Add("Latitude", "Latitude") | Out-Null
    $bulk.ColumnMappings.Add("Longitude", "Longitude") | Out-Null
    $bulk.ColumnMappings.Add("CameraModel", "CameraModel") | Out-Null
    $bulk.ColumnMappings.Add("FileSize", "FileSize") | Out-Null
    $bulk.ColumnMappings.Add("Title", "Title") | Out-Null
    $bulk.WriteToServer($dataTable)
    $bulk.Close()
    $dataTable.Clear()
}

# 3. Aktualizacja kolumny przestrzennej GEOGRAPHY w SQL
Write-Host "Aktualizowanie punktów przestrzennych GEOGRAPHY w MSSQL..." -ForegroundColor Yellow
$sqlConn = New-Object System.Data.SqlClient.SqlConnection($connectionString)
$sqlConn.Open()
$sqlCmd = $sqlConn.CreateCommand()
$sqlCmd.CommandText = "UPDATE dbo.Photos SET GeoLocation = geography::Point(Latitude, Longitude, 4326) WHERE GeoLocation IS NULL;"
$sqlCmd.ExecuteNonQuery() | Out-Null
$sqlConn.Close()

$totalSeconds = [Math]::Max($stopwatch.Elapsed.TotalSeconds, 0.01)
$avgSpeed = [Math]::Round($processed / $totalSeconds, 1)
$timeFormatted = $stopwatch.Elapsed.ToString("mm\:ss\.fff")

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " SUKCES! Zakończono import metadanych do MSSQL." -ForegroundColor Green
Write-Host " Przetworzono plików:          $processed" -ForegroundColor White
Write-Host " Zapisano z tagami GPS:        $savedWithGps" -ForegroundColor White
Write-Host " Pominięto (brak GPS w EXIF):  $($skippedFiles.Count)" -ForegroundColor $(if ($skippedFiles.Count -gt 0) { "Yellow" } else { "Gray" })
Write-Host " Całkowity czas skanowania:    $timeFormatted ($avgSpeed plików/sek)" -ForegroundColor Cyan
Write-Host " Status kolumny ThumbnailPath: Zarezerwowana (NULL)" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green

# 5. Wylistowanie plików bez danych GPS
if ($skippedFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Yellow
    Write-Host " LISTA PLIKÓW BEZ DANYCH GPS ($($skippedFiles.Count)): " -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Yellow

    $displayLimit = 50
    $index = 0
    foreach ($skippedPath in $skippedFiles) {
        $index++
        if ($index -le $displayLimit) {
            Write-Host " [$index] $skippedPath" -ForegroundColor DarkYellow
        }
    }

    if ($skippedFiles.Count -gt $displayLimit) {
        Write-Host " ... oraz $($skippedFiles.Count - $displayLimit) kolejnych plików (wyświetlono pierwsze $displayLimit)." -ForegroundColor Gray
    }

    $logFile = Join-Path $SourceFolder "pliki_bez_gps.txt"
    try {
        $skippedFiles | Out-File -FilePath $logFile -Encoding utf8
        Write-Host ""
        Write-Host "-> Pełną listę ($($skippedFiles.Count) plików) zapisano do: $logFile" -ForegroundColor Cyan
    } catch {
        $fallbackLog = ".\pliki_bez_gps.txt"
        $skippedFiles | Out-File -FilePath $fallbackLog -Encoding utf8
        Write-Host ""
        Write-Host "-> Pełną listę ($($skippedFiles.Count) plików) zapisano do: $fallbackLog" -ForegroundColor Cyan
    }
    Write-Host "==========================================================" -ForegroundColor Yellow
} else {
    Write-Host "`n[i] Wszystkie przetworzone pliki ($processed) posiadały poprawne współrzędne GPS!" -ForegroundColor Green
}
```

---

## 3.1. Gotowy Skrypt do Natychmiastowego Wklejenia w PowerShell (Test Twojego Folderu)

Jeśli chcesz od razu przetestować import **bez tworzenia plików `.ps1`**, po prostu zaznacz i skopiuj poniższy blok kodu, wklej go bezpośrednio do otwartego okna konsoli **PowerShell** i naciśnij **Enter**.

Ścieżka do Twojego folderu ze zdjęciami jest już wpisana:

```powershell
# ==============================================================================
# GEOPHOTO TRACKER - EKSPRESOWY TEST IMPORTU EXIF DO MSSQL
# (Wklej bezpośrednio w okno PowerShell i wciśnij Enter)
# ==============================================================================

# 1. PARAMETRY POŁĄCZENIA I FOLDERU:
# Wyciszenie dzwonka i powiadomień dźwiękowych konsoli (brak sygnałów audio)
Set-PSReadLineOption -BellStyle None -ErrorAction SilentlyContinue

$SourceFolder = "c:\Moje dokumenty\Zdjęcia\202412 Góry Zatoka Zadzwońcie po milicję Święta"
$Server       = "localhost"              # Jeśli masz instancję nazwaną, wpisz np.: "localhost\SQLEXPRESS"
$Database     = "GeoPhotoTracker"

# 2. SPRAWDZENIE FOLDERU:
if (-not (Test-Path $SourceFolder)) {
    Write-Host "[!] Folder nie został znaleziony: $SourceFolder" -ForegroundColor Red
    return
}

# 3. ZAŁADOWANIE BIBLIOTEKI GRAFICZNEJ:
Add-Type -AssemblyName System.Drawing

# Funkcja pomocnicza: konwersja współrzędnych GPS z ułamkowego formatu EXIF
function Convert-ExifGpsCoord($rationalArray, $ref) {
    if (-not $rationalArray -or $rationalArray.Length -lt 6) { return $null }
    $deg = [BitConverter]::ToUInt32($rationalArray, 0) / [BitConverter]::ToUInt32($rationalArray, 4)
    $min = [BitConverter]::ToUInt32($rationalArray, 8) / [BitConverter]::ToUInt32($rationalArray, 12)
    $sec = [BitConverter]::ToUInt32($rationalArray, 16) / [BitConverter]::ToUInt32($rationalArray, 20)
    $decimal = $deg + ($min / 60.0) + ($sec / 3600.0)
    if ($ref -eq 'S' -or $ref -eq 'W') { $decimal = -$decimal }
    return [Math]::Round($decimal, 6)
}

# 4. PRZYGOTOWANIE STRUKTURY DANYCH W PAMIĘCI (zgodnej z tabelą dbo.Photos):
$dataTable = New-Object System.Data.DataTable "PhotosBatch"
$dataTable.Columns.Add("FilePath", [string]) | Out-Null
$dataTable.Columns.Add("FileName", [string]) | Out-Null
$dataTable.Columns.Add("ThumbnailPath", [string]) | Out-Null    # Zarezerwowane na przyszłość ($null)
$dataTable.Columns.Add("PhotoTimestamp", [DateTime]) | Out-Null
$dataTable.Columns.Add("Latitude", [decimal]) | Out-Null
$dataTable.Columns.Add("Longitude", [decimal]) | Out-Null
$dataTable.Columns.Add("CameraModel", [string]) | Out-Null
$dataTable.Columns.Add("FileSize", [int64]) | Out-Null
$dataTable.Columns.Add("Title", [string]) | Out-Null

# 5. SKANOWANIE PLIKÓW:
Write-Host "Szukanie zdjęć w: $SourceFolder..." -ForegroundColor Yellow
$files = Get-ChildItem -Path $SourceFolder -Include *.jpg, *.jpeg, *.png -Recurse -File
Write-Host "Znaleziono $($files.Count) plików. Odczytywanie tagów EXIF (GPS i data)..." -ForegroundColor Cyan

$processed = 0
$savedWithGps = 0
$skippedFiles = New-Object System.Collections.Generic.List[string]
$totalFiles = $files.Count
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

foreach ($file in $files) {
    $processed++
    
    # Płynna aktualizacja paska postępu co 15 plików lub dla ostatniego pliku
    if ($processed % 15 -eq 0 -or $processed -eq $totalFiles) {
        $percent = [Math]::Round(($processed / $totalFiles) * 100, 1)
        $elapsedSec = [Math]::Max($stopwatch.Elapsed.TotalSeconds, 0.001)
        $speed = [Math]::Round($processed / $elapsedSec, 1)
        $remainingSec = if ($speed -gt 0) { [Math]::Round(($totalFiles - $processed) / $speed) } else { 0 }
        $etaFormatted = [TimeSpan]::FromSeconds($remainingSec).ToString("mm\:ss")

        # 1. Graficzny pasek postępu PowerShell (u góry okna)
        Write-Progress -Activity "Skanowanie metadanych EXIF do bazy MSSQL" `
            -Status "Przetworzono: $processed z $totalFiles ($percent%) | Z GPS: $savedWithGps | Prędkość: $speed plik/s | ETA: $etaFormatted" `
            -PercentComplete $percent `
            -SecondsRemaining $remainingSec `
            -CurrentOperation "$($file.Name)"

        # 2. Dynamiczny licznik w konsoli (aktualizowany w miejscu)
        $statusLine = "`r  [Postęp] $processed / $totalFiles ($percent%) | GPS: $savedWithGps | $speed plik/s | ETA: $etaFormatted    "
        Write-Host $statusLine -NoNewline -ForegroundColor Cyan
    }

    $hasGps = $false
    try {
        # Otwieramy plik tylko do odczytu nagłówków (bez renderowania bitmapy)
        $img = [System.Drawing.Image]::FromFile($file.FullName)
        
        # Data wykonania zdjęcia (0x9003 = DateTimeOriginal, 0x0132 = DateTime)
        $dateProp = $null
        foreach ($prop in $img.PropertyItems) {
            if ($prop.Id -eq 0x9003 -or ($prop.Id -eq 0x0132 -and -not $dateProp)) {
                $dateProp = [System.Text.Encoding]::ASCII.GetString($prop.Value).Trim([char]0)
            }
        }
        $photoDate = $file.LastWriteTime
        if ($dateProp -and $dateProp -match '^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})') {
            $photoDate = [DateTime]::ParseExact($dateProp, "yyyy:MM:dd HH:mm:ss", [System.Globalization.CultureInfo]::InvariantCulture)
        }

        # Współrzędne GPS (0x0002 = Lat, 0x0001 = LatRef, 0x0004 = Lng, 0x0003 = LngRef)
        $latProp = $img.PropertyItems | Where-Object { $_.Id -eq 0x0002 }
        $latRefProp = $img.PropertyItems | Where-Object { $_.Id -eq 0x0001 }
        $lngProp = $img.PropertyItems | Where-Object { $_.Id -eq 0x0004 }
        $lngRefProp = $img.PropertyItems | Where-Object { $_.Id -eq 0x0003 }

        if ($latProp -and $lngProp) {
            $latRef = if ($latRefProp) { [char]$latRefProp.Value[0] } else { 'N' }
            $lngRef = if ($lngRefProp) { [char]$lngRefProp.Value[0] } else { 'E' }
            $lat = Convert-ExifGpsCoord $latProp.Value $latRef
            $lng = Convert-ExifGpsCoord $lngProp.Value $lngRef

            if ($lat -and $lng) {
                $camProp = $img.PropertyItems | Where-Object { $_.Id -eq 0x0110 }
                $camModel = if ($camProp) { [System.Text.Encoding]::ASCII.GetString($camProp.Value).Trim([char]0) } else { "" }

                $row = $dataTable.NewRow()
                $row["FilePath"] = $file.FullName
                $row["FileName"] = $file.Name
                $row["ThumbnailPath"] = [System.DBNull]::Value  # Miejsce na miniaturę na przyszłość
                $row["PhotoTimestamp"] = $photoDate
                $row["Latitude"] = $lat
                $row["Longitude"] = $lng
                $row["CameraModel"] = $camModel
                $row["FileSize"] = $file.Length
                $row["Title"] = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
                $dataTable.Rows.Add($row)
                $savedWithGps++
                $hasGps = $true
            }
        }
        $img.Dispose()
    }
    catch {
        # Pomijamy pliki uszkodzone lub bez uprawnień
    }

    if (-not $hasGps) {
        $skippedFiles.Add($file.FullName)
    }
}

# Zamknięcie paska postępu
Write-Progress -Activity "Skanowanie metadanych EXIF do bazy MSSQL" -Completed
$stopwatch.Stop()
Write-Host "" # Nowa linia po dynamicznym liczniku

# 6. MASOWY ZAPIS DO MSSQL (SqlBulkCopy):
$connStr = "Server=$Server;Database=$Database;Integrated Security=True;TrustServerCertificate=True;"

if ($dataTable.Rows.Count -gt 0) {
    Write-Host "Zapisywanie $savedWithGps zdjęć z GPS do bazy MSSQL..." -ForegroundColor Cyan
    $bulk = New-Object System.Data.SqlClient.SqlBulkCopy($connStr)
    $bulk.DestinationTableName = "dbo.Photos"
    $dataTable.Columns | ForEach-Object { $bulk.ColumnMappings.Add($_.ColumnName, $_.ColumnName) | Out-Null }
    $bulk.WriteToServer($dataTable)
    $bulk.Close()

    # 7. GENEROWANIE PUNTÓW GEOGRAPHY DO BŁYSKAWICZNEJ MAPY:
    Write-Host "Aktualizowanie punktów GEOGRAPHY w SQL..." -ForegroundColor Yellow
    $conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "UPDATE dbo.Photos SET GeoLocation = geography::Point(Latitude, Longitude, 4326) WHERE GeoLocation IS NULL;"
    $cmd.ExecuteNonQuery() | Out-Null
    $conn.Close()

    $totalSeconds = [Math]::Max($stopwatch.Elapsed.TotalSeconds, 0.01)
    $avgSpeed = [Math]::Round($processed / $totalSeconds, 1)
    $timeFormatted = $stopwatch.Elapsed.ToString("mm\:ss\.fff")

    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " SUKCES! Zapisano $($dataTable.Rows.Count) zdjęć do bazy $Database" -ForegroundColor Green
    Write-Host " Przetworzono plików:          $processed" -ForegroundColor White
    Write-Host " Zapisano z tagami GPS:        $savedWithGps" -ForegroundColor White
    Write-Host " Pominięto (brak GPS w EXIF):  $($skippedFiles.Count)" -ForegroundColor $(if ($skippedFiles.Count -gt 0) { "Yellow" } else { "Gray" })
    Write-Host " Całkowity czas skanowania:    $timeFormatted ($avgSpeed plików/sek)" -ForegroundColor Cyan
    Write-Host " Status kolumny ThumbnailPath: Zarezerwowana (NULL)" -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Green

    # 8. Wylistowanie plików bez danych GPS
    if ($skippedFiles.Count -gt 0) {
        Write-Host ""
        Write-Host "==========================================================" -ForegroundColor Yellow
        Write-Host " LISTA PLIKÓW BEZ DANYCH GPS ($($skippedFiles.Count)): " -ForegroundColor Yellow
        Write-Host "==========================================================" -ForegroundColor Yellow

        $displayLimit = 50
        $index = 0
        foreach ($skippedPath in $skippedFiles) {
            $index++
            if ($index -le $displayLimit) {
                Write-Host " [$index] $skippedPath" -ForegroundColor DarkYellow
            }
        }

        if ($skippedFiles.Count -gt $displayLimit) {
            Write-Host " ... oraz $($skippedFiles.Count - $displayLimit) kolejnych plików (wyświetlono pierwsze $displayLimit)." -ForegroundColor Gray
        }

        $logFile = Join-Path $SourceFolder "pliki_bez_gps.txt"
        try {
            $skippedFiles | Out-File -FilePath $logFile -Encoding utf8
            Write-Host ""
            Write-Host "-> Pełną listę ($($skippedFiles.Count) plików) zapisano do: $logFile" -ForegroundColor Cyan
        } catch {
            $fallbackLog = ".\pliki_bez_gps.txt"
            $skippedFiles | Out-File -FilePath $fallbackLog -Encoding utf8
            Write-Host ""
            Write-Host "-> Pełną listę ($($skippedFiles.Count) plików) zapisano do: $fallbackLog" -ForegroundColor Cyan
        }
        Write-Host "==========================================================" -ForegroundColor Yellow
    } else {
        Write-Host "`n[i] Wszystkie przetworzone pliki ($processed) posiadały poprawne współrzędne GPS!" -ForegroundColor Green
    }
} else {
    Write-Host "[!] Przetworzono $processed plików, ale żaden nie zawierał współrzędnych GPS w EXIF." -ForegroundColor Yellow
    if ($skippedFiles.Count -gt 0) {
        $displayLimit = 50
        $index = 0
        foreach ($skippedPath in $skippedFiles) {
            $index++
            if ($index -le $displayLimit) {
                Write-Host " [$index] $skippedPath" -ForegroundColor DarkYellow
            }
        }
        if ($skippedFiles.Count -gt $displayLimit) {
            Write-Host " ... oraz $($skippedFiles.Count - $displayLimit) kolejnych plików." -ForegroundColor Gray
        }
    }
}
```

---

## 4. Jak w Przyszłości Dodać Miniatury? (Krok Opcjonalny)

Kiedy zechcesz wdrożyć miniatury, schemat bazy jest już w 100% gotowy. Wystarczy:

1. **Uruchomić skrypt generujący miniatury w tle:**
   Generuje pliki `.webp` lub `.jpg` w folderze `.cache\thumbnails` tylko dla wpisów z bazy.
2. **Wykonać prosty `UPDATE` w MSSQL:**
   ```sql
   -- Przykład masowej aktualizacji ścieżek miniatur:
   UPDATE dbo.Photos 
   SET ThumbnailPath = 'D:\Zdjecia\.cache\thumbnails\thumb_' + CAST(Id AS NVARCHAR(20)) + '.jpg'
   WHERE ThumbnailPath IS NULL;
   ```
3. **Alternatywa: Generowanie w locie przez backend (On-demand):**  
   Backend serwuje `GET /api/thumb/:id` – przy pierwszym zapytaniu generuje mały plik, zapisuje na dysku, aktualizuje `ThumbnailPath` w MSSQL i odsyła do przeglądarki. Kolejne zapytania są już natychmiastowe.

---

## 5. Wywołanie Skanowania z Przeglądarki (Przycisk „Pobierz dane do SQL”)

Aby odpalić ten proces bezpośrednio z poziomu aplikacji GeoPhoto Tracker:

1. **Lokalny Endpoint Backendowy (np. `server.ts` w Node.js / Express):**
   ```typescript
   import { spawn } from 'child_process';

   app.post('/api/scan-photos', (req, res) => {
     const folderPath = req.body.folderPath; // np. "D:\\MojeZdjecia"
     
     // Uruchomienie skryptu PowerShell bez blokowania interfejsu
     const ps = spawn('powershell.exe', [
       '-ExecutionPolicy', 'Bypass',
       '-File', './Scan-PhotosToMssql.ps1',
       '-SourceFolder', folderPath
     ]);

     ps.stdout.on('data', (data) => console.log(`[Import MSSQL]: ${data}`));
     ps.stderr.on('data', (err) => console.error(`[Import Błąd]: ${err}`));

     res.json({ status: 'STARTED', message: 'Skanowanie metadanych EXIF rozpoczęte' });
   });
   ```

---

## 6. Uwaga: Środowisko Chmurowe (AI Studio Preview) vs Maszyna Lokalna

### Dlaczego pojawia się błąd `Failed to connect to localhost:1433` lub `getaddrinfo ENOTFOUND AAT-NTB`?
Aplikacja w oknie podglądu AI Studio uruchomiona jest w odizolowanym kontenerze chmurowym (Google Cloud). Kontener w chmurze nie ma fizycznego dostępu do Twojej lokalnej sieci domowej ani nazwy komputera `AAT-NTB`.

### Jak rozwiązać ten problem:
1. **Opcja A (Najszybsza w chmurze - 10 sekund): Wklej JSON lub załaduj plik**
   W SQL Server Management Studio uruchom:
   ```sql
   SELECT Id, FileName, FilePath, PhotoTimestamp, Latitude, Longitude, CameraModel, FileSize, Title 
   FROM dbo.Photos 
   FOR JSON PATH;
   ```
   Skopiuj wynik i wklej w oknie aplikacji w zakładce **„⚡ Szybki Import JSON”**. Zdjęcia natychmiast pojawią się na mapie i w kalendarzu 5×5!

2. **Opcja B (PowerShell 1-liner): Bezpośredni POST do aplikacji**
   W PowerShell na swoim komputerze:
   ```powershell
   $data = Invoke-Sqlcmd -ServerInstance "localhost" -Database "GeoPhotoTracker" -Query "SELECT Id, FileName, FilePath, PhotoTimestamp, Latitude, Longitude, CameraModel, FileSize, Title FROM dbo.Photos FOR JSON PATH"
   $json = ($data | Out-String).Trim()
   Invoke-RestMethod -Uri "$APP_URL/api/photos/sync" -Method Post -Body $json -ContentType "application/json; charset=utf-8"
   ```

3. **Opcja C (Docelowa - Uruchomienie lokalne na Twoim komputerze):**
   Gdy sklonujesz lub pobierzesz projekt na dysk i uruchomisz `npm run dev`, aplikacja działa bezpośrednio na Twojej maszynie i bez problemu łączy się z `localhost:1433`, a także czyta Twoje oryginalne pliki JPG z dysku `C:\`.


2. **Interfejs w Aplikacji:**
   * Dyskretny przycisk w prawym panelu sterowania (np. w menu podręcznym lub pod matrycą 5×5).
   * Modal z podaniem ścieżki do lokalnego folderu ze zdjęciami.
   * Wskaźnik postępu i powiadomienie o sukcesie wraz z automatycznym odświeżeniem punktów na mapie.

---

## 7. Kompletny Przewodnik Uruchomienia Aplikacji na Komputerze Lokalnym (Krok po Kroku)

Gdy chcesz pracować z aplikacją na swoim komputerze i połączyć ją na stałe z lokalną bazą danych SQL Server oraz fizycznymi plikami zdjęć na dysku, postępuj zgodnie z poniższymi krokami.

### Dlaczego warto uruchomić aplikację lokalnie?
* **100% natywna prędkość:** Połączenie z MSSQL odbywa się po lokalnym protokole TCP/IP (latencja <1 ms), bez pośredników i ograniczeń sieciowych.
* **Bezpośredni odczyt plików JPG z dysku:** Backend Node.js (`server.ts`) ma bezpośredni dostęp do systemu plików Windows (np. `C:\Moje dokumenty\Zdjęcia\...`) i serwuje zdjęcia w pełnej rozdzielczości prosto do okna modalnego.
* **Pełna prywatność:** Żadne zdjęcia ani dane z bazy nie opuszczają Twojego komputera.

---

### Krok 1: Wymagania wstępne
1. **Node.js**: Wersja 18 LTS lub 20 LTS (pobierz instalator z [nodejs.org](https://nodejs.org/)).
2. **Microsoft SQL Server**: Dowolna edycja (Developer, Standard lub Express) z utworzoną bazą `GeoPhotoTracker` i tabelą `dbo.Photos`.
3. **Pobrany projekt GeoPhoto Tracker**: Rozpakowany do wybranego folderu na dysku (np. `C:\Projekty\GeoPhotoTracker`).

---

### Krok 2: Konfiguracja sieci TCP/IP w SQL Server
Domyślnie SQL Server może mieć wyłączony protokół TCP/IP dla połączeń zewnętrznych aplikacji Node.js. Aby go włączyć:

1. Otwórz menu Start i uruchom **SQL Server Configuration Manager** (lub wpisz `SQLServerManager16.msc` / `SQLServerManager15.msc` w oknie *Uruchom* `Win + R`).
2. Rozwiń węzeł: **SQL Server Network Configuration** -> **Protocols for MSSQLSERVER** (lub `Protocols for SQLEXPRESS`).
3. Sprawdź status protokołu **TCP/IP**:
   * Jeśli jest *Disabled*, kliknij prawym przyciskiem myszy i wybierz **Enable** (Włącz).
   * Kliknij dwukrotnie w **TCP/IP**, przejdź do zakładki **IP Addresses**, zjedź na sam dół do sekcji **IPAll** i upewnij się, że pole **TCP Port** ma wartość `1433`.
4. Przejdź do węzła **SQL Server Services**:
   * Kliknij prawym przyciskiem myszy na usługę **SQL Server (MSSQLSERVER)** lub **SQL Server (SQLEXPRESS)**.
   * Wybierz **Restart** (Uruchom ponownie).

---

### Krok 3: Włączenie Uwierzytelniania SQL (Mixed Mode) i Utworzenie Loginu
Sterownik bazy danych `mssql` w Node.js łączy się najstabilniej za pomocą konta SQL Server Authentication (np. `sa` lub dedykowanego użytkownika):

1. Otwórz **SQL Server Management Studio (SSMS)** i zaloguj się za pomocą uwierzytelniania Windows.
2. Kliknij prawym przyciskiem myszy na nazwę serwera na samej górze drzewa obiektów -> wybierz **Properties** (Właściwości).
3. Przejdź do zakładki **Security** (Zabezpieczenia) i zaznacz:
   * **SQL Server and Windows Authentication mode** (Mixed Mode).
   * Kliknij **OK**.
4. Włącz konto `sa` lub stwórz nowego użytkownika:
   * Rozwiń węzeł **Security** -> **Logins**.
   * Kliknij prawym przyciskiem na konto **sa** -> **Properties**:
     * W zakładce *General*: ustaw silne hasło (np. `TwojeHasloSQL123!`).
     * W zakładce *Status*: ustaw *Permission to connect to database engine* na **Grant**, a *Login* na **Enabled**.
   * *(Opcjonalnie)* Jeśli wolisz dedykowanego użytkownika zamiast `sa`:
     * Prawy przycisk na *Logins* -> *New Login...* -> Login name: `geophoto`, SQL Server authentication, hasło: `TwojeHasloSQL123!`.
     * W zakładce *User Mapping* zaznacz bazę `GeoPhotoTracker` i przypisz role `db_datareader` oraz `db_datawriter`.
5. Ponownie zrestartuj usługę SQL Server w Configuration Managerze (lub w SSMS prawy przycisk na serwer -> *Restart*).

---

### Krok 4: Utworzenie pliku `.env` w projekcie
W głównym katalogu aplikacji GeoPhoto Tracker utwórz plik tekstowy o nazwie `.env` (obok pliku `package.json`) i wpisz parametry swojej instalacji:

```env
PORT=3000
MSSQL_SERVER=localhost
MSSQL_DATABASE=GeoPhotoTracker
MSSQL_PORT=1433
MSSQL_USER=sa
MSSQL_PASSWORD=TwojeHasloSQL123!
```

> **Wskazówka dla SQL Server Express:** Jeśli posiadasz instancję nazwaną, podaj:
> `MSSQL_SERVER=localhost\SQLEXPRESS`

---

### Krok 5: Instalacja zależności i uruchomienie aplikacji
Otwórz terminal (PowerShell lub CMD) w folderze projektu i wykonaj polecenia:

```powershell
# 1. Pobranie i instalacja bibliotek (wykonujesz tylko raz):
npm install

# 2. Uruchomienie serwera deweloperskiego:
npm run dev
```

W oknie konsoli pojawi się zielony komunikat potwierdzający połączenie:
```text
[MSSQL] Połączono z bazą: localhost/GeoPhotoTracker
Serwer GeoPhoto Tracker uruchomiony na: http://localhost:3000
```

---

### Krok 6: Korzystanie z aplikacji w przeglądarce
Otwórz dowolną przeglądarkę internetową pod adresem:
👉 **http://localhost:3000**

* Aplikacja automatycznie załaduje wszystkie rekordy z tabeli `dbo.Photos`.
* Kalendarz 5×5 podświetli okresy z największą gęstością zdjęć.
* Mapa geograficzna pokaże dokładne pinezki i ścieżki przemieszczania się.
* Kliknięcie w dowolne zdjęcie otworzy pełny podgląd pliku odczytanego bezpośrednio z dysku lokalnego!

---

### Rozwiązywanie częstych problemów (Troubleshooting)
1. **Błąd: `Failed to connect to localhost:1433 - connect ECONNREFUSED`**
   * Usługa SQL Server nie nasłuchuje na porcie 1433. Upewnij się, że w *SQL Server Configuration Manager* protokół TCP/IP jest włączony (`Enabled`), w zakładce *IPAll* port to `1433` i usługa SQL została zrestartowana.
2. **Błąd: `Login failed for user 'sa'`**
   * Serwer SQL nie ma włączonego trybu *Mixed Authentication* (Krok 3) lub hasło jest niepoprawne.
3. **Błąd: `getaddrinfo ENOTFOUND`**
   * Sprawdź pisownię parametru `MSSQL_SERVER` w pliku `.env`. Jeśli używasz instancji nazwanej w PowerShellu, upewnij się, że ukośnik nie został ucięty (`localhost\SQLEXPRESS`).

---

## 8. Podsumowanie Korzyści Zmiany Planu
* **Czas wykonania:** Zredukowany z wielu godzin do zaledwie kilkudziesięciu sekund lub paru minut dla 100 000 zdjęć.
* **Minimalne zużycie zasobów:** Brak obciążenia dysku gigabajtami dodatkowych plików i zerowe obciążenie procesora skalowaniem grafiki.
* **Czysty schemat SQL:** Kolumna `ThumbnailPath NULL` zachowuje pełną elastyczność i gotowość na etap 2 bez konieczności migracji `ALTER TABLE`.
