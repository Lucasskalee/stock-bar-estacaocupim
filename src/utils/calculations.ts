import {
  BeverageItem,
  CATEGORIES,
  Category,
  CurrentShiftMeta,
  ShiftItemSnapshot,
  ShiftRecord,
  StockStatus,
} from '../types/inventory';

export const STORAGE_KEY = 'stokbar-conferencia';
export const HISTORY_KEY = 'stokbar-historico';
export const SHIFT_META_KEY = 'stokbar-turno-atual';

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Formats a Date into local YYYY-MM-DD without UTC timezone shift */
export function toLocalDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses YYYY-MM-DD into a local Date at noon (safe from DST/timezone edges) */
export function parseLocalDateISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * Operational business date rule for bars:
 * Between 00:00 and 05:59, the night shift still belongs to the previous calendar day.
 */
export function getDefaultBusinessDate(now = new Date()): string {
  const adjusted = new Date(now);
  if (adjusted.getHours() < 6) {
    adjusted.setDate(adjusted.getDate() - 1);
  }
  return toLocalDateISO(adjusted);
}

export function getNextBusinessDate(currentBusinessISO: string, now = new Date()): string {
  const todayISO = toLocalDateISO(now);
  // If closing after midnight (currentBusinessISO is already before today), next shift is today
  if (currentBusinessISO < todayISO) {
    return todayISO;
  }
  const next = parseLocalDateISO(currentBusinessISO);
  next.setDate(next.getDate() + 1);
  return toLocalDateISO(next);
}

export function formatBusinessDateShort(iso: string): string {
  const d = parseLocalDateISO(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatBusinessDateLong(iso: string): string {
  const d = parseLocalDateISO(iso);
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

export function isClosingAfterMidnight(dataOperacional: string, now = new Date()): boolean {
  return toLocalDateISO(now) > dataOperacional;
}

export function loadCurrentShiftMeta(): CurrentShiftMeta {
  try {
    const raw = localStorage.getItem(SHIFT_META_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.dataOperacional === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.dataOperacional)) {
        return {
          dataOperacional: parsed.dataOperacional,
          abertoEm: typeof parsed.abertoEm === 'string' ? parsed.abertoEm : new Date().toISOString(),
        };
      }
    }
  } catch {
    // Fall through to default
  }

  const fresh: CurrentShiftMeta = {
    dataOperacional: getDefaultBusinessDate(new Date()),
    abertoEm: new Date().toISOString(),
  };
  saveCurrentShiftMeta(fresh);
  return fresh;
}

export function saveCurrentShiftMeta(meta: CurrentShiftMeta): void {
  try {
    localStorage.setItem(SHIFT_META_KEY, JSON.stringify(meta));
  } catch {
    // Ignore storage errors
  }
}

export function sanitizeNumber(value: string | number | null | undefined): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor(parsed));
}

export function calcConsumo(item: Pick<BeverageItem, 'inicial' | 'final'>): number | null {
  if (item.inicial !== null && item.final !== null) {
    return Math.max(0, item.inicial - item.final);
  }
  return null;
}

export function calcAlvo(item: Pick<BeverageItem, 'inicial' | 'ideal'>): number | null {
  return item.ideal !== null ? item.ideal : item.inicial;
}

export function calcPedido(item: Pick<BeverageItem, 'inicial' | 'final' | 'ideal'>): number | null {
  const alvo = calcAlvo(item);
  if (item.final === null || alvo === null) return null;
  return Math.max(0, alvo - item.final);
}

export function isInitialChecked(item: BeverageItem): boolean {
  if (typeof item.checkedInicial === 'boolean') return item.checkedInicial;
  return item.inicial !== null;
}

export function isFinalChecked(item: BeverageItem): boolean {
  if (typeof item.checkedFinal === 'boolean') return item.checkedFinal;
  return item.final !== null;
}

export function getItemStatus(item: BeverageItem): StockStatus {
  const pedido = calcPedido(item);
  if (pedido === null) return 'pendente';
  if (pedido > 0) return 'repor';
  return 'ok';
}

export function formatNullableNum(val: number | null): string {
  return val === null ? '—' : String(val);
}

export function isValidCategory(cat: unknown): cat is Category {
  return typeof cat === 'string' && (CATEGORIES as readonly string[]).includes(cat);
}

export interface InventorySummary {
  totalItens: number;
  itensInicialConferidos: number;
  itensConferidos: number;
  totalInicial: number;
  totalFinal: number;
  totalConsumo: number;
  itensParaRepor: number;
  totalUnidadesPedir: number;
}

