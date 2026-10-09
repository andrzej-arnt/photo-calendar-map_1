import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Camera,
  Plus,
  ZoomIn,
  Sparkles,
  Layers,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CellInfo, PhotoEvent, ZoomLevel } from '../types';
import { getMockPhotosForCell, ZOOM_LEVEL_LABELS } from '../utils/dateUtils';

interface CellDetailModalProps {
  cell: CellInfo | null;
  zoomLevel: ZoomLevel;
  onClose: () => void;
  onZoomIntoCell: (cell: CellInfo) => void;
  onOpenFullPhoto?: (photo: PhotoEvent) => void;
}

export const CellDetailModal: React.FC<CellDetailModalProps> = ({
  cell,
  zoomLevel,
  onClose,
  onZoomIntoCell,
  onOpenFullPhoto,
}) => {
  const [activeTab, setActiveTab] = useState<'photos' | 'events' | 'notes'>('photos');
  const [notes, setNotes] = useState<string>('');
  const [userEvents, setUserEvents] = useState<string[]>([]);
  const [newEventInput, setNewEventInput] = useState('');
  const hoverPhotoTimerRef = React.useRef<any>(null);

  if (!cell) return null;

  const mockPhotos: PhotoEvent[] = getMockPhotosForCell(cell);

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventInput.trim()) return;
    setUserEvents([...userEvents, newEventInput.trim()]);
    setNewEventInput('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#222634] bg-[#12141c] flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Kwadrat #{cell.index + 1} ({ZOOM_LEVEL_LABELS[zoomLevel].name})
                </span>
                {cell.isCurrent && (
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-orange-500 text-slate-950">
                    AKTUALNY MOMENT
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">{cell.label}</h2>
              <p className="text-xs text-slate-400 flex items-center gap-2 font-mono">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <span>
                  Od: {format(cell.startDate, 'd MMMM yyyy, HH:mm', { locale: pl })} — Do:{' '}
                  {format(cell.endDate, 'd MMMM yyyy, HH:mm', { locale: pl })}
                </span>
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#1e222e] hover:bg-[#282d3d] text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drill Down Callout Button */}
          <div className="p-3 px-5 bg-[#181b24] border-b border-[#252a38] flex items-center justify-between gap-3">
            <div className="text-xs text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
              <span>Chcesz obejrzeć szczegóły dla tego kwadratu na niższym poziomie czasu?</span>
            </div>
            <button
              onClick={() => {
                onZoomIntoCell(cell);
                onClose();
              }}
              disabled={zoomLevel === 'HOURS'}
              className="px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shrink-0"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Wejdź w ten kwadrat (Zoom IN)</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 gap-4 text-xs font-medium text-slate-400 pt-2">
            <button
              onClick={() => setActiveTab('photos')}
              className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'photos'
                  ? 'border-amber-400 text-amber-300 font-bold'
                  : 'border-transparent hover:text-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Zdjęcia i Mapa ({mockPhotos.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('events')}
              className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'events'
                  ? 'border-amber-400 text-amber-300 font-bold'
                  : 'border-transparent hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Wydarzenia ({userEvents.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'notes'
                  ? 'border-amber-400 text-amber-300 font-bold'
                  : 'border-transparent hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Notatki</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {activeTab === 'photos' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Podgląd zebranych kadrów w wybranym przedziale (korelacja z mapą w kolejnym etapie):
                  </p>
                  {cell.locations && cell.locations.length > 0 && (
                    <span className="text-xs font-semibold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/60 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-indigo-400" />
                      {cell.locations.join(', ')}
                    </span>
                  )}
                </div>

                {mockPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {mockPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        onClick={() => {
                          if (hoverPhotoTimerRef.current) clearTimeout(hoverPhotoTimerRef.current);
                          onOpenFullPhoto?.(photo);
                        }}
                        onMouseEnter={() => {
                          if (hoverPhotoTimerRef.current) clearTimeout(hoverPhotoTimerRef.current);
                          hoverPhotoTimerRef.current = setTimeout(() => {
                            onOpenFullPhoto?.(photo);
                          }, 500);
                        }}
                        onMouseLeave={() => {
                          if (hoverPhotoTimerRef.current) {
                            clearTimeout(hoverPhotoTimerRef.current);
                            hoverPhotoTimerRef.current = null;
                          }
                        }}
                        className="group relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video shadow-md hover:border-amber-400 transition-all cursor-pointer"
                        title="Kliknij lub zatrzymaj kursor na 0,5 sek., aby otworzyć pełne zdjęcie"
                      >
                        <img
                          src={photo.imageUrl}
                          alt={photo.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity p-2.5 flex flex-col justify-end">
                          <span className="text-xs font-semibold text-white truncate flex items-center justify-between gap-1">
                            <span className="truncate">{photo.title}</span>
                            <span className="text-[10px] text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">🔍</span>
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-amber-400" />
                            {photo.locationName}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60 space-y-2">
                    <Camera className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
                    <p className="text-xs">Brak zarejestrowanych zdjęć w tym przedziale czasu.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'events' && (
              <div className="space-y-4">
                <form onSubmit={handleAddEvent} className="flex gap-2">
                  <input
                    type="text"
                    value={newEventInput}
                    onChange={(e) => setNewEventInput(e.target.value)}
                    placeholder="Wpisz nowe wydarzenie lub przypomnienie..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Dodaj
                  </button>
                </form>

                {userEvents.length > 0 ? (
                  <div className="space-y-2">
                    {userEvents.map((ev, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 flex items-center justify-between"
                      >
                        <span>{ev}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Dodano teraz</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-6">
                    Brak przypisanych wydarzeń. Wpisz treść powyżej, aby dodać.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tutaj możesz wpisać dowolne notatki powiązane z tym okresem czasu..."
                  rows={5}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                />
                <div className="text-[10px] text-slate-500 text-right">Notatka jest automatycznie zapisywana.</div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
