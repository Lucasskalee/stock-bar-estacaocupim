import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileDown,
  History,
  Home,
  ListChecks,
  Plus,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';
import {
  ActiveTab,
  BeverageItem,
  Category,
  ChecklistStage,
  CurrentShiftMeta,
  ShiftRecord,
  ToastMessage,
} from './types/inventory';
import {
  buildShiftSnapshot,
  computeSummary,
  createId,
  createStarterBeverages,
  formatBusinessDateLong,
  formatBusinessDateShort,
  isClosingAfterMidnight,
  isFinalChecked,
  isInitialChecked,
  loadCurrentShiftMeta,
  loadHistory,
  loadInventory,
  saveCurrentShiftMeta,
  saveHistory,
  saveInventory,
  toLocalDateISO,
} from './utils/calculations';
import { generateInventoryPdf } from './utils/pdfExport';
import { copyTextToClipboard, formatWhatsAppOrder } from './utils/whatsappFormat';
import { useFirebaseAuth } from './contexts/AuthContext';
import {
  batchResetCountsCloud,
  batchRolloverShiftCloud,
  batchSeedBeveragesCloud,
  createBeverageCloud,
  deleteBeverageCloud,
  deleteShiftRecordCloud,
  migrateLocalToCloudIfEmpty,
  subscribeBeverages,
  subscribeShiftHistory,
  subscribeShiftMeta,
  updateBeverageCountCloud,
  updateBeverageMetadataCloud,
  upsertShiftMetaCloud,
} from './services/firestoreSync';
import { BrandMark } from './components/BrandMark';
import { HomeDashboardView } from './components/HomeDashboardView';
import { ChecklistView } from './components/ChecklistView';
import { OrderView } from './components/OrderView';
import { HistoryView } from './components/HistoryView';
import { BeverageModal } from './components/BeverageModal';
import { ConfirmActionModal, NewShiftModal } from './components/ConfirmDialogs';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CloudSyncButton } from './components/CloudSyncButton';

