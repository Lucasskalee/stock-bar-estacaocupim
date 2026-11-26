import { Minus, Plus } from 'lucide-react';
import { sanitizeNumber } from '../utils/calculations';

interface NumberStepperProps {
  value: number | null;
  onChange: (next: number | null) => void;
  ariaLabel: string;
  size?: 'compact' | 'touch';
  placeholder?: string;
}

export function NumberStepper({
  value,
  onChange,
  ariaLabel,
  size = 'compact',
  placeholder = '—',
}: NumberStepperProps) {
  const handleDecrement = () => {
    if (value === null || value <= 0) {
      onChange(0);
      return;
    }
    onChange(value - 1);
  };

  const handleIncrement = () => {
    if (value === null) {
      onChange(1);
      return;
    }
    onChange(value + 1);
  };

  if (size === 'touch') {
    return (
      <div className="flex items-center rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/10 overflow-hidden focus-within:border-[#D98A2B]/70 transition-colors">
        <button
          type="button"
          onClick={handleDecrement}
          aria-label={`Diminuir ${ariaLabel}`}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#A69D8E] hover:text-[#F5F0E8] hover:bg-[#1F1C18] active:bg-[#27231D] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D98A2B]"
        >
          <Minus className="w-4 h-4" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          aria-label={ariaLabel}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={(e) => onChange(sanitizeNumber(e.target.value))}
          className="w-full min-w-[42px] h-[44px] bg-transparent text-center font-mono text-base font-semibold tabular-nums text-[#F5F0E8] placeholder:text-[#736B5E] focus:outline-none"
        />
        <button
          type="button"
          onClick={handleIncrement}
          aria-label={`Aumentar ${ariaLabel}`}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#D98A2B] hover:text-[#E89B3C] hover:bg-[#1F1C18] active:bg-[#27231D] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D98A2B]"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center rounded-lg bg-[#0E0D0B] border border-[#FFF4E0]/10 overflow-hidden focus-within:border-[#D98A2B]/70 transition-colors">
      <button
        type="button"
        onClick={handleDecrement}
        aria-label={`Diminuir ${ariaLabel}`}
        className="w-7 h-8 flex items-center justify-center text-[#A69D8E] hover:text-[#F5F0E8] hover:bg-[#1F1C18] active:bg-[#27231D] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D98A2B]"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(e) => onChange(sanitizeNumber(e.target.value))}
        className="w-12 h-8 bg-transparent text-center font-mono text-sm font-medium tabular-nums text-[#F5F0E8] placeholder:text-[#736B5E] focus:outline-none"
      />
      <button
        type="button"
        onClick={handleIncrement}
        aria-label={`Aumentar ${ariaLabel}`}
        className="w-7 h-8 flex items-center justify-center text-[#D98A2B] hover:text-[#E89B3C] hover:bg-[#1F1C18] active:bg-[#27231D] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D98A2B]"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
