<#
.SYNOPSIS
    Ekspresowy skaner metadanych EXIF do bazy Microsoft SQL Server (bez generowania miniatur).
.DESCRIPTION
    Przeszukuje podany katalog, odczytuje tagi GPS, datę i model aparatu,
    pozostawia kolumnę ThumbnailPath jako NULL (do uzupełnienia w przyszłości)
    i masowo zapisuje dane do MSSQL przez SqlBulkCopy.
.EXAMPLE
    .\Scan-PhotosToMssql.ps1 -SourceFolder "C:\TestZdjecia" -Server "localhost" -Database "GeoPhotoTracker"
#>

param (
    [Parameter(Mandatory = $true)]
    [string]$SourceFolder,

    [string]$Server = "localhost",
    [string]$Database = "GeoPhotoTracker",
    [int]$BatchSize = 1000
)

# Całkowite wyciszenie dzwonka i powiadomień dźwiękowych konsoli (tryb cichy - brak sygnałów audio)
Set-PSReadLineOption -BellStyle None -ErrorAction SilentlyContinue

# Załadowanie biblioteki do odczytu nagłówków grafik
Add-Type -AssemblyName System.Drawing

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " GeoPhoto Tracker: Ekspresowy Skaner EXIF -> MSSQL" -ForegroundColor Cyan
Write-Host " Źródło: $SourceFolder" -ForegroundColor Gray
Write-Host " Baza:   $Server -> $Database" -ForegroundColor Gray
Write-Host " Tryb:   Tylko metadane (ThumbnailPath = NULL)" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Sprawdzenie czy folder istnieje
if (-not (Test-Path $SourceFolder)) {
    Write-Error "Podany folder nie istnieje: $SourceFolder"
    exit 1
}

# 2. Definicja DataTable zgodnej ze strukturą tabeli dbo.Photos
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

# 3. Szybkie indeksowanie listy plików
Write-Host "Wyszukiwanie plików graficznych na dysku..." -ForegroundColor Yellow
$files = Get-ChildItem -Path $SourceFolder -Include *.jpg, *.jpeg, *.png -Recurse -File
$totalFiles = $files.Count

if ($totalFiles -eq 0) {
    Write-Warning "Nie znaleziono żadnych plików JPG/PNG w folderze: $SourceFolder"
    exit 0
}

Write-Host "Znaleziono $totalFiles plików. Rozpoczynanie czytania EXIF..." -ForegroundColor Green

$connectionString = "Server=$Server;Database=$Database;Integrated Security=True;TrustServerCertificate=True;"
$processed = 0
$savedWithGps = 0
$skippedFiles = New-Object System.Collections.Generic.List[string]
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

foreach ($file in $files) {
    $processed++
    
    # Aktualizacja paska postępu co 15 plików lub dla ostatniego pliku
    if ($processed % 15 -eq 0 -or $processed -eq $totalFiles) {
        $percent = [Math]::Round(($processed / $totalFiles) * 100, 1)
        $elapsedSec = [Math]::Max($stopwatch.Elapsed.TotalSeconds, 0.001)
        $speed = [Math]::Round($processed / $elapsedSec, 1)
        $remainingSec = if ($speed -gt 0) { [Math]::Round(($totalFiles - $processed) / $speed) } else { 0 }
        $etaFormatted = [TimeSpan]::FromSeconds($remainingSec).ToString("mm\:ss")

        # Natywny pasek postępu PowerShell (nagłówek)
        Write-Progress -Activity "Skanowanie metadanych EXIF do bazy MSSQL" `
            -Status "Przetworzono: $processed z $totalFiles ($percent%) | Z GPS: $savedWithGps | Prędkość: $speed plik/s | ETA: $etaFormatted" `
            -PercentComplete $percent `
            -SecondsRemaining $remainingSec `
            -CurrentOperation "$($file.Name)"

        # Dynamiczny licznik w konsoli (aktualizowany w tej samej linijce)
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
        # Plik uszkodzony lub brak uprawnień - pomijamy bez przerywania
    }

    if (-not $hasGps) {
        $skippedFiles.Add($file.FullName)
    }

    # Zrzut paczki do MSSQL (SqlBulkCopy)
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

# Zapis pozostałych rekordów z ostatniej partii
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

# 4. Aktualizacja kolumny przestrzennej GEOGRAPHY w SQL
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

# 5. Wylistowanie plików, z których nie udało się pobrać danych GPS
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

    # Zapis pełnej listy do pliku tekstowego pliki_bez_gps.txt
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