export default function App() {
  const { user, authReady, authError } = useFirebaseAuth();
  const [items, setItems] = useState<BeverageItem[]>(() => loadInventory());
  const [history, setHistory] = useState<ShiftRecord[]>(() => loadHistory());
  const [shiftMeta, setShiftMeta] = useState<CurrentShiftMeta>(() => loadCurrentShiftMeta());
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [checklistStage, setChecklistStage] = useState<ChecklistStage>('final');
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [fatalSyncError, setFatalSyncError] = useState<Error | null>(null);

  // Keep latest local state available for first-time cloud migration without re-running effect
  const latestLocalRef = useRef({ items, shiftMeta, history });
  latestLocalRef.current = { items, shiftMeta, history };

  // Desktop interactive left sidebar: starts compact on the left, opens on hover or toggle button
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const sidebarExpanded = sidebarPinned || sidebarHovered;

  // Modals
  const [beverageModalOpen, setBeverageModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BeverageItem | null>(null);
  const [newShiftModalOpen, setNewShiftModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<BeverageItem | null>(null);
  const [shiftToDeleteId, setShiftToDeleteId] = useState<string | null>(null);

  // Feedback
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [copiedRecently, setCopiedRecently] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const summary = useMemo(() => computeSummary(items), [items]);
  const afterMidnight = isClosingAfterMidnight(shiftMeta.dataOperacional, new Date());

  // Surface fatal Firestore errors to ErrorBoundary cleanly
  if (fatalSyncError) {
    throw fatalSyncError;
  }

  const showToast = useCallback((text: string, tone: ToastMessage['tone'] = 'neutral') => {
    const id = createId();
    setToasts((prev) => [...prev.slice(-2), { id, text, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  useEffect(() => {
    if (authError) {
      showToast(authError, 'alert');
    }
  }, [authError, showToast]);

  // Mirror state to localStorage for instant offline PWA reloads
  useEffect(() => {
    saveInventory(items);
  }, [items]);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  useEffect(() => {
    saveCurrentShiftMeta(shiftMeta);
  }, [shiftMeta]);

  // Real-time Firestore subscriptions (ONLY attached when auth is ready and user is authenticated)
  useEffect(() => {
    if (!authReady || !user) {
      setCloudSyncing(false);
      return;
    }

    let cancelled = false;
    let unsubBeverages: (() => void) | null = null;
    let unsubMeta: (() => void) | null = null;
    let unsubHistory: (() => void) | null = null;

    const uid = user.uid;
    setCloudSyncing(true);

    const startSync = async () => {
      try {
        const snapshot = latestLocalRef.current;
        const migrated = await migrateLocalToCloudIfEmpty(
          uid,
          snapshot.items,
          snapshot.shiftMeta,
          snapshot.history
        );
        if (cancelled) return;

        if (migrated) {
          showToast('Estoque local sincronizado com o Firebase.', 'success');
        }

        unsubBeverages = subscribeBeverages(
          uid,
          (cloudItems) => {
            if (cancelled) return;
            setItems(cloudItems);
            setCloudSyncing(false);
          },
          (err) => {
            if (!cancelled) setFatalSyncError(err);
          }
        );

        unsubMeta = subscribeShiftMeta(
          uid,
          (cloudMeta) => {
            if (cancelled || !cloudMeta) return;
            setShiftMeta(cloudMeta);
          },
          (err) => {
            if (!cancelled) setFatalSyncError(err);
          }
        );

        unsubHistory = subscribeShiftHistory(
          uid,
          (cloudHistory) => {
            if (cancelled) return;
            setHistory(cloudHistory);
          },
          (err) => {
            if (!cancelled) setFatalSyncError(err);
          }
        );
      } catch (err) {
        if (!cancelled && err instanceof Error) {
          setFatalSyncError(err);
        }
      }
    };

    void startSync();

    return () => {
      cancelled = true;
      unsubBeverages?.();
      unsubMeta?.();
      unsubHistory?.();
    };
  }, [authReady, user, showToast]);

  const handleChangeShiftDate = useCallback(
    (nextISO: string) => {
      const nextMeta: CurrentShiftMeta = { ...shiftMeta, dataOperacional: nextISO };
      setShiftMeta(nextMeta);
      showToast(`Data do turno definida para ${formatBusinessDateShort(nextISO)}.`, 'neutral');

      if (user) {
        void upsertShiftMetaCloud(user.uid, nextMeta).catch((err) => {
          if (err instanceof Error) setFatalSyncError(err);
        });
      }
    },
    [shiftMeta, showToast, user]
  );

  const handleUpdateField = useCallback(
    (id: string, field: 'inicial' | 'final' | 'ideal', value: number | null) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          if (field === 'inicial') {
            return { ...item, inicial: value, checkedInicial: value !== null };
          }
          if (field === 'final') {
            return { ...item, final: value, checkedFinal: value !== null };
          }
          return { ...item, ideal: value };
        })
      );

      if (user) {
        const patch =
          field === 'inicial'
            ? { inicial: value, checkedInicial: value !== null }
            : field === 'final'
              ? { final: value, checkedFinal: value !== null }
              : { ideal: value };
        void updateBeverageCountCloud(user.uid, id, patch).catch((err) => {
          if (err instanceof Error) setFatalSyncError(err);
        });
      }
    },
    [user]
  );

  const handleToggleCheck = useCallback(
    (id: string, stage: 'inicial' | 'final') => {
      let cloudPatch: Partial<BeverageItem> | null = null;

      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          if (stage === 'inicial') {
            const nextChecked = !isInitialChecked(item);
            const nextVal = nextChecked && item.inicial === null ? (item.ideal ?? 0) : item.inicial;
            cloudPatch = { checkedInicial: nextChecked, inicial: nextVal };
            return { ...item, ...cloudPatch };
          }
          const nextChecked = !isFinalChecked(item);
          const nextVal = nextChecked && item.final === null ? (item.inicial ?? 0) : item.final;
          cloudPatch = { checkedFinal: nextChecked, final: nextVal };
          return { ...item, ...cloudPatch };
        })
      );

      if (user && cloudPatch) {
        void updateBeverageCountCloud(user.uid, id, cloudPatch).catch((err) => {
          if (err instanceof Error) setFatalSyncError(err);
        });
      }
    },
    [user]
  );

  const handleSaveBeverage = useCallback(
    (payload: {
      id?: string;
      nome: string;
      categoria: Category;
      ideal: number | null;
      inicial?: number | null;
    }) => {
      if (payload.id) {
        const targetId = payload.id;
        setItems((prev) =>
          prev.map((item) =>
            item.id === targetId
              ? {
                  ...item,
                  nome: payload.nome,
                  categoria: payload.categoria,
                  ideal: payload.ideal,
                }
              : item
          )
        );
        showToast(`${payload.nome} atualizado.`, 'success');

        if (user) {
          void updateBeverageMetadataCloud(user.uid, targetId, {
            nome: payload.nome,
            categoria: payload.categoria,
            ideal: payload.ideal,
          }).catch((err) => {
            if (err instanceof Error) setFatalSyncError(err);
          });
        }
      } else {
        const initVal = payload.inicial ?? null;
        const newItem: BeverageItem = {
          id: createId(),
          nome: payload.nome,
          categoria: payload.categoria,
          inicial: initVal,
          final: null,
          ideal: payload.ideal,
          checkedInicial: initVal !== null,
          checkedFinal: false,
        };
        setItems((prev) => [...prev, newItem]);
        showToast(`${payload.nome} cadastrado no estoque.`, 'success');

        if (user) {
          void createBeverageCloud(user.uid, newItem).catch((err) => {
            if (err instanceof Error) setFatalSyncError(err);
          });
        }
      }
    },
    [showToast, user]
  );

  const handleConfirmDeleteItem = useCallback(() => {
    if (!itemToDelete) return;
    const removedId = itemToDelete.id;
    const removedName = itemToDelete.nome;
    setItems((prev) => prev.filter((i) => i.id !== removedId));
    setItemToDelete(null);
    showToast(`${removedName} removido.`, 'neutral');

    if (user) {
      void deleteBeverageCloud(user.uid, removedId).catch((err) => {
        if (err instanceof Error) setFatalSyncError(err);
      });
    }
  }, [itemToDelete, showToast, user]);

  const handleConfirmNewShift = useCallback(
    ({
      saveToHistory,
      closingDate,
      nextShiftDate,
    }: {
      saveToHistory: boolean;
      closingDate: string;
      nextShiftDate: string;
    }) => {
      const now = new Date();
      const snapshot =
        saveToHistory && items.length > 0
          ? buildShiftSnapshot(items, closingDate, now, shiftMeta.abertoEm)
          : undefined;

      if (snapshot) {
        setHistory((prev) => [snapshot, ...prev].slice(0, 60));
      }

      const currentItemsSnapshot = items;
      setItems((prev) =>
        prev.map((item) => {
          const nextInicial = item.final !== null ? item.final : item.inicial;
          return {
            ...item,
            inicial: nextInicial,
            final: null,
            checkedInicial: nextInicial !== null,
            checkedFinal: false,
          };
        })
      );

      const nextMeta: CurrentShiftMeta = {
        dataOperacional: nextShiftDate,
        abertoEm: now.toISOString(),
      };
      setShiftMeta(nextMeta);
      setNewShiftModalOpen(false);

      showToast(
        saveToHistory
          ? `Turno de ${formatBusinessDateShort(closingDate)} salvo. Próximo turno aberto em ${formatBusinessDateShort(nextShiftDate)}.`
          : `Novo turno aberto para ${formatBusinessDateShort(nextShiftDate)}.`,
        'success'
      );

      if (user) {
        void batchRolloverShiftCloud(user.uid, currentItemsSnapshot, nextMeta, snapshot).catch(
          (err) => {
            if (err instanceof Error) setFatalSyncError(err);
          }
        );
      }
    },
    [items, shiftMeta.abertoEm, showToast, user]
  );

  const handleConfirmResetCounts = useCallback(() => {
    const currentSnapshot = items;
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        inicial: null,
        final: null,
        checkedInicial: false,
        checkedFinal: false,
      }))
    );
    showToast('Contagens inicial e final zeradas.', 'neutral');

    if (user) {
      void batchResetCountsCloud(user.uid, currentSnapshot).catch((err) => {
        if (err instanceof Error) setFatalSyncError(err);
      });
    }
  }, [items, showToast, user]);

  const handleLoadStarter = useCallback(() => {
    const starter = createStarterBeverages();
    setItems(starter);
    showToast('Cardápio exemplo da Estação Cupim carregado.', 'success');

    if (user) {
      void batchSeedBeveragesCloud(user.uid, starter).catch((err) => {
        if (err instanceof Error) setFatalSyncError(err);
      });
    }
  }, [showToast, user]);

  const handleCopyWhatsApp = useCallback(async () => {
    const text = formatWhatsAppOrder(items, shiftMeta.dataOperacional);
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedRecently(true);
      showToast('Pedido copiado e pronto para colar no WhatsApp.', 'success');
      setTimeout(() => setCopiedRecently(false), 2400);
    } else {
      showToast('Não foi possível copiar automaticamente. Selecione o texto na prévia.', 'alert');
    }
  }, [items, shiftMeta.dataOperacional, showToast]);

  const handleExportCurrentPdf = useCallback(async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const fileName = await generateInventoryPdf(items, {
        dataOperacional: shiftMeta.dataOperacional,
      });
      showToast(`Relatório ${fileName} gerado.`, 'success');
    } catch {
      showToast('Erro ao gerar relatório PDF.', 'alert');
    } finally {
      setIsExportingPdf(false);
    }
  }, [isExportingPdf, items, shiftMeta.dataOperacional, showToast]);

  const handleExportShiftPdf = useCallback(
    async (record: ShiftRecord) => {
      try {
        const mapped: BeverageItem[] = record.itens.map((snap, idx) => ({
          id: `${record.id}-${idx}`,
          nome: snap.nome,
          categoria: snap.categoria,
          inicial: snap.inicial,
          final: snap.final,
          ideal: snap.ideal,
        }));
        const closedDate = new Date(record.encerradoEm);
        const shiftDate = record.dataOperacional ?? toLocalDateISO(closedDate);
        const fileName = await generateInventoryPdf(mapped, {
          dataOperacional: shiftDate,
          customTitle: `Histórico · Turno de ${formatBusinessDateShort(shiftDate)} · Estação Cupim`,
          emittedAt: closedDate,
        });
        showToast(`PDF ${fileName} baixado.`, 'success');
      } catch {
        showToast('Erro ao exportar PDF do turno.', 'alert');
      }
    },
    [showToast]
  );

  const handleConfirmDeleteShift = useCallback(() => {
    if (!shiftToDeleteId) return;
    const targetId = shiftToDeleteId;
    setHistory((prev) => prev.filter((r) => r.id !== targetId));
    setShiftToDeleteId(null);
    showToast('Registro de turno removido do histórico.', 'neutral');

    if (user) {
      void deleteShiftRecordCloud(user.uid, targetId).catch((err) => {
        if (err instanceof Error) setFatalSyncError(err);
      });
    }
  }, [shiftToDeleteId, showToast, user]);

  const handleGoToChecklist = useCallback((stage: ChecklistStage) => {
    setChecklistStage(stage);
    setActiveTab('checklist');
  }, []);

  const openAddBeverage = useCallback(() => {
    setEditingItem(null);
    setBeverageModalOpen(true);
  }, []);

  const activeTitle =
    activeTab === 'home'
      ? 'Estoque afinado, da abertura à última dose.'
      : activeTab === 'checklist'
        ? 'Checklist de Estoque'
        : activeTab === 'pedido'
          ? 'Pedido Sugerido'
          : 'Histórico e Consumo';

  const desktopNavItems: Array<{
    id: ActiveTab;
    label: string;
    icon: typeof Home;
    badge?: number;
  }> = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'checklist', label: 'Checklist', icon: ListChecks },
    { id: 'pedido', label: 'Pedidos', icon: ShoppingBag, badge: summary.itensParaRepor },
    { id: 'historico', label: 'Histórico', icon: History, badge: history.length },
  ];

  return (
    <div className="min-h-screen bg-[#0E0D0B] text-[#F5F0E8] flex flex-col lg:flex-row">
      {/* DESKTOP INTERACTIVE COLLAPSIBLE LEFT SIDEBAR */}
      <aside
        aria-label="Menu lateral interativo"
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 z-40 bg-[#141210]/98 backdrop-blur-md border-r border-[#FFF4E0]/8 transition-[width] duration-200 ease-out overflow-hidden ${
          sidebarExpanded ? 'w-64 shadow-2xl shadow-black/50' : 'w-[82px]'
        }`}
      >
        {/* Borderless Larger Logo Area */}
        <div
          className={`border-b border-[#FFF4E0]/8 flex items-center justify-center transition-all duration-200 ${
            sidebarExpanded ? 'px-5 pt-5 pb-4 min-h-[156px]' : 'px-2 py-4 min-h-[84px]'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D98A2B] rounded-xl cursor-pointer"
            title="Ir para Início"
          >
            <BrandMark variant={sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'} />
          </button>
        </div>

        {/* Navigation Items + Primary Add Button */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          <button
            type="button"
            onClick={openAddBeverage}
            title="Cadastrar nova bebida"
            className={`w-full min-h-[44px] flex items-center rounded-xl bg-[#D98A2B] hover:bg-[#E89B3C] text-[#0E0D0B] font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap mb-3 ${
              sidebarExpanded ? 'px-3.5 gap-3 justify-start' : 'justify-center px-0'
            }`}
          >
            <Plus className="w-5 h-5 shrink-0" strokeWidth={2.5} />
            {sidebarExpanded && <span>Nova bebida</span>}
          </button>

          {desktopNavItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                title={!sidebarExpanded ? item.label : undefined}
                aria-current={active ? 'page' : undefined}
                className={`w-full min-h-[44px] flex items-center rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  sidebarExpanded ? 'px-3.5 justify-between gap-3' : 'justify-center px-0 relative'
                } ${
                  active
                    ? 'bg-[#D98A2B]/14 text-[#F5F0E8]'
                    : 'text-[#A69D8E] hover:text-[#F5F0E8] hover:bg-[#1F1C18]'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      active ? 'text-[#D98A2B]' : 'text-[#8C8375]'
                    }`}
                    strokeWidth={active ? 2.25 : 1.8}
                  />
                  {sidebarExpanded && <span className="truncate">{item.label}</span>}
                </span>

                {sidebarExpanded && item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      item.id === 'pedido'
                        ? 'text-[#E05A47] font-semibold'
                        : 'text-[#736B5E]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {!sidebarExpanded && item.id === 'pedido' && (item.badge ?? 0) > 0 && (
                  <span className="absolute top-1.5 right-2.5 font-mono text-[10px] font-bold tabular-nums text-[#E05A47]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Utility Actions, Cloud Auth, PWA Install & Expand/Collapse Toggle */}
        <div className="p-3 border-t border-[#FFF4E0]/8 space-y-1.5">
          <CloudSyncButton
            variant="sidebar"
            sidebarExpanded={sidebarExpanded}
            syncing={cloudSyncing}
            onSignedIn={() => showToast('Conectado ao Firebase em tempo real!', 'success')}
            onSignedOut={() => showToast('Sessão encerrada. Continuando em modo local.', 'neutral')}
          />

          <PWAInstallButton
            variant="sidebar"
            sidebarExpanded={sidebarExpanded}
            onInstalled={() => showToast('Stokbar Cupim instalado no dispositivo!', 'success')}
          />

          <button
            type="button"
            onClick={handleExportCurrentPdf}
            disabled={isExportingPdf}
            title={!sidebarExpanded ? 'Gerar relatório PDF A4' : undefined}
            className={`w-full min-h-[42px] flex items-center rounded-xl bg-[#1F1C18] hover:bg-[#27231D] border border-[#FFF4E0]/8 text-sm font-medium text-[#F5F0E8] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60 ${
              sidebarExpanded ? 'px-3.5 gap-3 justify-start' : 'justify-center px-0'
            }`}
          >
            <FileDown className="w-4 h-4 text-[#D98A2B] shrink-0" />
            {sidebarExpanded && <span>{isExportingPdf ? 'Gerando PDF...' : 'Relatório PDF'}</span>}
          </button>

          <button
            type="button"
            onClick={() => setNewShiftModalOpen(true)}
            title={!sidebarExpanded ? 'Fechar turno' : undefined}
            className={`w-full min-h-[40px] flex items-center rounded-xl text-sm font-medium text-[#A69D8E] hover:text-[#F5F0E8] hover:bg-[#1F1C18] transition-colors cursor-pointer whitespace-nowrap ${
              sidebarExpanded ? 'px-3.5 gap-3 justify-start' : 'justify-center px-0'
            }`}
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            {sidebarExpanded && <span>Fechar turno</span>}
          </button>

          <button
            type="button"
            onClick={() => setResetModalOpen(true)}
            title={!sidebarExpanded ? 'Zerar contagens' : undefined}
            className={`w-full min-h-[40px] flex items-center rounded-xl text-sm font-medium text-[#A69D8E] hover:text-[#E05A47] hover:bg-[#E05A47]/10 transition-colors cursor-pointer whitespace-nowrap ${
              sidebarExpanded ? 'px-3.5 gap-3 justify-start' : 'justify-center px-0'
            }`}
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            {sidebarExpanded && <span>Zerar contagens</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setSidebarPinned((prev) => {
                const next = !prev;
                if (!next) setSidebarHovered(false);
                return next;
              });
            }}
            aria-label={sidebarPinned ? 'Recolher menu lateral' : 'Fixar menu lateral aberto'}
            className={`w-full min-h-[38px] mt-1 flex items-center rounded-xl text-xs font-medium text-[#736B5E] hover:text-[#F5F0E8] hover:bg-[#1F1C18] transition-colors cursor-pointer whitespace-nowrap ${
              sidebarExpanded ? 'px-3.5 gap-2.5 justify-start' : 'justify-center px-0'
            }`}
          >
            {sidebarExpanded ? (
              <>
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span>{sidebarPinned ? 'Recolher menu' : 'Fixar aberto'}</span>
              </>
            ) : (
              <ChevronRight className="w-4 h-4 shrink-0" />
            )}
          </button>
        </div>
      </aside>

      {/* MOBILE COMPACT TOP HEADER */}
      <header className="lg:hidden sticky top-0 z-30 h-14 px-4 flex items-center justify-between gap-2 bg-[#141210]/95 backdrop-blur-md border-b border-[#FFF4E0]/8">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="text-left focus-visible:outline-none cursor-pointer min-w-0"
        >
          <BrandMark variant="header" />
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <CloudSyncButton
            variant="header"
            syncing={cloudSyncing}
            onSignedIn={() => showToast('Conectado ao Firebase em tempo real!', 'success')}
            onSignedOut={() => showToast('Sessão encerrada. Continuando em modo local.', 'neutral')}
          />
          <PWAInstallButton
            variant="header"
            onInstalled={() => showToast('Stokbar Cupim instalado no dispositivo!', 'success')}
          />
          <button
            type="button"
            onClick={handleExportCurrentPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg bg-[#1F1C18] hover:bg-[#27231D] border border-[#FFF4E0]/10 text-[#F5F0E8] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <FileDown className="w-3.5 h-3.5 text-[#D98A2B]" />
            <span>PDF</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT VIEWPORT */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[padding-left] duration-200 ease-out ${
          sidebarPinned ? 'lg:pl-64' : 'lg:pl-[82px]'
        }`}
      >
        {/* DESKTOP CONTEXTUAL TOP BAR */}
        <header className="hidden lg:flex items-center justify-between gap-8 h-16 px-8 border-b border-[#FFF4E0]/8 bg-[#0E0D0B]/95 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="font-display text-xl font-semibold tracking-tight text-[#F5F0E8] whitespace-nowrap">
              {activeTitle}
            </h1>
            <span className="text-xs text-[#A69D8E] whitespace-nowrap truncate">
              Turno de {formatBusinessDateShort(shiftMeta.dataOperacional)} ·{' '}
              <span className="capitalize">{formatBusinessDateLong(shiftMeta.dataOperacional)}</span>
              {afterMidnight ? ' · após 00:00' : ''}
            </span>
          </div>

          <button
            type="button"
            onClick={openAddBeverage}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#D98A2B] hover:bg-[#E89B3C] text-[#0E0D0B] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova bebida
          </button>
        </header>

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 lg:pt-7 pb-28 lg:pb-12">
          {/* Mobile page heading + operational shift date */}
          <div className="lg:hidden mb-4">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-[#F5F0E8] text-balance leading-snug">
              {activeTitle}
            </h1>
            <p className="text-xs text-[#A69D8E] mt-1">
              Turno de {formatBusinessDateShort(shiftMeta.dataOperacional)}
              {afterMidnight ? ' · fechamento após 00:00' : ''}
              {user ? ' · Sincronizado no Firebase' : ''}
            </p>
          </div>

          {activeTab === 'home' && (
            <HomeDashboardView
              items={items}
              history={history}
              dataOperacional={shiftMeta.dataOperacional}
              onChangeShiftDate={handleChangeShiftDate}
              onGoToChecklist={handleGoToChecklist}
              onGoToOrders={() => setActiveTab('pedido')}
              onGoToHistory={() => setActiveTab('historico')}
              onOpenAddModal={openAddBeverage}
              onLoadStarter={handleLoadStarter}
              onOpenNewShift={() => setNewShiftModalOpen(true)}
              onOpenResetCounts={() => setResetModalOpen(true)}
              onCopyWhatsApp={handleCopyWhatsApp}
              onExportPdf={handleExportCurrentPdf}
              copiedRecently={copiedRecently}
            />
          )}

          {activeTab === 'checklist' && (
            <ChecklistView
              items={items}
              stage={checklistStage}
              onChangeStage={setChecklistStage}
              onUpdateField={handleUpdateField}
              onToggleCheck={handleToggleCheck}
              onEditItem={(item) => {
                setEditingItem(item);
                setBeverageModalOpen(true);
              }}
              onRequestDelete={(item) => setItemToDelete(item)}
              onOpenAddModal={openAddBeverage}
              onLoadStarter={handleLoadStarter}
              onGoToOrders={() => setActiveTab('pedido')}
            />
          )}

          {activeTab === 'pedido' && (
            <OrderView
              items={items}
              dataOperacional={shiftMeta.dataOperacional}
              onCopyWhatsApp={handleCopyWhatsApp}
              onExportPdf={handleExportCurrentPdf}
              copiedRecently={copiedRecently}
            />
          )}

          {activeTab === 'historico' && (
            <HistoryView
              currentItems={items}
              history={history}
              onOpenNewShift={() => setNewShiftModalOpen(true)}
              onExportShiftPdf={handleExportShiftPdf}
              onDeleteShift={(id) => setShiftToDeleteId(id)}
            />
          )}
        </main>
      </div>

      {/* MOBILE SOCIAL-APP FLOATING GLASS BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="Navegação inferior"
        className="lg:hidden fixed bottom-3 left-3 right-3 mb-safe z-40 rounded-3xl bg-[#171512]/65 backdrop-blur-xl border border-[#FFF4E0]/14 shadow-[0_12px_36px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,244,224,0.08)]"
      >
        <div className="grid grid-cols-5 items-center h-[60px] px-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            aria-current={activeTab === 'home' ? 'page' : undefined}
            className={`h-full min-h-[44px] rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              activeTab === 'home' ? 'text-[#D98A2B]' : 'text-[#C2B9AA]'
            }`}
          >
            <Home className="w-5 h-5" strokeWidth={activeTab === 'home' ? 2.4 : 1.8} />
            <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">
              Início
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            aria-current={activeTab === 'checklist' ? 'page' : undefined}
            className={`h-full min-h-[44px] rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              activeTab === 'checklist' ? 'text-[#D98A2B]' : 'text-[#C2B9AA]'
            }`}
          >
            <ListChecks className="w-5 h-5" strokeWidth={activeTab === 'checklist' ? 2.4 : 1.8} />
            <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">
              Checklist
            </span>
          </button>

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={openAddBeverage}
              aria-label="Cadastrar nova bebida"
              className="-mt-6 w-13 h-13 rounded-2xl bg-[#D98A2B] hover:bg-[#E89B3C] active:scale-95 text-[#0E0D0B] shadow-lg shadow-[#D98A2B]/30 ring-4 ring-[#0E0D0B]/85 flex items-center justify-center transition-transform cursor-pointer"
            >
              <Plus className="w-6 h-6" strokeWidth={2.75} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('pedido')}
            aria-current={activeTab === 'pedido' ? 'page' : undefined}
            className={`h-full min-h-[44px] rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              activeTab === 'pedido' ? 'text-[#D98A2B]' : 'text-[#C2B9AA]'
            }`}
          >
            <div className="flex items-center gap-0.5">
              <ShoppingBag className="w-5 h-5" strokeWidth={activeTab === 'pedido' ? 2.4 : 1.8} />
              {summary.itensParaRepor > 0 && (
                <span className="font-mono text-[10px] font-bold tabular-nums text-[#E05A47]">
                  {summary.itensParaRepor}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">
              Pedidos
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historico')}
            aria-current={activeTab === 'historico' ? 'page' : undefined}
            className={`h-full min-h-[44px] rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              activeTab === 'historico' ? 'text-[#D98A2B]' : 'text-[#C2B9AA]'
            }`}
          >
            <History className="w-5 h-5" strokeWidth={activeTab === 'historico' ? 2.4 : 1.8} />
            <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">
              Histórico
            </span>
          </button>
        </div>
      </nav>

      {/* MODALS */}
      <BeverageModal
        isOpen={beverageModalOpen}
        editingItem={editingItem}
        onClose={() => {
          setBeverageModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveBeverage}
      />

      <NewShiftModal
        isOpen={newShiftModalOpen}
        summary={summary}
        dataOperacional={shiftMeta.dataOperacional}
        onClose={() => setNewShiftModalOpen(false)}
        onConfirm={handleConfirmNewShift}
      />

      <ConfirmActionModal
        isOpen={resetModalOpen}
        title="Zerar contagens do turno?"
        description="As quantidades inicial e final de todas as bebidas serão limpas. O cadastro de bebidas e o estoque ideal serão mantidos."
        confirmLabel="Zerar contagens"
        destructive
        onClose={() => setResetModalOpen(false)}
        onConfirm={handleConfirmResetCounts}
      />

      <ConfirmActionModal
        isOpen={itemToDelete !== null}
        title="Remover bebida?"
        description={
          itemToDelete
            ? `Tem certeza que deseja remover "${itemToDelete.nome}" da lista de estoque?`
            : ''
        }
        confirmLabel="Remover"
        destructive
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDeleteItem}
      />

      <ConfirmActionModal
        isOpen={shiftToDeleteId !== null}
        title="Excluir registro de turno?"
        description="Este fechamento será removido permanentemente do histórico."
        confirmLabel="Excluir"
        destructive
        onClose={() => setShiftToDeleteId(null)}
        onConfirm={handleConfirmDeleteShift}
      />

      <OfflineIndicator />

      {/* TOAST NOTIFICATIONS */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-22 lg:bottom-6 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 items-end pointer-events-none"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto max-w-sm px-4 py-3 rounded-xl border text-sm font-medium shadow-xl backdrop-blur-md ${
                toast.tone === 'success'
                  ? 'bg-[#171512]/95 border-[#D98A2B]/40 text-[#F5F0E8]'
                  : toast.tone === 'alert'
                    ? 'bg-[#171512]/95 border-[#E05A47]/50 text-[#F5F0E8]'
                    : 'bg-[#171512]/95 border-[#FFF4E0]/12 text-[#F5F0E8]'
              }`}
            >
              {toast.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
