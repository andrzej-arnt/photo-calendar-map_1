import React, { useState } from 'react';
import { X, FolderUp, CheckCircle, RefreshCw, FileText, MapPin, Camera } from 'lucide-react';

interface ExifExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: () => void;
}

export const ExifExtractionModal: React.FC<ExifExtractionModalProps> = ({
  isOpen,
  onClose,
  onScanComplete,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);

  if (!isOpen) return null;

  const handleStartScan = () => {
    setIsScanning(true);
    setScannedCount(0);
    let current = 0;
    const interval = setInterval(() => {
      current += 85;
      if (current >= 1000) {
        setScannedCount(1000);
        setIsScanning(false);
        clearInterval(interval);
        setTimeout(() => {
          onScanComplete();
        }, 600);
      } else {
        setScannedCount(current);
      }
    }, 120);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#141724] border border-[#272c3d] rounded-2xl w-full max-w-md p-5 shadow-2xl relative text-slate-100 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#252a3a] pb-3">
          <div className="flex items-center gap-2">
            <FolderUp className="w-5 h-5 text-orange-400" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-100">
              Ekstrakcja Metadanych EXIF
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-3">
          <p className="text-xs text-slate-300">
            Wybierz pliki ze zdjęciami z dysku lub przeanalizuj lokalny katalog pod kątem znaczników czasowo-przestrzennych EXIF.
          </p>

          <div className="bg-[#1a1e2e] border-2 border-dashed border-[#2d344a] hover:border-orange-500/60 rounded-xl p-6 text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group">
            <Camera className="w-8 h-8 text-orange-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-slate-200">Upuść pliki JPG/TIFF z EXIF lub kliknij</span>
            <span className="text-[10px] text-slate-400 font-mono">Wykrywanie: GPS Latitude/Longitude, Timestamp, Aparat</span>
          </div>

          {/* Scanning Progress */}
          {isScanning && (
            <div className="space-y-2 bg-[#191d2c] p-3 rounded-xl border border-[#2b3246]">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-orange-400 font-bold flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Skanowanie EXIF...
                </span>
                <span className="text-slate-300">{scannedCount} / 1000 plików</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-150"
                  style={{ width: `${(scannedCount / 1000) * 100}%` }}
                />
              </div>
            </div>
          )}

          {!isScanning && scannedCount === 1000 && (
            <div className="bg-emerald-500/10 border border-emerald-500/40 p-3 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Pomyślnie wyekstrahowano metadane EXIF dla 1000 zdjęć! Mapa oraz siatka zostały zaktualizowane.</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[#252a3a]">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-[#1c2030] hover:bg-[#252b40] text-xs font-medium text-slate-300 transition-colors"
          >
            Zamknij
          </button>
          <button
            onClick={handleStartScan}
            disabled={isScanning}
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-orange-500/30 disabled:opacity-50"
          >
            {isScanning ? 'Skanowanie...' : 'Uruchom Ekstrakcję'}
          </button>
        </div>
      </div>
    </div>
  );
};
