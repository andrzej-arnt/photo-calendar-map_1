import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  HardDrive,
  Calendar,
  Copy,
  Check,
  FileText,
  Upload,
  Terminal,
  Laptop,
  Trash2,
  Info,
  Layers,
} from 'lucide-react';

export interface MssqlStatusData {
  connected: boolean;
  mode?: 'direct_mssql' | 'synced_cache' | 'disconnected';
  server: string;
  database: string;
  totalPhotos?: number;
  syncedPhotosCount?: number;
  minDate?: string | null;
  maxDate?: string | null;
  photosWithThumbnail?: number;
  isCloudSandbox?: boolean;
  error?: string;
  hint?: string;
}

interface MssqlStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: MssqlStatusData | null;
  isLoading: boolean;
  onRefresh: () => void;
  onConfigure: (config: {
    server: string;
    database: string;
    user?: string;
    password?: string;
    port: number;
  }) => Promise<void>;
  useMockMode: boolean;
  onToggleMockMode: (useMock: boolean) => void;
  onSyncPhotos?: (photos: any[]) => Promise<void>;
  onClearSync?: () => Promise<void>;
}

export const MssqlStatusModal: React.FC<MssqlStatusModalProps> = ({
  isOpen,
  onClose,
  status,
  isLoading,
  onRefresh,
  onConfigure,
  useMockMode,
  onToggleMockMode,
  onSyncPhotos,
  onClearSync,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'powershell' | 'local' | 'direct'>('import');

  // Direct connection form
  const [server, setServer] = useState(status?.server || 'localhost');
  const [database, setDatabase] = useState(status?.database || 'GeoPhotoTracker');
  const [port, setPort] = useState(1433);
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Paste / File import state
  const [jsonText, setJsonText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Copy helpers
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedPs, setCopiedPs] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const sqlQueryToCopy = `SELECT Id, FileName, FilePath, PhotoTimestamp, Latitude, Longitude, CameraModel, FileSize, Title
FROM dbo.Photos
FOR JSON PATH;`;

  const psScriptToCopy = `# 1. Pobierz dane z lokalnej bazy MSSQL i wyślij bezpośrednio do aplikacji:
$data = Invoke-Sqlcmd -ServerInstance "localhost" -Database "GeoPhotoTracker" -Query "SELECT Id, FileName, FilePath, PhotoTimestamp, Latitude, Longitude, CameraModel, FileSize, Title FROM dbo.Photos FOR JSON PATH"
$jsonBody = ($data | Out-String).Trim()
Invoke-RestMethod -Uri "${currentOrigin}/api/photos/sync" -Method Post -Body $jsonBody -ContentType "application/json; charset=utf-8"
Write-Host "Zsynchronizowano zdjecia z aplikacja!" -ForegroundColor Green`;

  const envTemplateToCopy = `PORT=3000
MSSQL_SERVER=${status?.server || 'localhost'}
MSSQL_DATABASE=GeoPhotoTracker
MSSQL_PORT=1433
MSSQL_USER=sa
MSSQL_PASSWORD=TwojeHasloSQL`;

  const devCmdsToCopy = `npm install
npm run dev`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlQueryToCopy);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleCopyPs = () => {
    navigator.clipboard.writeText(psScriptToCopy);
    setCopiedPs(true);
    setTimeout(() => setCopiedPs(false), 2500);
  };

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envTemplateToCopy);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
  };

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(devCmdsToCopy);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await onConfigure({
        server,
        database,
        port,
        user: user || undefined,
        password: password || undefined,
      });
      setSaveMessage('Połączono pomyślnie z bazą MSSQL!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setSaveMessage(`Błąd: ${err?.message || 'Niepowodzenie połączenia'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportJson = async () => {
    if (!jsonText.trim()) {
      setImportMessage({ type: 'error', text: 'Wklej tekst JSON lub wybierz plik.' });
      return;
    }

    setIsImporting(true);
    setImportMessage(null);

    try {
      let parsed = JSON.parse(jsonText.trim());
      if (!Array.isArray(parsed) && parsed.photos && Array.isArray(parsed.photos)) {
        parsed = parsed.photos;
      }

      if (!Array.isArray(parsed)) {
        throw new Error('Format JSON musi być tablicą rekordów [ { Id, ... }, ... ]');
      }

      if (onSyncPhotos) {
        await onSyncPhotos(parsed);
      } else {
        const res = await fetch('/api/photos/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Błąd importu');
      }

      setImportMessage({
        type: 'success',
        text: `Sukces! Zaimportowano ${parsed.length} zdjęć z metadanymi GPS. Kalendarz i mapa zostały zaktualizowane!`,
      });
      setJsonText('');
      onRefresh();
    } catch (err: any) {
      setImportMessage({
        type: 'error',
        text: `Błąd podczas przetwarzania: ${err?.message || 'Niepoprawny JSON'}`,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setJsonText(content);
        setImportMessage({
          type: 'success',
          text: `Wczytano plik "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Kliknij "Zaimportuj do widoku".`,
        });
      }
    };
    reader.onerror = () => {
      setImportMessage({ type: 'error', text: 'Nie udało się odczytać pliku.' });
    };
    reader.readAsText(file);
  };

  const handleClear = async () => {
    if (confirm('Czy na pewno chcesz usunąć zaimportowane zdjęcia i powrócić do trybu demo?')) {
      if (onClearSync) {
        await onClearSync();
      } else {
        await fetch('/api/photos/clear-sync', { method: 'POST' });
        onRefresh();
      }
      setImportMessage({ type: 'success', text: 'Wyczyszczono dane podręczne.' });
    }
  };

  const hasPhotos = (status?.totalPhotos || 0) > 0;
  const isDirectConnected = status?.connected === true;
  const isSynced = (status?.syncedPhotosCount || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#12151e] border border-[#232838] w-full max-w-2xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#232838] bg-[#0e111a] shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isDirectConnected || isSynced
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-sm sm:text-base text-white">Integracja z bazą MSSQL</h2>
                {isDirectConnected && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 rounded-md border border-emerald-500/30">
                    Direct SQL
                  </span>
                )}
                {isSynced && !isDirectConnected && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/20 text-blue-300 rounded-md border border-blue-500/30">
                    Zaimportowane ({status?.totalPhotos} zdjęć)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Podłączenie bazy GeoPhotoTracker i zdjęć z dysku</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f2434] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Status bar & Notice */}
        <div className="p-3.5 bg-[#141824] border-b border-[#232838] shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isDirectConnected ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-semibold text-emerald-300">
                    Połączono bezpośrednio z MSSQL ({status?.server}/{status?.database})
                  </span>
                </>
              ) : isSynced ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-xs font-semibold text-blue-300">
                    Wczytano {status?.totalPhotos?.toLocaleString()} zdjęć z Twojej bazy SQL
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-semibold text-amber-300">
                    {status?.isCloudSandbox
                      ? `Tryb chmury (baza lokalna: ${status?.server || 'AAT-NTB'})`
                      : `Brak bezpośredniego połączenia z ${status?.server || 'localhost'}:1433`}
                  </span>
                </>
              )}
            </div>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1 rounded-md hover:bg-white/10 text-slate-300 transition-colors flex items-center gap-1 text-[11px]"
              title="Odśwież status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Odśwież</span>
            </button>
          </div>

          {/* Explain why localhost failed in Cloud */}
          {!isDirectConnected && (
            <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/25 text-[11px] text-amber-200/90 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Jak działa połączenie?</strong> Serwer w oknie podglądu AI Studio działa w chmurze (Google Cloud), a Twoja baza MSSQL na Twoim komputerze (<code>{status?.server || 'AAT-NTB'}</code>). Bezpieczna sieć chmury nie ma wglądu do Twojej domowej sieci LAN.
                <div className="mt-1 text-slate-300 font-medium">
                  {status?.isCloudSandbox ? (
                    <>
                      👉 Na Twoim komputerze aplikacja łączy się z bazą bezpośrednio (uruchomienie: <code>npm run dev</code> i otwarcie <code>http://localhost:3000</code>). W oknie podglądu możesz zaimportować dane przez zakładkę <strong>„⚡ Szybki Import JSON”</strong> lub <strong>„🚀 PowerShell”</strong>.
                    </>
                  ) : (
                    <>
                      👉 Upewnij się, że usługa SQL Server działa na komputerze i zezwala na połączenia TCP/IP na porcie 1433.
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {hasPhotos && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-300 pt-1">
              <div className="flex items-center gap-1.5 bg-[#1a1f30] px-2 py-1.5 rounded-lg border border-[#2b334a]">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Zdjęcia: <strong className="text-white">{status?.totalPhotos?.toLocaleString()}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#1a1f30] px-2 py-1.5 rounded-lg border border-[#2b334a]">
                <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Źródło: {isDirectConnected ? 'MSSQL Direct' : 'Baza zsynchronizowana'}</span>
              </div>
              {status?.minDate && status?.maxDate && (
                <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5 bg-[#1a1f30] px-2 py-1.5 rounded-lg border border-[#2b334a]">
                  <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="truncate">
                    {new Date(status.minDate).getFullYear()} – {new Date(status.maxDate).getFullYear()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toggle Mode: Demo vs User Photos */}
        <div className="px-4 py-2 bg-[#10141f] border-b border-[#232838] flex items-center justify-between shrink-0">
          <div>
            <div className="text-xs font-semibold text-white">Aktywne źródło danych</div>
            <div className="text-[10px] text-slate-400">
              {useMockMode ? 'Tryb demonstracyjny (1000 przykładowych zdjęć)' : 'Twoje zdjęcia z bazy SQL'}
            </div>
          </div>
          <button
            onClick={() => onToggleMockMode(!useMockMode)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
              useMockMode
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 hover:bg-blue-600/30'
                : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
            }`}
          >
            {useMockMode ? 'Przełącz na Moje Zdjęcia' : 'Przełącz na Demo'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#232838] bg-[#0c0e17] px-3 shrink-0 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('import')}
            className={`py-2.5 px-3 border-b-2 font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'import'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>⚡ Szybki Import JSON (10s)</span>
          </button>
          <button
            onClick={() => setActiveTab('powershell')}
            className={`py-2.5 px-3 border-b-2 font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'powershell'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>🚀 PowerShell (1 linijka)</span>
          </button>
          <button
            onClick={() => setActiveTab('local')}
            className={`py-2.5 px-3 border-b-2 font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'local'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>💻 Uruchomienie lokalne</span>
          </button>
          <button
            onClick={() => setActiveTab('direct')}
            className={`py-2.5 px-3 border-b-2 font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'direct'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>⚙️ Połączenie Direct</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* TAB 1: Szybki import JSON */}
          {activeTab === 'import' && (
            <div className="space-y-3">
              <div className="bg-[#181c2a] border border-[#272f44] p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Krok 1: Wykonaj w SSMS i skopiuj wynik:</span>
                  <button
                    onClick={handleCopySql}
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20"
                  >
                    {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSql ? 'Skopiowano!' : 'Kopiuj SQL'}</span>
                  </button>
                </div>
                <pre className="bg-[#0b0d14] p-2 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto select-all border border-[#1e2434]">
                  {sqlQueryToCopy}
                </pre>
                <p className="text-[11px] text-slate-400">
                  Wykonaj powyższe zapytanie w <em>SQL Server Management Studio (SSMS)</em>, kliknij wynik (komórkę z JSON) i
                  skopiuj ją (Ctrl+C).
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-200">Krok 2: Wklej JSON poniżej lub wybierz plik:</label>
                  <label className="cursor-pointer flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    <Upload className="w-3 h-3" />
                    <span>Wczytaj z pliku</span>
                    <input type="file" accept=".json,.txt" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder='Wklej tutaj wynik zapytania JSON (np. [{"Id":1, "FileName":"DSC_001.JPG", "Latitude":49.29, "Longitude":19.98, ...}])'
                  rows={4}
                  className="w-full bg-[#151926] border border-[#282f42] rounded-xl p-2.5 font-mono text-[11px] text-slate-200 focus:outline-hidden focus:border-blue-500 placeholder:text-slate-600"
                />
              </div>

              {importMessage && (
                <div
                  className={`p-2.5 rounded-xl border text-[11px] ${
                    importMessage.type === 'success'
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-950/30 border-red-500/30 text-red-300'
                  }`}
                >
                  {importMessage.text}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleImportJson}
                  disabled={isImporting || !jsonText.trim()}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  <span>{isImporting ? 'Importowanie...' : 'Zaimportuj zdjęcia do widoku'}</span>
                </button>

                {isSynced && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-950/20 transition-colors"
                    title="Wyczyść zaimportowane dane"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PowerShell Sync */}
          {activeTab === 'powershell' && (
            <div className="space-y-3">
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Jeśli masz otwarty PowerShell na swoim komputerze, możesz zsynchronizować zdjęcia jednym poleceniem!
                Pobiera ono dane z MSSQL i przesyła je bezpośrednio do tego podglądu w chmurze:
              </p>

              <div className="bg-[#181c2a] border border-[#272f44] p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Kod do wklejenia w konsoli PowerShell:</span>
                  <button
                    onClick={handleCopyPs}
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20"
                  >
                    {copiedPs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPs ? 'Skopiowano!' : 'Kopiuj komendę'}</span>
                  </button>
                </div>
                <pre className="bg-[#0b0d14] p-2.5 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto select-all border border-[#1e2434] leading-relaxed">
                  {psScriptToCopy}
                </pre>
              </div>

              <div className="p-2.5 bg-blue-950/20 border border-blue-500/20 rounded-xl text-[11px] text-blue-200 leading-relaxed">
                ℹ️ <strong>Jak to działa?</strong> PowerShell łączy się z Twoją bazą <code>localhost</code>, wyciąga
                współrzędne GPS i przesyła je protokołem HTTPS pod bezpieczny endpoint tej aplikacji.
              </div>
            </div>
          )}

          {/* TAB 3: Uruchomienie lokalne */}
          {activeTab === 'local' && (
            <div className="space-y-4">
              {/* Sekcja nagłówkowa korzyści */}
              <div className="p-3.5 bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-blue-400 shrink-0" />
                  <h3 className="font-semibold text-xs text-white">
                    Uruchomienie Lokalne — Pełna Wydajność i Bezpośredni Dostęp do Dysku
                  </h3>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Uruchomienie projektu bezpośrednio na Twoim komputerze daje pełnię możliwości systemu:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="bg-[#101420] border border-[#232a3c] p-2 rounded-lg text-slate-300">
                    <strong className="text-emerald-400 block mb-0.5">⚡ Natychmiastowe zapytania SQL</strong>
                    Bezpośrednie połączenie TCP/IP z bazą <code>localhost:1433</code> bez ograniczeń chmury.
                  </div>
                  <div className="bg-[#101420] border border-[#232a3c] p-2 rounded-lg text-slate-300">
                    <strong className="text-amber-400 block mb-0.5">🖼️ Pełny podgląd zdjęć z dysku</strong>
                    Aplikacja otwiera oryginalne pliki JPG prosto ze ścieżek z bazy (np. <code>c:\Moje dokumenty\Zdjęcia\...</code>).
                  </div>
                </div>
              </div>

              {/* Krok 1: Wymagania */}
              <div className="bg-[#151926] border border-[#242b3e] p-3 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-slate-200">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>Wymagania wstępne</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-300">
                  <li>
                    <strong>Node.js 18+ lub 20+</strong> (jeśli nie posiadasz, pobierz instalator LTS z oficjalnej strony{' '}
                    <span className="text-blue-400">nodejs.org</span>).
                  </li>
                  <li>
                    <strong>Microsoft SQL Server</strong> z utworzoną bazą <code>GeoPhotoTracker</code> (oraz tabelą <code>dbo.Photos</code>).
                  </li>
                </ul>
              </div>

              {/* Krok 2: Odblokowanie TCP/IP i Uwierzytelniania w MSSQL */}
              <div className="bg-[#151926] border border-[#242b3e] p-3 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-200">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">2</span>
                  <span>Przygotowanie SQL Server do połączeń Node.js</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Aplikacje Node.js komunikują się z serwerem SQL przez protokół sieciowy TCP/IP:
                </p>
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <div className="p-2 bg-[#0e111a] rounded-lg border border-[#1e2434]">
                    <strong className="text-slate-200">A. Włącz TCP/IP:</strong> Otwórz program <em>SQL Server Configuration Manager</em> →{' '}
                    <em>SQL Server Network Configuration</em> → <em>Protocols for MSSQLSERVER</em> (lub <em>SQLEXPRESS</em>) → ustaw{' '}
                    <strong>TCP/IP: Enabled</strong>. Następnie w <em>SQL Server Services</em> kliknij prawym przyciskiem i zrestartuj usługę SQL Server.
                  </div>
                  <div className="p-2 bg-[#0e111a] rounded-lg border border-[#1e2434]">
                    <strong className="text-slate-200">B. Uwierzytelnianie Mixed Mode:</strong> W <em>SSMS</em> kliknij prawym przyciskiem na serwer →{' '}
                    <em>Properties</em> → <em>Security</em> → wybierz <strong>SQL Server and Windows Authentication mode</strong>. W sekcji{' '}
                    <em>Security → Logins</em> włącz konto <code>sa</code> i nadaj hasło (lub utwórz użytkownika np. <code>geophoto</code>).
                  </div>
                </div>
              </div>

              {/* Krok 3: Plik .env */}
              <div className="bg-[#151926] border border-[#242b3e] p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-slate-200">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Konfiguracja pliku .env</span>
                  </div>
                  <button
                    onClick={handleCopyEnv}
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 transition-colors"
                  >
                    {copiedEnv ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedEnv ? 'Skopiowano!' : 'Kopiuj .env'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  W głównym folderze projektu utwórz plik o nazwie <code>.env</code> i wklej poniższą zawartość:
                </p>
                <pre className="bg-[#0b0d14] p-2.5 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto select-all border border-[#1e2434] leading-relaxed">
                  {envTemplateToCopy}
                </pre>
                <p className="text-[10px] text-slate-500">
                  * Jeśli używasz SQL Server Express, wpisz: <code>MSSQL_SERVER=localhost\SQLEXPRESS</code>
                </p>
              </div>

              {/* Krok 4: Instalacja i Start */}
              <div className="bg-[#151926] border border-[#242b3e] p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-slate-200">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">4</span>
                    <span>Instalacja i Uruchomienie (Terminal / PowerShell)</span>
                  </div>
                  <button
                    onClick={handleCopyCmd}
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 transition-colors"
                  >
                    {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCmd ? 'Skopiowano!' : 'Kopiuj polecenia'}</span>
                  </button>
                </div>
                <pre className="bg-[#0b0d14] p-2.5 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto select-all border border-[#1e2434] leading-relaxed">
                  {devCmdsToCopy}
                </pre>
                <p className="text-[11px] text-slate-300">
                  W konsoli pojawi się komunikat:{' '}
                  <span className="text-emerald-400 font-mono text-[10px]">[MSSQL] Połączono z bazą: localhost/GeoPhotoTracker</span>.
                </p>
              </div>

              {/* Krok 5: Otwarcie w przeglądarce */}
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3 text-[11px] text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Krok 5:</strong> Otwórz w przeglądarce adres{' '}
                    <code className="text-white font-mono bg-emerald-900/40 px-1 py-0.5 rounded border border-emerald-500/30">
                      http://localhost:3000
                    </code>
                  </span>
                </div>
                <span className="text-xs font-semibold text-emerald-400">Gotowe! 🎉</span>
              </div>
            </div>
          )}

          {/* TAB 4: Połączenie Direct */}
          {activeTab === 'direct' && (
            <form onSubmit={handleSaveAndConnect} className="space-y-2.5">
              <p className="text-[11px] text-slate-400">
                Użyj tej opcji, gdy uruchomisz aplikację lokalnie lub wystawisz MSSQL przez tunel (np. ngrok).
              </p>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-400 mb-0.5 block">Serwer / Host</label>
                  <input
                    type="text"
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    placeholder="localhost lub localhost\SQLEXPRESS"
                    className="w-full bg-[#181c28] border border-[#2d3348] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-0.5 block">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full bg-[#181c28] border border-[#2d3348] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 mb-0.5 block">Baza danych</label>
                <input
                  type="text"
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  placeholder="GeoPhotoTracker"
                  className="w-full bg-[#181c28] border border-[#2d3348] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 mb-0.5 block">Użytkownik (SQL Auth)</label>
                  <input
                    type="text"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="sa (puste dla Windows Auth)"
                    className="w-full bg-[#181c28] border border-[#2d3348] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-0.5 block">Hasło</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#181c28] border border-[#2d3348] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {saveMessage && (
                <div
                  className={`text-[11px] text-center p-2 rounded-lg border ${
                    saveMessage.startsWith('Błąd')
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  {saveMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Testowanie połączenia...' : 'Testuj i Zapisz'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0c0e17] border-t border-[#232838] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            {hasPhotos ? `Aktywne zdjęcia: ${status?.totalPhotos}` : 'Wybierz metodę, aby załadować zdjęcia'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[#313648] text-xs font-medium text-slate-300 hover:bg-[#1e222e] hover:text-white transition-colors"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
