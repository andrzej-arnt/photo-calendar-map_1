import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Search, ArrowRight } from 'lucide-react';
import { ZoomLevel } from '../types';

interface JumpToDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  onJump: (date: Date, targetZoom?: ZoomLevel) => void;
}

export const JumpToDateModal: React.FC<JumpToDateModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  onJump,
}) => {
  const [yearInput, setYearInput] = useState(currentDate.getFullYear().toString());
  const [monthInput, setMonthInput] = useState((currentDate.getMonth() + 1).toString());
  const [dayInput, setDayInput] = useState(currentDate.getDate().toString());
  const [hourInput, setHourInput] = useState(currentDate.getHours().toString());
  const [targetZoom, setTargetZoom] = useState<ZoomLevel>('DAYS');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const y = parseInt(yearInput, 10) || currentDate.getFullYear();
    const m = Math.min(12, Math.max(1, parseInt(monthInput, 10) || 1)) - 1;
    const d = Math.min(31, Math.max(1, parseInt(dayInput, 10) || 1));
    const h = Math.min(23, Math.max(0, parseInt(hourInput, 10) || 0));

    const newDate = new Date(y, m, d, h, 0, 0);
    onJump(newDate, targetZoom);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Calendar className="w-5 h-5" />
              <h3>Przejdź do wybranej daty</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Rok</label>
                <input
                  type="number"
                  value={yearInput}
                  onChange={(e) => setYearInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  placeholder="np. 2026"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Miesiąc (1-12)</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={monthInput}
                  onChange={(e) => setMonthInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  placeholder="np. 8"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Dzień (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dayInput}
                  onChange={(e) => setDayInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  placeholder="np. 15"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Godzina (0-23)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={hourInput}
                  onChange={(e) => setHourInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  placeholder="np. 14"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Poziom widoku po przeskoku:
              </label>
              <select
                value={targetZoom}
                onChange={(e) => setTargetZoom(e.target.value as ZoomLevel)}
                className="w-full bg-[#12141c] border border-[#282d3e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              >
                <option value="DECADES">Dziesięciolecia (1970–2060)</option>
                <option value="YEARS">Lata</option>
                <option value="MONTHS">Miesiące</option>
                <option value="TEN_DAYS">Dziesiątki dni</option>
                <option value="DAYS">Dni</option>
                <option value="HOURS">Godziny (Pory dnia: co 6h)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#1e222e] hover:bg-[#282d3d] text-slate-300 text-xs font-medium"
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20"
              >
                <span>Przeskocz teraz</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
