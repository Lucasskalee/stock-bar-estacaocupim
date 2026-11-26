import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import {
  BeverageItem,
  CATEGORIES,
  Category,
  ChecklistStage,
} from '../types/inventory';
import {
  calcConsumo,
  calcPedido,
  computeSummary,
  formatNullableNum,
  getItemStatus,
  isFinalChecked,
  isInitialChecked,
} from '../utils/calculations';
import { NumberStepper } from './NumberStepper';

interface ChecklistViewProps {
  items: BeverageItem[];
  stage: ChecklistStage;
  onChangeStage: (stage: ChecklistStage) => void;
  onUpdateField: (id: string, field: 'inicial' | 'final' | 'ideal', value: number | null) => void;
  onToggleCheck: (id: string, stage: 'inicial' | 'final') => void;
  onEditItem: (item: BeverageItem) => void;
  onRequestDelete: (item: BeverageItem) => void;
  onOpenAddModal: () => void;
  onLoadStarter: () => void;
  onGoToOrders: () => void;
}

export function ChecklistView({
  items,
  stage,
  onChangeStage,
  onUpdateField,
  onToggleCheck,
  onEditItem,
  onRequestDelete,
  onOpenAddModal,
  onLoadStarter,
  onGoToOrders,
}: ChecklistViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Todas'>('Todas');
  const [onlyPending, setOnlyPending] = useState(false);

  const summary = useMemo(() => computeSummary(items), [items]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Todas: items.length };
    for (const cat of CATEGORIES) counts[cat] = 0;
    for (const item of items) counts[item.categoria] = (counts[item.categoria] ?? 0) + 1;
    return counts;
  }, [items]);

  const activeDoneCount =
    stage === 'inicial' ? summary.itensInicialConferidos : summary.itensConferidos;
  const activePct =
    summary.totalItens > 0 ? Math.round((activeDoneCount / summary.totalItens) * 100) : 0;
  const pendingCount = Math.max(0, summary.totalItens - activeDoneCount);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedCategory !== 'Todas' && item.categoria !== selectedCategory) return false;
      if (onlyPending) {
        if (stage === 'inicial' && isInitialChecked(item)) return false;
        if (stage === 'final' && isFinalChecked(item)) return false;
        if (stage === 'completa') {
          const p = calcPedido(item);
          if (p === null || p <= 0) return false;
        }
      }
      if (q && !item.nome.toLowerCase().includes(q) && !item.categoria.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [items, searchQuery, selectedCategory, onlyPending, stage]);

  const filteredTotals = useMemo(() => computeSummary(filteredItems), [filteredItems]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-[#171512] border border-[#FFF4E0]/8 px-6 py-14 text-center max-w-2xl mx-auto">
        <h2 className="font-display text-2xl font-semibold text-[#F5F0E8] text-balance">
          Seu checklist está vazio
        </h2>
        <p className="mt-2 text-sm text-[#A69D8E] max-w-md mx-auto">
          Toque no botão + central para cadastrar suas bebidas ou carregue o cardápio inicial da casa.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#D98A2B] hover:bg-[#E89B3C] text-[#0E0D0B] text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Adicionar bebida
          </button>
          <button
            type="button"
            onClick={onLoadStarter}
            className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1F1C18] hover:bg-[#27231D] border border-[#FFF4E0]/10 text-[#F5F0E8] text-sm font-medium transition-colors whitespace-nowrap cursor-pointer"
          >
            Carregar cardápio exemplo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stage Switcher: 01. Estoque Inicial | 02. Estoque Final | Planilha Geral */}
      <section className="rounded-2xl bg-[#171512] border border-[#FFF4E0]/8 p-4 sm:p-5 space-y-4">
        <div
          role="tablist"
          aria-label="Etapa do checklist de contagem"
          className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/8"
        >
          <button
            type="button"
            role="tab"
            aria-selected={stage === 'inicial'}
            onClick={() => {
              onChangeStage('inicial');
              setOnlyPending(false);
            }}
            className={`min-h-[44px] px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              stage === 'inicial'
                ? 'bg-[#D98A2B] text-[#0E0D0B] font-semibold'
                : 'text-[#A69D8E] hover:text-[#F5F0E8]'
            }`}
          >
            1. Inicial
            <span
              className={`ml-1.5 font-mono text-[11px] tabular-nums hidden sm:inline ${
                stage === 'inicial' ? 'text-[#0E0D0B]/75' : 'text-[#736B5E]'
              }`}
            >
              {summary.itensInicialConferidos}/{summary.totalItens}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={stage === 'final'}
            onClick={() => {
              onChangeStage('final');
              setOnlyPending(false);
            }}
            className={`min-h-[44px] px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              stage === 'final'
                ? 'bg-[#D98A2B] text-[#0E0D0B] font-semibold'
                : 'text-[#A69D8E] hover:text-[#F5F0E8]'
            }`}
          >
            2. Final
            <span
              className={`ml-1.5 font-mono text-[11px] tabular-nums hidden sm:inline ${
                stage === 'final' ? 'text-[#0E0D0B]/75' : 'text-[#736B5E]'
              }`}
            >
              {summary.itensConferidos}/{summary.totalItens}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={stage === 'completa'}
            onClick={() => {
              onChangeStage('completa');
              setOnlyPending(false);
            }}
            className={`min-h-[44px] px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              stage === 'completa'
                ? 'bg-[#D98A2B] text-[#0E0D0B] font-semibold'
                : 'text-[#A69D8E] hover:text-[#F5F0E8]'
            }`}
          >
            Planilha geral
          </button>
        </div>

        {/* Focused Progress Strip for Checklist stages */}
        {stage !== 'completa' ? (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[#A69D8E]">
                {stage === 'inicial'
                  ? 'Abertura do dia — confira o estoque inicial antes de abrir o salão'
                  : 'Fechamento do dia — informe o estoque final para calcular consumo e pedido'}
              </span>
              <span className="font-mono font-semibold tabular-nums text-[#F5F0E8]">
                {activeDoneCount}/{summary.totalItens} conferidos ({activePct}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#0E0D0B] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${activePct}%`,
                  backgroundColor: activePct === 100 ? '#4CA975' : '#D98A2B',
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#A69D8E]">
            <span>Visão completa de inicial, final, consumo, ideal e pedido sugerido.</span>
            <span className="font-mono tabular-nums text-[#D98A2B] font-semibold">
              {summary.totalUnidadesPedir} un a pedir · {summary.totalConsumo} un consumidas
            </span>
          </div>
        )}
      </section>

      {/* Search & Category Filter Bar */}
      <section aria-label="Filtros do checklist" className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="w-4 h-4 text-[#736B5E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar bebida no checklist..."
              aria-label="Buscar bebida"
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#171512] border border-[#FFF4E0]/10 text-sm text-[#F5F0E8] placeholder:text-[#736B5E] focus:outline-none focus:border-[#D98A2B]/70 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#A69D8E] hover:text-[#F5F0E8] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOnlyPending((prev) => !prev)}
            aria-pressed={onlyPending}
            className={`min-h-[44px] px-4 py-2 rounded-xl border text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              onlyPending
                ? 'bg-[#D98A2B]/15 border-[#D98A2B]/50 text-[#F5F0E8]'
                : 'bg-[#171512] border-[#FFF4E0]/10 text-[#A69D8E] hover:text-[#F5F0E8]'
            }`}
          >
            {stage === 'completa'
              ? `Só para repor (${summary.itensParaRepor})`
              : `Só pendentes (${pendingCount})`}
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(['Todas', ...CATEGORIES] as const).map((cat) => {
            const count = categoryCounts[cat] ?? 0;
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#D98A2B] text-[#0E0D0B] font-semibold'
                    : 'bg-[#171512] text-[#A69D8E] hover:text-[#F5F0E8] border border-[#FFF4E0]/8'
                }`}
              >
                {cat}
                <span
                  className={`ml-1.5 font-mono tabular-nums ${
                    active ? 'text-[#0E0D0B]/75' : 'text-[#736B5E]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Filtered Empty State */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl bg-[#171512] border border-[#FFF4E0]/8 px-6 py-10 text-center">
          <p className="text-base font-medium text-[#F5F0E8]">
            {onlyPending && stage !== 'completa'
              ? 'Todas as bebidas desta etapa já foram conferidas'
              : 'Nenhuma bebida encontrada'}
          </p>
          <p className="mt-1 text-sm text-[#A69D8E]">
            {onlyPending && stage === 'inicial'
              ? 'Você já pode avançar para a contagem do estoque final.'
              : onlyPending && stage === 'final'
                ? 'Agora você já pode conferir o pedido sugerido para reposição.'
                : 'Limpe os filtros para ver todas as bebidas.'}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('Todas');
                setOnlyPending(false);
              }}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#1F1C18] hover:bg-[#27231D] border border-[#FFF4E0]/10 text-sm font-medium text-[#F5F0E8] cursor-pointer"
            >
              Mostrar todas
            </button>
            {onlyPending && stage === 'inicial' && (
              <button
                type="button"
                onClick={() => {
                  onChangeStage('final');
                  setOnlyPending(false);
                }}
                className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 rounded-xl bg-[#D98A2B] hover:bg-[#E89B3C] text-sm font-semibold text-[#0E0D0B] cursor-pointer"
              >
                Ir para Estoque Final
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {onlyPending && stage === 'final' && (
              <button
                type="button"
                onClick={onGoToOrders}
                className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 rounded-xl bg-[#D98A2B] hover:bg-[#E89B3C] text-sm font-semibold text-[#0E0D0B] cursor-pointer"
              >
                Ver Pedido Sugerido
                <ShoppingBag className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : stage !== 'completa' ? (
        /* FOCUSED CHECKLIST MODE (INICIAL OR FINAL) */
        <div className="rounded-2xl bg-[#171512] border border-[#FFF4E0]/8 divide-y divide-[#FFF4E0]/8 overflow-hidden">
          {filteredItems.map((item) => {
            const checked = stage === 'inicial' ? isInitialChecked(item) : isFinalChecked(item);
            const currentVal = stage === 'inicial' ? item.inicial : item.final;
            const consumo = calcConsumo(item);
            const pedido = calcPedido(item);

            return (
              <div
                key={item.id}
                className={`p-4 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  checked ? 'bg-[#141210]/70' : 'bg-[#171512]'
                }`}
              >
                {/* Left: Checkbox + Beverage Info */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    aria-label={
                      checked
                        ? `Desmarcar ${item.nome} como conferido`
                        : `Marcar ${item.nome} como conferido`
                    }
                    onClick={() => onToggleCheck(item.id, stage)}
                    className={`mt-0.5 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] rounded-xl flex items-center justify-center border transition-colors shrink-0 cursor-pointer ${
                      checked
                        ? 'bg-[#4CA975] border-[#4CA975] text-[#0E0D0B]'
                        : 'bg-[#0E0D0B] border-[#FFF4E0]/20 text-transparent hover:border-[#D98A2B]'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className={`text-sm sm:text-base font-semibold leading-snug truncate ${
                          checked ? 'text-[#A69D8E]' : 'text-[#F5F0E8]'
                        }`}
                      >
                        {item.nome}
                      </h3>

                      {/* Mobile edit/delete quick icons */}
                      <div className="flex sm:hidden items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onEditItem(item)}
                          aria-label={`Editar ${item.nome}`}
                          className="w-9 h-9 flex items-center justify-center rounded-lg text-[#736B5E] hover:text-[#F5F0E8]"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestDelete(item)}
                          aria-label={`Remover ${item.nome}`}
                          className="w-9 h-9 flex items-center justify-center rounded-lg text-[#736B5E] hover:text-[#E05A47]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#A69D8E]">
                      <span>{item.categoria}</span>
                      <span aria-hidden="true">·</span>
                      {stage === 'inicial' ? (
                        <span className="font-mono tabular-nums">
                          Ideal {formatNullableNum(item.ideal)}
                        </span>
                      ) : (
                        <>
                          <span className="font-mono tabular-nums">
                            Inicial {formatNullableNum(item.inicial)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-[#F5F0E8]">
                            Consumo {formatNullableNum(consumo)}
                          </span>
                          {pedido !== null && pedido > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums font-semibold text-[#E05A47]">
                                Pedir +{pedido}
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Tactile Counter Stepper + Desktop Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pl-[58px] sm:pl-0">
                  <div className="w-full sm:w-40">
                    <NumberStepper
                      value={currentVal}
                      onChange={(val) => onUpdateField(item.id, stage, val)}
                      ariaLabel={`${stage === 'inicial' ? 'Estoque inicial' : 'Estoque final'} de ${item.nome}`}
                      size="touch"
                    />
                  </div>

                  <div className="hidden sm:flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditItem(item)}
                      aria-label={`Editar ${item.nome}`}
                      className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-[#A69D8E] hover:text-[#F5F0E8] hover:bg-[#27231D] transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDelete(item)}
                      aria-label={`Remover ${item.nome}`}
                      className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-[#A69D8E] hover:text-[#E05A47] hover:bg-[#E05A47]/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* FULL SPREADSHEET MODE (PLANILHA GERAL) */
        <div className="rounded-2xl bg-[#171512] border border-[#FFF4E0]/8 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[700px]">
              <thead>
                <tr className="border-b border-[#FFF4E0]/8 text-xs font-medium text-[#A69D8E] bg-[#141210]">
                  <th className="py-3.5 pl-5 pr-3">Bebida</th>
                  <th className="py-3.5 px-3 text-center">Inicial</th>
                  <th className="py-3.5 px-3 text-center">Final</th>
                  <th className="py-3.5 px-3 text-right">Consumo</th>
                  <th className="py-3.5 px-3 text-center">Ideal</th>
                  <th className="py-3.5 px-3 text-right">Pedir</th>
                  <th className="py-3.5 pl-3 pr-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FFF4E0]/6">
                {filteredItems.map((item) => {
                  const consumo = calcConsumo(item);
                  const pedido = calcPedido(item);
                  const status = getItemStatus(item);
                  return (
                    <tr key={item.id} className="hover:bg-[#1F1C18]/70 transition-colors">
                      <td className="py-3 pl-5 pr-3">
                        <div className="font-medium text-sm text-[#F5F0E8]">{item.nome}</div>
                        <div className="mt-0.5 text-xs text-[#A69D8E]">{item.categoria}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <NumberStepper
                          value={item.inicial}
                          onChange={(val) => onUpdateField(item.id, 'inicial', val)}
                          ariaLabel={`Inicial de ${item.nome}`}
                          size="compact"
                        />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <NumberStepper
                          value={item.final}
                          onChange={(val) => onUpdateField(item.id, 'final', val)}
                          ariaLabel={`Final de ${item.nome}`}
                          size="compact"
                        />
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sm tabular-nums text-[#F5F0E8]">
                        {formatNullableNum(consumo)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <NumberStepper
                          value={item.ideal}
                          onChange={(val) => onUpdateField(item.id, 'ideal', val)}
                          ariaLabel={`Ideal de ${item.nome}`}
                          size="compact"
                        />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex flex-col items-end">
                          <span
                            className={`font-mono text-sm font-semibold tabular-nums ${
                              status === 'repor'
                                ? 'text-[#E05A47]'
                                : status === 'ok'
                                  ? 'text-[#4CA975]'
                                  : 'text-[#736B5E]'
                            }`}
                          >
                            {formatNullableNum(pedido)}
                          </span>
                          <span
                            className={`text-[11px] ${
                              status === 'repor'
                                ? 'text-[#E05A47]/90'
                                : status === 'ok'
                                  ? 'text-[#4CA975]/85'
                                  : 'text-[#736B5E]'
                            }`}
                          >
                            {status === 'repor' ? 'Repor' : status === 'ok' ? 'OK' : 'Pendente'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pl-3 pr-5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditItem(item)}
                            aria-label={`Editar ${item.nome}`}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#A69D8E] hover:text-[#F5F0E8] hover:bg-[#27231D] cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRequestDelete(item)}
                            aria-label={`Remover ${item.nome}`}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#A69D8E] hover:text-[#E05A47] hover:bg-[#E05A47]/10 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-[#FFF4E0]/12 bg-[#141210] text-sm font-semibold text-[#F5F0E8]">
                  <td className="py-3.5 pl-5 pr-3">
                    Total · {filteredItems.length} itens
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono tabular-nums">
                    {filteredTotals.totalInicial}
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono tabular-nums">
                    {filteredTotals.totalFinal}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                    {filteredTotals.totalConsumo}
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono tabular-nums text-[#736B5E]">
                    —
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#D98A2B]">
                    {filteredTotals.totalUnidadesPedir}
                  </td>
                  <td className="py-3.5 pl-3 pr-5" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Guided Next-Step Banner */}
      <div className="rounded-2xl bg-[#171512] border border-[#FFF4E0]/8 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-[#A69D8E] leading-relaxed">
          {stage === 'inicial'
            ? 'Terminou a abertura? Passe para o Estoque Final ao encerrar o expediente.'
            : 'Com o estoque final conferido, os pedidos de reposição já ficam prontos para envio.'}
        </p>

        {stage === 'inicial' ? (
          <button
            type="button"
            onClick={() => onChangeStage('final')}
            className="inline-flex items-center justify-center gap-2 min-h-[42px] px-4 py-2 rounded-xl bg-[#1F1C18] hover:bg-[#27231D] border border-[#D98A2B]/40 text-xs font-semibold text-[#F5F0E8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Avançar para Estoque Final
            <ArrowRight className="w-3.5 h-3.5 text-[#D98A2B]" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onGoToOrders}
            className="inline-flex items-center justify-center gap-2 min-h-[42px] px-4 py-2 rounded-xl bg-[#D98A2B] hover:bg-[#E89B3C] text-xs font-semibold text-[#0E0D0B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Ver pedidos ({summary.totalUnidadesPedir} un)
          </button>
        )}
      </div>
    </div>
  );
}
