import { useEffect, useState } from 'react';
import { Calendar, X } from 'lucide-react';
import {
  formatBusinessDateShort,
  getNextBusinessDate,
  InventorySummary,
  isClosingAfterMidnight,
} from '../utils/calculations';

interface NewShiftModalProps {
  isOpen: boolean;
  summary: InventorySummary;
  dataOperacional: string;
  onClose: () => void;
  onConfirm: (payload: {
    saveToHistory: boolean;
    closingDate: string;
    nextShiftDate: string;
  }) => void;
}

export function NewShiftModal({
  isOpen,
  summary,
  dataOperacional,
  onClose,
  onConfirm,
}: NewShiftModalProps) {
  const [saveHistory, setSaveHistory] = useState(true);
  const [closingDate, setClosingDate] = useState(dataOperacional);
  const [nextShiftDate, setNextShiftDate] = useState(() =>
    getNextBusinessDate(dataOperacional, new Date())
  );

  useEffect(() => {
    if (!isOpen) return;
    setSaveHistory(true);
    setClosingDate(dataOperacional);
    setNextShiftDate(getNextBusinessDate(dataOperacional, new Date()));

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, dataOperacional, onClose]);

  if (!isOpen) return null;

  const afterMidnight = isClosingAfterMidnight(closingDate, new Date());

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-shift-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-[#171512] border-t sm:border border-[#FFF4E0]/12 p-5 sm:p-6 pb-safe shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="new-shift-title" className="font-display text-xl font-semibold text-[#F5F0E8]">
              Fechar turno de {formatBusinessDateShort(closingDate)}
            </h2>
            <p className="mt-1 text-sm text-[#A69D8E]">
              O estoque final contado passa a ser o estoque inicial do próximo turno.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#A69D8E] hover:text-[#F5F0E8] hover:bg-[#1F1C18] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/8 divide-x divide-[#FFF4E0]/8">
          <div className="p-3 text-center">
            <p className="text-[11px] text-[#A69D8E]">Conferidos</p>
            <p className="mt-1 font-mono text-base font-semibold tabular-nums text-[#F5F0E8]">
              {summary.itensConferidos}/{summary.totalItens}
            </p>
          </div>
          <div className="p-3 text-center">
            <p className="text-[11px] text-[#A69D8E]">Consumo</p>
            <p className="mt-1 font-mono text-base font-semibold tabular-nums text-[#F5F0E8]">
              {summary.totalConsumo} un
            </p>
          </div>
          <div className="p-3 text-center">
            <p className="text-[11px] text-[#A69D8E]">A pedir</p>
            <p className="mt-1 font-mono text-base font-semibold tabular-nums text-[#D98A2B]">
              {summary.totalUnidadesPedir} un
            </p>
          </div>
        </div>

        {/* Operational date confirmation (handles after-midnight closing cleanly) */}
        <div className="space-y-3 rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/8 p-3.5">
          <div className="flex items-center gap-2 text-xs text-[#D98A2B] font-medium">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>
              {afterMidnight
                ? 'Fechamento após 00:00 — registrado no mesmo dia da abertura'
                : 'Data operacional do fechamento'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="closing-shift-date" className="block text-[11px] text-[#A69D8E] mb-1">
                Dia deste fechamento
              </label>
              <input
                id="closing-shift-date"
                type="date"
                value={closingDate}
                onChange={(e) => {
                  if (e.target.value) setClosingDate(e.target.value);
                }}
                className="w-full h-10 px-2.5 rounded-lg bg-[#171512] border border-[#FFF4E0]/12 font-mono text-xs tabular-nums text-[#F5F0E8] focus:outline-none focus:border-[#D98A2B] [color-scheme:dark]"
              />
            </div>

            <div>
              <label htmlFor="next-shift-date" className="block text-[11px] text-[#A69D8E] mb-1">
                Próximo turno
              </label>
              <input
                id="next-shift-date"
                type="date"
                value={nextShiftDate}
                onChange={(e) => {
                  if (e.target.value) setNextShiftDate(e.target.value);
                }}
                className="w-full h-10 px-2.5 rounded-lg bg-[#171512] border border-[#FFF4E0]/12 font-mono text-xs tabular-nums text-[#F5F0E8] focus:outline-none focus:border-[#D98A2B] [color-scheme:dark]"
              />
            </div>
          </div>
        </div>

        <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#1F1C18] border border-[#FFF4E0]/8 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={saveHistory}
            onChange={(e) => setSaveHistory(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#D98A2B] rounded cursor-pointer"
          />
          <span className="text-sm text-[#F5F0E8] leading-snug">
            Salvar fechamento no histórico de turnos
            <span className="block text-xs text-[#A69D8E] mt-0.5">
              Fica gravado na data de abertura ({formatBusinessDateShort(closingDate)}).
            </span>
          </span>
        </label>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1F1C18] hover:bg-[#27231D] text-sm font-medium text-[#A69D8E] hover:text-[#F5F0E8] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() =>
              onConfirm({
                saveToHistory: saveHistory,
                closingDate,
                nextShiftDate,
              })
            }
            className="min-h-[44px] px-5 py-2 rounded-xl bg-[#D98A2B] hover:bg-[#E89B3C] text-sm font-semibold text-[#0E0D0B] transition-colors cursor-pointer"
          >
            Confirmar virada
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmActionModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmActionModal({
  isOpen,
  title,
  description,
  confirmLabel,
  destructive = false,
  onClose,
  onConfirm,
}: ConfirmActionModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-action-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-[#171512] border-t sm:border border-[#FFF4E0]/12 p-5 sm:p-6 pb-safe shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2 id="confirm-action-title" className="font-display text-lg font-semibold text-[#F5F0E8]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-[#A69D8E] hover:text-[#F5F0E8] hover:bg-[#1F1C18] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-[#A69D8E] leading-relaxed">{description}</p>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1F1C18] hover:bg-[#27231D] text-sm font-medium text-[#A69D8E] hover:text-[#F5F0E8] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`min-h-[44px] px-5 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              destructive
                ? 'bg-[#E05A47] hover:bg-[#EB6B59] text-[#0E0D0B]'
                : 'bg-[#D98A2B] hover:bg-[#E89B3C] text-[#0E0D0B]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
