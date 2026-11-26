import { useMemo } from 'react';
import { Check, Copy, FileDown, MessageSquareText } from 'lucide-react';
import { BeverageItem, CATEGORIES } from '../types/inventory';
import {
  calcAlvo,
  calcPedido,
  formatBusinessDateShort,
  formatNullableNum,
} from '../utils/calculations';
import { formatWhatsAppOrder } from '../utils/whatsappFormat';

interface OrderViewProps {
  items: BeverageItem[];
  dataOperacional: string;
  onCopyWhatsApp: () => void;
  onExportPdf: () => void;
  copiedRecently: boolean;
}

export function OrderView({
  items,
  dataOperacional,
  onCopyWhatsApp,
  onExportPdf,
  copiedRecently,
}: OrderViewProps) {
  const groupedOrders = useMemo(() => {
    const groups: Array<{
      category: string;
      subtotal: number;
      rows: Array<{ item: BeverageItem; pedido: number; alvo: number | null }>;
    }> = [];

    for (const category of CATEGORIES) {
      const rows = items
        .filter((item) => item.categoria === category)
        .map((item) => ({
          item,
          pedido: calcPedido(item) ?? 0,
          alvo: calcAlvo(item),
        }))
        .filter((entry) => entry.pedido > 0);

      if (rows.length > 0) {
        const subtotal = rows.reduce((sum, r) => sum + r.pedido, 0);
        groups.push({ category, subtotal, rows });
      }
    }

    return groups;
  }, [items]);

  const totalItems = useMemo(
    () => groupedOrders.reduce((sum, g) => sum + g.rows.length, 0),
    [groupedOrders]
  );

  const totalUnits = useMemo(
    () => groupedOrders.reduce((sum, g) => sum + g.subtotal, 0),
    [groupedOrders]
  );

  const whatsappPreview = useMemo(
    () => formatWhatsAppOrder(items, dataOperacional),
    [items, dataOperacional]
  );

  if (groupedOrders.length === 0) {
    return (
      <div className="rounded-2xl bg-[#171512] border border-[#FFF4E0]/8 px-6 py-14 text-center max-w-2xl mx-auto">
        <p className="text-xs font-medium text-[#4CA975]">
          Estoque em dia · Turno de {formatBusinessDateShort(dataOperacional)}
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-[#F5F0E8] text-balance">
          Nenhuma reposição necessária neste turno
        </h2>
        <p className="mt-2 text-sm text-[#A69D8E] max-w-md mx-auto leading-relaxed">
          Assim que alguma bebida ficar abaixo do estoque ideal ou inicial após a contagem final, o pedido aparecerá aqui agrupado por categoria.
        </p>
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onExportPdf}
            className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1F1C18] hover:bg-[#27231D] border border-[#FFF4E0]/10 text-sm font-medium text-[#F5F0E8] transition-colors whitespace-nowrap cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-[#D98A2B]" />
            Baixar relatório PDF A4
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <div className="xl:col-span-7 space-y-5">
        <div className="rounded-2xl bg-[#171512] border border-[#FFF4E0]/8 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-[#A69D8E]">
              Resumo da compra · Turno de {formatBusinessDateShort(dataOperacional)}
            </p>
            <div className="mt-1 flex items-baseline gap-2.5">
              <span className="font-mono text-3xl font-semibold tabular-nums text-[#D98A2B]">
                {totalUnits}
              </span>
              <span className="text-sm text-[#A69D8E]">
                unidades em {totalItems} {totalItems === 1 ? 'bebida' : 'bebidas'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onCopyWhatsApp}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#D98A2B] hover:bg-[#E89B3C] text-[#0E0D0B] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedRecently ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedRecently ? 'Copiado!' : 'Copiar para WhatsApp'}
            </button>
            <button
              type="button"
              onClick={onExportPdf}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1F1C18] hover:bg-[#27231D] border border-[#FFF4E0]/10 text-[#F5F0E8] text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-[#D98A2B]" />
              Baixar PDF
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-[#171512] border border-[#FFF4E0]/8 divide-y divide-[#FFF4E0]/8 overflow-hidden">
          {groupedOrders.map((group) => (
            <section key={group.category} className="p-5">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="font-display text-base font-semibold text-[#F5F0E8]">
                  {group.category}
                </h3>
                <span className="font-mono text-xs tabular-nums text-[#A69D8E]">
                  {group.subtotal} un
                </span>
              </div>

              <div className="divide-y divide-[#FFF4E0]/6">
                {group.rows.map(({ item, pedido, alvo }) => (
                  <div
                    key={item.id}
                    className="py-3 first:pt-1 last:pb-0 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#F5F0E8] truncate">{item.nome}</p>
                      <p className="mt-0.5 text-xs text-[#A69D8E] font-mono tabular-nums">
                        Atual {formatNullableNum(item.final)} · Ideal {formatNullableNum(alvo)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-base font-semibold tabular-nums text-[#D98A2B]">
                        +{pedido}
                      </span>
                      <span className="ml-1 text-xs text-[#A69D8E]">un</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <aside className="xl:col-span-5 rounded-2xl bg-[#171512] border border-[#FFF4E0]/8 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquareText className="w-4 h-4 text-[#D98A2B]" />
            <h3 className="font-display text-base font-semibold text-[#F5F0E8]">
              Mensagem para WhatsApp
            </h3>
          </div>
          <span className="text-xs text-[#736B5E]">Pronta para enviar</span>
        </div>

        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[#E6DFD3] bg-[#0E0D0B] border border-[#FFF4E0]/8 rounded-xl p-4 overflow-x-auto">
          {whatsappPreview}
        </pre>

        <button
          type="button"
          onClick={onCopyWhatsApp}
          className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1F1C18] hover:bg-[#27231D] border border-[#D98A2B]/35 text-sm font-medium text-[#F5F0E8] transition-colors cursor-pointer"
        >
          {copiedRecently ? (
            <>
              <Check className="w-4 h-4 text-[#4CA975]" />
              Mensagem copiada para a área de transferência
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-[#D98A2B]" />
              Copiar texto formatado
            </>
          )}
        </button>
      </aside>
    </div>
  );
}
