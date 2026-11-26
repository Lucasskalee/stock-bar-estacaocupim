export const CATEGORIES = [
  'Cerveja',
  'Refrigerante',
  'Água',
  'Suco',
  'Destilado',
  'Vinho',
  'Outros',
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface BeverageItem {
  id: string;
  nome: string;
  categoria: Category;
  inicial: number | null;
  final: number | null;
  ideal: number | null;
  checkedInicial?: boolean;
  checkedFinal?: boolean;
}

export interface CurrentShiftMeta {
  /** Operational business day in YYYY-MM-DD (stays on opening day even after 00:00) */
  dataOperacional: string;
  /** ISO timestamp when this shift was opened */
  abertoEm: string;
}

export interface ShiftItemSnapshot {
  nome: string;
  categoria: Category;
  inicial: number | null;
  final: number | null;
  ideal: number | null;
  consumo: number | null;
  pedido: number | null;
}

export interface ShiftRecord {
  id: string;
  /** Operational business day in YYYY-MM-DD */
  dataOperacional?: string;
  abertoEm?: string;
  encerradoEm: string;
  rotulo: string;
  totalItens: number;
  itensConferidos: number;
  totalConsumo: number;
  totalPedir: number;
  consumoPorCategoria: Record<Category, number>;
  itens: ShiftItemSnapshot[];
}

export type ActiveTab = 'home' | 'checklist' | 'pedido' | 'historico';

export type ChecklistStage = 'inicial' | 'final' | 'completa';

export type StockStatus = 'repor' | 'ok' | 'pendente';

export interface ToastMessage {
  id: string;
  text: string;
  tone: 'neutral' | 'success' | 'alert';
}
