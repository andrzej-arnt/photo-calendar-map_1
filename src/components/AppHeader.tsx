import React from 'react';
import { Camera, Sparkles, FolderUp } from 'lucide-react';

interface AppHeaderProps {
  onStartExifExtraction: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onStartExifExtraction }) => {
  return (
    <header className="w-full bg-[#12141e]/95 backdrop-blur-md border-b border-[#222634] px-4 py-3 sticky top-0 z-30 shadow-2xl text-slate-100">
      <div className="w-full max-w-[1600px] mx-auto flex items-center justify-between gap-4">
        {/* Left Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(249,115,22,0.5)]">
            <Camera className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100">
              GeoPhoto Tracker
            </h1>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Analiza Czasowo-Przestrzenna Zdjęć EXIF & Geoprzestrzenna Heatmapa
            </p>
          </div>
        </div>

        {/* Right Action Button matching screenshot */}
        <button
          onClick={onStartExifExtraction}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#191d2c] hover:bg-[#22283a] border-2 border-orange-500 text-orange-400 text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all hover:scale-105 active:scale-95"
        >
          <FolderUp className="w-4 h-4 text-orange-400" />
          <span>[ Rozpocznij Ekstrakcję EXIF ]</span>
        </button>
      </div>
    </header>
  );
};
