import { useMemo } from 'react';
import {
  ArrowRight,
  Calendar,
  Check,
  Copy,
  FileDown,
  ListChecks,
  Plus,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';
import { BeverageItem, CATEGORIES, ChecklistStage, ShiftRecord } from '../types/inventory';
import {
  calcAlvo,
  calcPedido,
  computeConsumptionByCategory,
  computeSummary,
  formatBusinessDateLong,
  formatBusinessDateShort,
  formatNullableNum,
  isClosingAfterMidnight,
} from '../utils/calculations';

interface HomeDashboardViewProps {
  items: BeverageItem[];
  history: ShiftRecord[];
  dataOperacional: string;
  onChangeShiftDate: (nextISO: string) => void;
  onGoToChecklist: (stage: ChecklistStage) => void;
  onGoToOrders: () => void;
  onGoToHistory: () => void;
  onOpenAddModal: () => void;
  onLoadStarter: () => void;
  onOpenNewShift: () => void;
  onOpenResetCounts: () => void;
  onCopyWhatsApp: () => void;
  onExportPdf: () => void;
  copiedRecently: boolean;
}

export function HomeDashboardView({
  items,
  history,
  dataOperacional,
  onChangeShiftDate,
  onGoToChecklist,
  onGoToOrders,
  onGoToHistory,
  onOpenAddModal,
  onLoadStarter,
  onOpenNewShift,
  onOpenResetCounts,
  onCopyWhatsApp,
  onExportPdf,
  copiedRecently,
}: HomeDashboardViewProps) {
  const summary = useMemo(() => computeSummary(items), [items]);
  const consumptionByCat = useMemo(() => computeConsumptionByCategory(items), [items]);
  const afterMidnight = isClosingAfterMidnight(dataOperacional, new Date());

  const initialPct =
    summary.totalItens > 0
      ? Math.round((summary.itensInicialConferidos / summary.totalItens) * 100)
      : 0;
  const finalPct =
    summary.totalItens > 0
      ? Math.round((summary.itensConferidos / summary.totalItens) * 100)
      : 0;

  const urgentRestock = useMemo(() => {
    return items
      .map((item) => ({
        item,
        pedido: calcPedido(item) ?? 0,
        alvo: calcAlvo(item),
      }))
      .filter((entry) => entry.pedido > 0)
      .sort((a, b) => b.pedido - a.pedido)
      .slice(0, 5);
  }, [items]);

  const categoryBreakdown = useMemo(() => {
    const rows = CATEGORIES.map((category) => ({
      category,
      consumed: consumptionByCat[category] ?? 0,
      count: items.filter((i) => i.categoria === category).length,
    }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.consumed - a.consumed);

    const max = Math.max(1, ...rows.map((r) => r.consumed));
    return { rows, max };
  }, [consumptionByCat, items]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-[#171512] border border-[#FFF4E0]/8 px-6 py-14 text-center max-w-2xl mx-auto">
        <h2 className="font-display text-2xl font-semibold text-[#F5F0E8] text-balance">
          Comece o estoque da Estação Cupim
        </h2>
        <p className="mt-2 text-sm text-[#A69D8E] max-w-md mx-auto leading-relaxed">
          Cadastre suas bebidas ou carregue o cardápio exemplo para iniciar o checklist de abertura e fechamento do dia.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#D98A2B] hover:bg-[#E89B3C] text-[#0E0D0B] text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Cadastrar bebida
          </button>
          <button
            type="button"
            onClick={onLoadStarter}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1F1C18] hover:bg-[#27231D] border border-[#FFF4E0]/10 text-[#F5F0E8] text-sm font-medium transition-colors whitespace-nowrap cursor-pointer"
          >
            Carregar cardápio exemplo
          </button>
        </div>
      </div>
    );
  }

  const nextStage: ChecklistStage = initialPct < 100 ? 'inicial' : 'final';

  return (
    <div className="space-y-6">
      {/* Daily Shift Checklist Flow Banner — Anchored to Operational Business Date */}
      <section
        aria-label="Rotina do dia"
        className="rounded-2xl bg-[#171512] border border-[#FFF4E0]/8 p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
              <span className="text-[#D98A2B] font-medium">
                Turno de {formatBusinessDateShort(dataOperacional)}
              </span>
              <span aria-hidden="true" className="text-[#736B5E]">·</span>
              <span className="text-[#A69D8E] capitalize">
                {formatBusinessDateLong(dataOperacional)}
              </span>
              {afterMidnight && (
                <>
                  <span aria-hidden="true" className="text-[#736B5E]">·</span>
                  <span className="text-[#D98A2B]">Madrugada (mesmo dia da abertura)</span>
                </>
              )}
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#F5F0E8] text-balance">
              Checklist de abertura e fechamento
            </h2>
            <p className="text-sm text-[#A69D8E]">
              A abertura e o fechamento ficam vinculados ao mesmo dia operacional, mesmo quando encerrados após 00:00.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <label className="inline-flex items-center gap-2 min-h-[44px] px-3.5 rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/10 hover:border-[#D98A2B]/40 transition-colors cursor-pointer">
              <Calendar className="w-4 h-4 text-[#D98A2B] shrink-0" />
              <span className="sr-only">Alterar data do turno</span>
              <input
                type="date"
                value={dataOperacional}
                onChange={(e) => {
                  if (e.target.value) onChangeShiftDate(e.target.value);
                }}
                aria-label="Data operacional do turno"
                className="bg-transparent font-mono text-xs tabular-nums text-[#F5F0E8] focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </label>

            <button
              type="button"
              onClick={() => onGoToChecklist(nextStage)}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#D98A2B] hover:bg-[#E89B3C] text-[#0E0D0B] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ListChecks className="w-4 h-4" />
              {initialPct < 100
                ? 'Continuar estoque inicial'
                : finalPct < 100
                  ? 'Continuar estoque final'
                  : 'Revisar checklist'}
            </button>
          </div>
        </div>

        {/* Two clean clickable step cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <button
            type="button"
            onClick={() => onGoToChecklist('inicial')}
            className="text-left p-4 rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/8 hover:border-[#D98A2B]/45 transition-colors group cursor-pointer"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-[#A69D8E]">
                01. Abertura · {formatBusinessDateShort(dataOperacional)}
              </span>
              <span
                className={`font-mono text-xs font-semibold tabular-nums ${
                  initialPct === 100 ? 'text-[#4CA975]' : 'text-[#D98A2B]'
                }`}
              >
                {summary.itensInicialConferidos}/{summary.totalItens} · {initialPct}%
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="font-display text-base font-semibold text-[#F5F0E8]">
                Estoque Inicial
              </p>
              <ArrowRight className="w-4 h-4 text-[#736B5E] group-hover:text-[#D98A2B] transition-colors shrink-0" />
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-[#1F1C18] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${initialPct}%`,
                  backgroundColor: initialPct === 100 ? '#4CA975' : '#D98A2B',
                }}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onGoToChecklist('final')}
            className="text-left p-4 rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/8 hover:border-[#D98A2B]/45 transition-colors group cursor-pointer"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-[#A69D8E]">
                02. Fechamento · mesmo turno ({formatBusinessDateShort(dataOperacional)})
              </span>
              <span
                className={`font-mono text-xs font-semibold tabular-nums ${
                  finalPct === 100 ? 'text-[#4CA975]' : 'text-[#D98A2B]'
                }`}
              >
                {summary.itensConferidos}/{summary.totalItens} · {finalPct}%
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="font-display text-base font-semibold text-[#F5F0E8]">
                Estoque Final
              </p>
              <ArrowRight className="w-4 h-4 text-[#736B5E] group-hover:text-[#D98A2B] transition-colors shrink-0" />
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-[#1F1C18] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${finalPct}%`,
                  backgroundColor: finalPct === 100 ? '#4CA975' : '#D98A2B',
                }}
              />
            </div>
          </button>
        </div>
      </section>

      {/* 4-column KPI Overview Strip */}
      <section
        aria-label="Indicadores do turno"
        className="grid grid-cols-2 lg:grid-cols-4 rounded-2xl bg-[#171512] border border-[#FFF4E0]/8 overflow-hidden divide-y lg:divide-y-0 divide-x divide-[#FFF4E0]/8"
      >
        <div className="p-4 sm:p-5">
          <p className="text-xs text-[#A69D8E]">Total de bebidas</p>
          <p className="mt-1.5 font-mono text-2xl sm:text-3xl font-semibold tabular-nums text-[#F5F0E8]">
            {summary.totalItens}
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs text-[#A69D8E]">Consumo do turno</p>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl sm:text-3xl font-semibold tabular-nums text-[#F5F0E8]">
              {summary.totalConsumo}
            </span>
            <span className="text-xs text-[#736B5E]">un</span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs text-[#A69D8E]">Itens para repor</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span
              className={`font-mono text-2xl sm:text-3xl font-semibold tabular-nums ${
                summary.itensParaRepor > 0 ? 'text-[#E05A47]' : 'text-[#4CA975]'
              }`}
            >
              {summary.itensParaRepor}
            </span>
            <span className="text-xs text-[#A69D8E]">
              {summary.itensParaRepor > 0 ? 'em alerta' : 'em dia'}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs text-[#A69D8E]">Pedido sugerido</p>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span
              className={`font-mono text-2xl sm:text-3xl font-semibold tabular-nums ${
                summary.totalUnidadesPedir > 0 ? 'text-[#D98A2B]' : 'text-[#F5F0E8]'
              }`}
            >
              {summary.totalUnidadesPedir}
            </span>
            <span className="text-xs text-[#736B5E]">un</span>
          </div>
        </div>
      </section>

      {/* Main 2-Column Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 rounded-2xl bg-[#171512] border border-[#FFF4E0]/8 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#FFF4E0]/8 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-[#F5F0E8]">
                Principais itens para pedir
              </h3>
              <p className="text-xs text-[#A69D8E]">
                Calculado automaticamente a partir do estoque final
              </p>
            </div>
            <button
              type="button"
              onClick={onGoToOrders}
              className="text-xs font-medium text-[#D98A2B] hover:text-[#E89B3C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Ver pedido completo
            </button>
          </div>

          {urgentRestock.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-medium text-[#4CA975]">
                Nenhuma reposição pendente até agora
              </p>
              <p className="mt-1 text-xs text-[#A69D8E]">
                Finalize a contagem de fechamento no Checklist para gerar os pedidos do dia.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#FFF4E0]/6">
              {urgentRestock.map(({ item, pedido, alvo }) => (
                <div
                  key={item.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-[#1F1C18]/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#F5F0E8] truncate">{item.nome}</p>
                    <p className="mt-0.5 text-xs text-[#A69D8E]">
                      {item.categoria} · Final {formatNullableNum(item.final)} / Ideal{' '}
                      {formatNullableNum(alvo)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-base font-semibold tabular-nums text-[#E05A47]">
                      +{pedido}
                    </span>
                    <span className="ml-1 text-xs text-[#A69D8E]">un</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {summary.totalUnidadesPedir > 0 && (
            <div className="px-5 py-3.5 border-t border-[#FFF4E0]/8 bg-[#141210] flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[#A69D8E]">
                Total do turno: <strong className="font-mono text-[#F5F0E8]">{summary.totalUnidadesPedir} un</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCopyWhatsApp}
                  className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#D98A2B] hover:bg-[#E89B3C] text-[#0E0D0B] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                >
                  {copiedRecently ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedRecently ? 'Copiado!' : 'Copiar WhatsApp'}
                </button>
                <button
                  type="button"
                  onClick={onGoToOrders}
                  className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg bg-[#1F1C18] hover:bg-[#27231D] border border-[#FFF4E0]/10 text-[#F5F0E8] text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#D98A2B]" />
                  Abrir pedidos
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="lg:col-span-5 space-y-6">
          <section className="rounded-2xl bg-[#171512] border border-[#FFF4E0]/8 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-semibold text-[#F5F0E8]">
                Consumo por categoria
              </h3>
              <button
                type="button"
                onClick={onGoToHistory}
                className="text-xs font-medium text-[#A69D8E] hover:text-[#F5F0E8] transition-colors whitespace-nowrap cursor-pointer"
              >
                Histórico ({history.length})
              </button>
            </div>

            {summary.totalConsumo === 0 ? (
              <p className="text-xs text-[#736B5E] py-4">
                Informe o estoque inicial e final no Checklist para ver a saída por categoria.
              </p>
            ) : (
              <div className="space-y-3">
                {categoryBreakdown.rows.map((row, idx) => {
                  const width =
                    row.consumed > 0
                      ? Math.max(6, Math.round((row.consumed / categoryBreakdown.max) * 100))
                      : 0;
                  return (
                    <div key={row.category} className="space-y-1">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-[#F5F0E8] font-medium">{row.category}</span>
                        <span className="font-mono tabular-nums text-[#A69D8E]">
                          {row.consumed} un
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#0E0D0B] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${width}%`,
                            backgroundColor: idx === 0 ? '#D98A2B' : '#966224',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-[#171512] border border-[#FFF4E0]/8 p-5 space-y-3">
            <h3 className="font-display text-base font-semibold text-[#F5F0E8]">
              Ações do turno
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2">
              <button
                type="button"
                onClick={onExportPdf}
                className="w-full min-h-[44px] flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#1F1C18] hover:bg-[#27231D] border border-[#FFF4E0]/10 text-sm font-medium text-[#F5F0E8] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <FileDown className="w-4 h-4 text-[#D98A2B]" />
                  Gerar relatório PDF A4
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#736B5E]" />
              </button>

              <button
                type="button"
                onClick={onOpenNewShift}
                className="w-full min-h-[44px] flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#0E0D0B] hover:bg-[#1F1C18] border border-[#FFF4E0]/8 text-sm font-medium text-[#F5F0E8] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <RefreshCw className="w-4 h-4 text-[#D98A2B]" />
                  Fechar turno (final → inicial)
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#736B5E]" />
              </button>

              <button
                type="button"
                onClick={onOpenResetCounts}
                className="w-full min-h-[44px] flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#0E0D0B] hover:bg-[#E05A47]/10 border border-[#FFF4E0]/8 text-sm font-medium text-[#A69D8E] hover:text-[#E05A47] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <RotateCcw className="w-4 h-4" />
                  Zerar contagens do dia
                </span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