export function computeSummary(items: BeverageItem[]): InventorySummary {
  let itensInicialConferidos = 0;
  let itensConferidos = 0;
  let totalInicial = 0;
  let totalFinal = 0;
  let totalConsumo = 0;
  let itensParaRepor = 0;
  let totalUnidadesPedir = 0;

  for (const item of items) {
    if (isInitialChecked(item)) itensInicialConferidos += 1;
    if (isFinalChecked(item)) itensConferidos += 1;
    if (item.inicial !== null) totalInicial += item.inicial;
    if (item.final !== null) totalFinal += item.final;

    const c = calcConsumo(item);
    if (c !== null) totalConsumo += c;

    const p = calcPedido(item);
    if (p !== null && p > 0) {
      itensParaRepor += 1;
      totalUnidadesPedir += p;
    }
  }

  return {
    totalItens: items.length,
    itensInicialConferidos,
    itensConferidos,
    totalInicial,
    totalFinal,
    totalConsumo,
    itensParaRepor,
    totalUnidadesPedir,
  };
}

export function computeConsumptionByCategory(items: BeverageItem[]): Record<Category, number> {
  const totals = {} as Record<Category, number>;
  for (const cat of CATEGORIES) {
    totals[cat] = 0;
  }
  for (const item of items) {
    const c = calcConsumo(item);
    if (c !== null) {
      totals[item.categoria] += c;
    }
  }
  return totals;
}

export function buildShiftSnapshot(
  items: BeverageItem[],
  dataOperacional: string,
  closedAt = new Date(),
  abertoEm?: string
): ShiftRecord {
  const summary = computeSummary(items);
  const consumoPorCategoria = computeConsumptionByCategory(items);

  const diaCurto = formatBusinessDateShort(dataOperacional);

  const snapshots: ShiftItemSnapshot[] = items.map((item) => ({
    nome: item.nome,
    categoria: item.categoria,
    inicial: item.inicial,
    final: item.final,
    ideal: item.ideal,
    consumo: calcConsumo(item),
    pedido: calcPedido(item),
  }));

  return {
    id: createId(),
    dataOperacional,
    abertoEm: abertoEm ?? closedAt.toISOString(),
    encerradoEm: closedAt.toISOString(),
    rotulo: `Turno ${diaCurto}`,
    totalItens: summary.totalItens,
    itensConferidos: summary.itensConferidos,
    totalConsumo: summary.totalConsumo,
    totalPedir: summary.totalUnidadesPedir,
    consumoPorCategoria,
    itens: snapshots,
  };
}

export function createStarterBeverages(): BeverageItem[] {
  return [
    { id: createId(), nome: 'Heineken 600ml', categoria: 'Cerveja', inicial: 72, final: 44, ideal: 72, checkedInicial: true, checkedFinal: true },
    { id: createId(), nome: 'Original 600ml', categoria: 'Cerveja', inicial: 60, final: 38, ideal: 60, checkedInicial: true, checkedFinal: true },
    { id: createId(), nome: 'Spaten Long Neck', categoria: 'Cerveja', inicial: 48, final: 32, ideal: 48, checkedInicial: true, checkedFinal: true },
    { id: createId(), nome: 'Corona Long Neck', categoria: 'Cerveja', inicial: 36, final: null, ideal: 36, checkedInicial: true, checkedFinal: false },
    { id: createId(), nome: 'Coca-Cola Lata 350ml', categoria: 'Refrigerante', inicial: 60, final: 41, ideal: 60, checkedInicial: true, checkedFinal: true },
    { id: createId(), nome: 'Coca-Cola Zero Lata', categoria: 'Refrigerante', inicial: 48, final: 36, ideal: 48, checkedInicial: true, checkedFinal: true },
    { id: createId(), nome: 'Guaraná Antarctica Lata', categoria: 'Refrigerante', inicial: 36, final: null, ideal: 36, checkedInicial: true, checkedFinal: false },
    { id: createId(), nome: 'Água Mineral Sem Gás 500ml', categoria: 'Água', inicial: 48, final: 35, ideal: 48, checkedInicial: true, checkedFinal: true },
    { id: createId(), nome: 'Água Mineral Com Gás 500ml', categoria: 'Água', inicial: 36, final: 26, ideal: 36, checkedInicial: true, checkedFinal: true },
    { id: createId(), nome: 'Suco de Laranja Integral 300ml', categoria: 'Suco', inicial: 24, final: 18, ideal: 24, checkedInicial: true, checkedFinal: true },
    { id: createId(), nome: 'Cachaça Artesanal Mineira', categoria: 'Destilado', inicial: 8, final: 6, ideal: 8, checkedInicial: true, checkedFinal: true },
    { id: createId(), nome: 'Gin Tanqueray 750ml', categoria: 'Destilado', inicial: 6, final: null, ideal: 6, checkedInicial: true, checkedFinal: false },
    { id: createId(), nome: 'Vinho Tinto Malbec Reserva', categoria: 'Vinho', inicial: 12, final: 9, ideal: 12, checkedInicial: true, checkedFinal: true },
  ];
}

