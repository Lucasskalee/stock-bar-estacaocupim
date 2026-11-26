import { FormEvent, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { BeverageItem, CATEGORIES, Category } from '../types/inventory';
import { sanitizeNumber } from '../utils/calculations';

interface BeverageModalProps {
  isOpen: boolean;
  editingItem: BeverageItem | null;
  onClose: () => void;
  onSave: (payload: {
    id?: string;
    nome: string;
    categoria: Category;
    ideal: number | null;
    inicial?: number | null;
  }) => void;
}

export function BeverageModal({
  isOpen,
  editingItem,
  onClose,
  onSave,
}: BeverageModalProps) {
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<Category>('Cerveja');
  const [ideal, setIdeal] = useState('');
  const [inicial, setInicial] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingItem) {
      setNome(editingItem.nome);
      setCategoria(editingItem.categoria);
      setIdeal(editingItem.ideal !== null ? String(editingItem.ideal) : '');
      setInicial(editingItem.inicial !== null ? String(editingItem.inicial) : '');
    } else {
      setNome('');
      setCategoria('Cerveja');
      setIdeal('');
      setInicial('');
    }
    setError('');
    const timer = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(timer);
  }, [isOpen, editingItem]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = nome.trim();
    if (!trimmed) {
      setError('Informe o nome da bebida.');
      return;
    }

    onSave({
      id: editingItem?.id,
      nome: trimmed,
      categoria,
      ideal: sanitizeNumber(ideal),
      inicial: editingItem ? undefined : sanitizeNumber(inicial),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="beverage-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-[#171512] border-t sm:border border-[#FFF4E0]/12 p-5 sm:p-6 pb-safe shadow-2xl">
        {/* Mobile grab handle */}
        <div className="sm:hidden w-10 h-1 rounded-full bg-[#FFF4E0]/20 mx-auto mb-4" />

        <div className="flex items-center justify-between gap-3">
          <h2
            id="beverage-modal-title"
            className="font-display text-xl font-semibold text-[#F5F0E8]"
          >
            {editingItem ? 'Editar bebida' : 'Nova bebida'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#A69D8E] hover:text-[#F5F0E8] hover:bg-[#1F1C18] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="drink-name" className="block text-xs font-medium text-[#A69D8E] mb-1.5">
              Nome da bebida
            </label>
            <input
              ref={inputRef}
              id="drink-name"
              type="text"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ex.: Heineken 600ml"
              className="w-full h-11 px-3.5 rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/12 text-sm text-[#F5F0E8] placeholder:text-[#736B5E] focus:outline-none focus:border-[#D98A2B]"
            />
            {error && <p className="mt-1.5 text-xs text-[#E05A47]">{error}</p>}
          </div>

          <div>
            <label htmlFor="drink-category" className="block text-xs font-medium text-[#A69D8E] mb-1.5">
              Categoria
            </label>
            <select
              id="drink-category"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as Category)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/12 text-sm text-[#F5F0E8] focus:outline-none focus:border-[#D98A2B]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-[#171512] text-[#F5F0E8]">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className={`grid gap-3 ${editingItem ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div>
              <label htmlFor="drink-ideal" className="block text-xs font-medium text-[#A69D8E] mb-1.5">
                Estoque ideal
              </label>
              <input
                id="drink-ideal"
                type="number"
                inputMode="numeric"
                min={0}
                value={ideal}
                onChange={(e) => setIdeal(e.target.value)}
                placeholder="Ex.: 48"
                className="w-full h-11 px-3.5 rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/12 font-mono text-sm tabular-nums text-[#F5F0E8] placeholder:text-[#736B5E] focus:outline-none focus:border-[#D98A2B]"
              />
            </div>

            {!editingItem && (
              <div>
                <label htmlFor="drink-initial" className="block text-xs font-medium text-[#A69D8E] mb-1.5">
                  Inicial (opcional)
                </label>
                <input
                  id="drink-initial"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={inicial}
                  onChange={(e) => setInicial(e.target.value)}
                  placeholder="Ex.: 48"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/12 font-mono text-sm tabular-nums text-[#F5F0E8] placeholder:text-[#736B5E] focus:outline-none focus:border-[#D98A2B]"
                />
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1F1C18] hover:bg-[#27231D] text-sm font-medium text-[#A69D8E] hover:text-[#F5F0E8] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#D98A2B] hover:bg-[#E89B3C] text-sm font-semibold text-[#0E0D0B] transition-colors cursor-pointer"
            >
              {editingItem ? 'Salvar alterações' : 'Adicionar bebida'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
