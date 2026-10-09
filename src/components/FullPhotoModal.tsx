import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { PhotoEvent } from '../types';

interface FullPhotoModalProps {
  photo: PhotoEvent | null;
  photosList?: PhotoEvent[];
  onClose: () => void;
  onSelectPhoto?: (photo: PhotoEvent) => void;
}

export const FullPhotoModal: React.FC<FullPhotoModalProps> = ({
  photo,
  onClose,
}) => {
  const mountTimeRef = useRef<number>(0);
  const isClosingRef = useRef<boolean>(false);
  const hasEnteredPhotoRef = useRef<boolean>(false);

  useEffect(() => {
    if (photo) {
      mountTimeRef.current = Date.now();
      isClosingRef.current = false;
      hasEnteredPhotoRef.current = false;
    }
  }, [photo]);

  // Handle closing safely
  const triggerClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    onClose();
  }, [onClose]);

  // Keyboard navigation: Escape key, 'x', or 'X' closes the popup
  useEffect(() => {
    if (!photo) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' ||
        e.key === 'Esc' ||
        e.key === 'x' ||
        e.key === 'X'
      ) {
        e.preventDefault();
        triggerClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photo, triggerClose]);

  // When moving mouse outside the photo on transparent background, close the popup
  const handleOutsideMouseMove = useCallback(() => {
    // 200ms initial grace period so it doesn't dismiss in the exact instant of opening
    if (Date.now() - mountTimeRef.current > 200) {
      triggerClose();
    }
  }, [triggerClose]);

  if (!photo) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-auto overflow-hidden">
        {/* Transparent backdrop - DOES NOT DARKEN OR COVER THE MAP */}
        <div
          onClick={triggerClose}
          onMouseMove={handleOutsideMouseMove}
          className="absolute inset-0 bg-transparent cursor-default"
          title="Kliknij lub przejedź myszką, aby zamknąć podgląd"
        />

        {/* Compact Photo Window: sized directly to the photo, keeping the entire map visible behind */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 10 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          onMouseEnter={() => {
            hasEnteredPhotoRef.current = true;
          }}
          onMouseLeave={() => {
            // Moving mouse outside the photo immediately closes the popup
            triggerClose();
          }}
          className="relative z-10 w-[440px] sm:w-[480px] max-w-[92vw] max-h-[85vh] flex flex-col rounded-2xl overflow-hidden border-2 border-orange-500/80 bg-[#0d101a] shadow-[0_20px_50px_rgba(0,0,0,0.85)] select-none group"
        >
          {/* Close button X (Esc or x) */}
          <button
            onClick={triggerClose}
            className="absolute top-2.5 right-2.5 z-30 w-7 h-7 rounded-full bg-slate-950/85 hover:bg-orange-500 text-slate-200 hover:text-slate-950 border border-slate-700/80 shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 backdrop-blur-xs"
            title="Zamknij (Klawisz Esc lub X)"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Photo Display */}
          <div className="relative w-full bg-black overflow-hidden flex items-center justify-center">
            <img
              src={photo.imageUrl}
              alt={photo.title}
              className="w-full h-auto max-h-[380px] sm:max-h-[420px] object-cover block"
            />
          </div>

          {/* Discrete Minimal Caption at bottom */}
          <div className="px-3.5 py-2.5 bg-[#121522] border-t border-[#252a3b] flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-xs sm:text-sm text-orange-400 truncate">
                {photo.title}
              </span>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                {format(photo.timestamp, 'd MMM yyyy, HH:mm', { locale: pl })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{photo.locationName}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
