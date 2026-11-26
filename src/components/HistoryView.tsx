import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, FileDown, RefreshCw, Trash2 } from 'lucide-react';
import { BeverageItem, CATEGORIES, Category, ShiftRecord } from '../types/inventory';
import {
  computeConsumptionByCategory,
  formatBusinessDateLong,
  formatBusinessDateShort,
  formatNullableNum,
  toLocalDateISO,
} from '../utils/calculations';

interface HistoryViewProps {
  currentItems: BeverageItem[];
  history: ShiftRecord[];
  onOpenNewShift: () => void;
  onExportShiftPdf: (record: ShiftRecord) => void;
  onDeleteShift: (id: string) => void;
}

export function HistoryView({
  currentItems,
  history,
  onOpenNewShift,
  onExportShiftPdf,
  onDeleteShift,
}: HistoryViewProps) {
  const [chartScope, setChartScope] = useState<'atual' | 'historico'>(
    history.length > 0 ? 'historico' : 'atual'
  );
  const [expandedId, setExpandedId] = useState<string | null>(history[0]?.id ?? null);

  const currentByCat = useMemo(
    () => computeConsumptionByCategory(currentItems),
    [currentItems]
  );

  const historicalByCat = useMemo(() => {
    const totals = {} as Record<Category, number>;
    for (const cat of CATEGORIES) totals[cat] = 0;

    for (const record of history) {
      for (const cat of CATEGORIES) {
        totals[cat] += record.consumoPorCategoria?.[cat] ?? 0;
      }
    }
    return totals;
  }, [history]);

  const activeCategoryData = useMemo(() => {
    const source = chartScope === 'atual' ? currentByCat : historicalByCat;
    const entries = CATEGORIES.map((category) => ({
      category,
      units: source[category] ?? 0,
    })).sort((a, b) => b.units - a.units);

    const total = entries.reduce((sum, e) => sum + e.units, 0);
    const max = Math.max(1, ...entries.map((e) => e.units));
    return { entries, total, max };
  }, [chartScope, currentByCat, historicalByCat]);

  const totalHistoricalConsumption = useMemo(
    () => history.reduce((sum, r) => sum + r.totalConsumo, 0),
    [history]
  );

  const avgShiftConsumption = useMemo(() => {
    if (history.length === 0) return 0;
    return Math.round(totalHistoricalConsumption / history.length);
  }, [history.length, totalHistoricalConsumption]);

  return (
    <div className="space-y-6">
      {/* Top 3-metric historical overview */}
      <section className="grid grid-cols-1 sm:grid-cols-3 rounded-2xl bg-[#171512] border border-[#FFF4E0]/8 overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-[#FFF4E0]/8">
        <div className="p-4 sm:p-5">
          <p className="text-xs text-[#A69D8E]">Turnos registrados</p>
          <p className="mt-1.5 font-mono text-2xl sm:text-3xl font-semibold tabular-nums text-[#F5F0E8]">
            {history.length}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs text-[#A69D8E]">Consumo acumulado</p>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl sm:text-3xl font-semibold tabular-nums text-[#D98A2B]">
              {totalHistoricalConsumption}
            </span>
            <span className="text-xs text-[#736B5E]">un</span>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs text-[#A69D8E]">Média por turno</p>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl sm:text-3xl font-semibold tabular-nums text-[#F5F0E8]">
              {avgShiftConsumption}
            </span>
            <span className="text-xs text-[#736B5E]">un/turno</span>
          </div>
        </div>
      </section>

      {/* Consumption by Category Chart */}
      <section className="rounded-2xl bg-[#171512] border border-[#FFF4E0]/8 p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#F5F0E8]">
              Consumo por categoria
            </h2>
            <p className="mt-0.5 text-xs text-[#A69D8E]">
              {chartScope === 'atual'
                ? 'Baseado nas contagens em andamento no turno atual'
                : `Soma dos últimos ${history.length} ${history.length === 1 ? 'turno fechado' : 'turnos fechados'}`}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Período do gráfico"
            className="inline-flex items-center p-1 rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/8 self-start sm:self-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={chartScope === 'atual'}
              onClick={() => setChartScope('atual')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                chartScope === 'atual'
                  ? 'bg-[#D98A2B] text-[#0E0D0B] font-semibold'
                  : 'text-[#A69D8E] hover:text-[#F5F0E8]'
              }`}
            >
              Turno atual
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={chartScope === 'historico'}
              onClick={() => setChartScope('historico')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                chartScope === 'historico'
                  ? 'bg-[#D98A2B] text-[#0E0D0B] font-semibold'
                  : 'text-[#A69D8E] hover:text-[#F5F0E8]'
              }`}
            >
              Histórico ({history.length})
            </button>
          </div>
        </div>

        {activeCategoryData.total === 0 ? (
          <div className="py-8 text-center text-sm text-[#736B5E]">
            Ainda não há consumo contabilizado neste período.
          </div>
        ) : (
          <div className="space-y-3.5">
            {activeCategoryData.entries
              .filter((e) => e.units > 0)
              .map((entry, idx) => {
                const pct = Math.round((entry.units / activeCategoryData.total) * 100);
                const barWidth = Math.max(4, (entry.units / activeCategoryData.max) * 100);
                return (
                  <div key={entry.category} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-4 text-sm">
                      <span className="font-medium text-[#F5F0E8]">{entry.category}</span>
                      <div className="flex items-baseline gap-2 font-mono tabular-nums text-xs">
                        <span className="text-[#F5F0E8] font-semibold">{entry.units} un</span>
                        <span className="text-[#736B5E]">·</span>
                        <span className="text-[#A69D8E] w-9 text-right">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-[#0E0D0B] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor:
                            idx === 0 ? '#D98A2B' : idx === 1 ? '#B87221' : '#8A5A20',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* Closed Shifts Ledger */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-[#F5F0E8]">
            Turnos fechados
          </h2>
          <button
            type="button"
            onClick={onOpenNewShift}
            className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-xl bg-[#171512] hover:bg-[#1F1C18] border border-[#FFF4E0]/10 text-xs font-medium text-[#F5F0E8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#D98A2B]" />
            Fechar turno atual
          </button>
        </div>

        {history.length === 0 ? (
          <div className="rounded-2xl bg-[#171512] border border-[#FFF4E0]/8 px-6 py-12 text-center">
            <p className="text-base font-medium text-[#F5F0E8]">
              Nenhum turno encerrado no histórico
            </p>
            <p className="mt-1 text-sm text-[#A69D8E] max-w-md mx-auto">
              Ao acionar “Fechar turno (final → inicial)”, o sistema grava o fechamento na data de abertura mesmo quando feito após 00:00.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#171512] border border-[#FFF4E0]/8 divide-y divide-[#FFF4E0]/8 overflow-hidden">
            {history.map((record) => {
              const isOpen = expandedId === record.id;
              const closedDate = new Date(record.encerradoEm);
              const closedDayISO = toLocalDateISO(closedDate);
              const shiftISO = record.dataOperacional ?? closedDayISO;
              const closedAfterMidnight = closedDayISO > shiftISO;
              const closedTimeStr = closedDate.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const closedShortDay = closedDate.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
              });

              return (
                <div key={record.id}>
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#1F1C18]/40 transition-colors">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : record.id)}
                      className="flex-1 text-left flex items-center justify-between sm:justify-start gap-4 cursor-pointer min-h-[44px]"
                    >
                      <div>
                        <p className="font-display text-base font-semibold text-[#F5F0E8]">
                          Turno de {formatBusinessDateShort(shiftISO)}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#A69D8E]">
                          <span className="capitalize">{formatBusinessDateLong(shiftISO)}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {closedAfterMidnight
                              ? `Fechado em ${closedShortDay} às ${closedTimeStr}`
                              : `Fechado às ${closedTimeStr}`}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {record.itensConferidos}/{record.totalItens} itens
                          </span>
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center justify-between sm:justify-end gap-5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#FFF4E0]/6">
                      <div className="flex items-center gap-5 font-mono tabular-nums text-right">
                        <div>
                          <p className="text-[11px] font-sans text-[#A69D8E]">Consumo</p>
                          <p className="text-sm font-semibold text-[#F5F0E8]">
                            {record.totalConsumo} un
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-sans text-[#A69D8E]">Pedido</p>
                          <p className="text-sm font-semibold text-[#D98A2B]">
                            {record.totalPedir} un
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onExportShiftPdf(record)}
                          aria-label={`Baixar PDF do ${record.rotulo}`}
                          title="Baixar PDF deste turno"
                          className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg text-[#A69D8E] hover:text-[#D98A2B] hover:bg-[#27231D] transition-colors cursor-pointer"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteShift(record.id)}
                          aria-label={`Excluir ${record.rotulo}`}
                          title="Excluir registro"
                          className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg text-[#A69D8E] hover:text-[#E05A47] hover:bg-[#E05A47]/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isOpen ? null : record.id)}
                          aria-label={isOpen ? 'Recolher detalhes' : 'Expandir detalhes'}
                          className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg text-[#A69D8E] hover:text-[#F5F0E8] hover:bg-[#27231D] transition-colors cursor-pointer"
                        >
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 pt-1 bg-[#141210] border-t border-[#FFF4E0]/6 overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="text-[#736B5E] border-b border-[#FFF4E0]/8">
                            <th className="py-2.5 pr-3 font-medium">Bebida</th>
                            <th className="py-2.5 px-2 font-medium text-right">Inicial</th>
                            <th className="py-2.5 px-2 font-medium text-right">Final</th>
                            <th className="py-2.5 px-2 font-medium text-right">Consumo</th>
                            <th className="py-2.5 pl-2 font-medium text-right">Pedir</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#FFF4E0]/6">
                          {record.itens.map((snap, i) => (
                            <tr key={`${record.id}-${i}`}>
                              <td className="py-2 pr-3">
                                <span className="text-[#F5F0E8] font-medium">{snap.nome}</span>
                                <span className="ml-2 text-[#736B5E]">{snap.categoria}</span>
                              </td>
                              <td className="py-2 px-2 text-right font-mono tabular-nums text-[#A69D8E]">
                                {formatNullableNum(snap.inicial)}
                              </td>
                              <td className="py-2 px-2 text-right font-mono tabular-nums text-[#A69D8E]">
                                {formatNullableNum(snap.final)}
                              </td>
                              <td className="py-2 px-2 text-right font-mono tabular-nums text-[#F5F0E8]">
                                {formatNullableNum(snap.consumo)}
                              </td>
                              <td
                                className={`py-2 pl-2 text-right font-mono tabular-nums font-semibold ${
                                  (snap.pedido ?? 0) > 0 ? 'text-[#E05A47]' : 'text-[#736B5E]'
                                }`}
                              >
                                {formatNullableNum(snap.pedido)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