export function createStarterHistory(): ShiftRecord[] {
  const now = new Date();
  const op1Date = new Date(now);
  op1Date.setDate(op1Date.getDate() - 1);
  const op1ISO = toLocalDateISO(op1Date);
  // Simulate closing after midnight (01:25 of the following calendar day, still belonging to op1ISO)
  const op1Closed = new Date(op1Date.getFullYear(), op1Date.getMonth(), op1Date.getDate() + 1, 1, 25);

  const op2Date = new Date(now);
  op2Date.setDate(op2Date.getDate() - 2);
  const op2ISO = toLocalDateISO(op2Date);
  const op2Closed = new Date(op2Date.getFullYear(), op2Date.getMonth(), op2Date.getDate() + 1, 0, 45);

  const shift1Items: BeverageItem[] = [
    { id: 'h1-1', nome: 'Heineken 600ml', categoria: 'Cerveja', inicial: 72, final: 36, ideal: 72 },
    { id: 'h1-2', nome: 'Original 600ml', categoria: 'Cerveja', inicial: 60, final: 30, ideal: 60 },
    { id: 'h1-3', nome: 'Spaten Long Neck', categoria: 'Cerveja', inicial: 48, final: 28, ideal: 48 },
    { id: 'h1-4', nome: 'Coca-Cola Lata 350ml', categoria: 'Refrigerante', inicial: 60, final: 38, ideal: 60 },
    { id: 'h1-5', nome: 'Água Mineral Sem Gás 500ml', categoria: 'Água', inicial: 48, final: 32, ideal: 48 },
    { id: 'h1-6', nome: 'Suco de Laranja Integral 300ml', categoria: 'Suco', inicial: 24, final: 15, ideal: 24 },
    { id: 'h1-7', nome: 'Cachaça Artesanal Mineira', categoria: 'Destilado', inicial: 8, final: 5, ideal: 8 },
    { id: 'h1-8', nome: 'Vinho Tinto Malbec Reserva', categoria: 'Vinho', inicial: 12, final: 8, ideal: 12 },
  ];

  const shift2Items: BeverageItem[] = [
    { id: 'h2-1', nome: 'Heineken 600ml', categoria: 'Cerveja', inicial: 72, final: 48, ideal: 72 },
    { id: 'h2-2', nome: 'Original 600ml', categoria: 'Cerveja', inicial: 60, final: 40, ideal: 60 },
    { id: 'h2-3', nome: 'Coca-Cola Lata 350ml', categoria: 'Refrigerante', inicial: 60, final: 44, ideal: 60 },
    { id: 'h2-4', nome: 'Guaraná Antarctica Lata', categoria: 'Refrigerante', inicial: 36, final: 25, ideal: 36 },
    { id: 'h2-5', nome: 'Água Mineral Com Gás 500ml', categoria: 'Água', inicial: 36, final: 22, ideal: 36 },
    { id: 'h2-6', nome: 'Gin Tanqueray 750ml', categoria: 'Destilado', inicial: 6, final: 4, ideal: 6 },
  ];

  return [
    buildShiftSnapshot(shift1Items, op1ISO, op1Closed),
    buildShiftSnapshot(shift2Items, op2ISO, op2Closed),
  ];
}

export function loadInventory(): BeverageItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      const starter = createStarterBeverages();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(starter));
      return starter;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry.nome === 'string' && entry.nome.trim().length > 0)
      .map((entry) => {
        const inicial = sanitizeNumber(entry.inicial);
        const final = sanitizeNumber(entry.final);
        return {
          id: typeof entry.id === 'string' && entry.id ? entry.id : createId(),
          nome: entry.nome.trim(),
          categoria: isValidCategory(entry.categoria) ? entry.categoria : 'Outros',
          inicial,
          final,
          ideal: sanitizeNumber(entry.ideal),
          checkedInicial:
            typeof entry.checkedInicial === 'boolean' ? entry.checkedInicial : inicial !== null,
          checkedFinal:
            typeof entry.checkedFinal === 'boolean' ? entry.checkedFinal : final !== null,
        };
      });
  } catch {
    return [];
  }
}

export function saveInventory(items: BeverageItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadHistory(): ShiftRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw === null) {
      const starter = createStarterHistory();
      localStorage.setItem(HISTORY_KEY, JSON.stringify(starter));
      return starter;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(records: ShiftRecord[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage quota errors gracefully
  }
}
