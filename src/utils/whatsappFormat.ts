import { BeverageItem, CATEGORIES } from '../types/inventory';
import {
  calcPedido,
  formatBusinessDateShort,
  isClosingAfterMidnight,
} from './calculations';

export function formatWhatsAppOrder(
  items: BeverageItem[],
  dataOperacional?: string,
  now = new Date()
): string {
  const shiftDateStr = dataOperacional
    ? formatBusinessDateShort(dataOperacional)
    : now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const afterMidnight = dataOperacional ? isClosingAfterMidnight(dataOperacional, now) : false;
  const dateHeader = afterMidnight
    ? `Turno: ${shiftDateStr} (fechamento às ${timeStr})`
    : `Turno: ${shiftDateStr} · ${timeStr}`;

  const orderItems = items
    .map((item) => ({ item, pedido: calcPedido(item) ?? 0 }))
    .filter((entry) => entry.pedido > 0);

  if (orderItems.length === 0) {
    return `*ESTAÇÃO CUPIM — Pedido de Reposição*\n${dateHeader}\n\nNenhuma reposição necessária neste turno.`;
  }

  const lines: string[] = [
    '*ESTAÇÃO CUPIM — Pedido de Reposição*',
    dateHeader,
    '',
  ];

  let totalUnits = 0;

  for (const category of CATEGORIES) {
    const group = orderItems.filter((entry) => entry.item.categoria === category);
    if (group.length === 0) continue;

    lines.push(`*${category}*`);
    for (const { item, pedido } of group) {
      totalUnits += pedido;
      lines.push(`• ${item.nome} — ${pedido} un`);
    }
    lines.push('');
  }

  lines.push(
    `Total: *${totalUnits} ${totalUnits === 1 ? 'unidade' : 'unidades'}* (${orderItems.length} ${orderItems.length === 1 ? 'item' : 'itens'})`
  );

  return lines.join('\n');
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to legacy textarea copy for sandboxed iframes
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
