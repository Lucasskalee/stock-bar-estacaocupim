import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  BeverageItem,
  CATEGORIES,
  Category,
  CurrentShiftMeta,
  ShiftRecord,
} from '../types/inventory';
import {
  createId,
  getDefaultBusinessDate,
  isValidCategory,
  sanitizeNumber,
} from '../utils/calculations';

const MAX_NAME_LENGTH = 120;
const MAX_ROTULO_LENGTH = 60;
const MAX_ISO_LENGTH = 40;
const MAX_STOCK_VAL = 100000;
const MAX_SHIFT_ITEMS = 200;
const DATE_REGEX = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

function clampStock(val: number | null | undefined): number | null {
  const n = sanitizeNumber(val);
  if (n === null) return null;
  return Math.min(MAX_STOCK_VAL, Math.max(0, n));
}

function safeDocId(rawId?: string): string {
  if (rawId && SAFE_ID_REGEX.test(rawId)) return rawId;
  return createId().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

function sanitizeCategory(cat: unknown): Category {
  return isValidCategory(cat) ? cat : 'Outros';
}

function sanitizeDateISO(val: string): string {
  return DATE_REGEX.test(val) ? val : getDefaultBusinessDate(new Date());
}

function beveragesColPath(uid: string): string {
  return `users/${uid}/beverages`;
}

function shiftMetaDocPath(uid: string): string {
  return `users/${uid}/meta/currentShift`;
}

function shiftsColPath(uid: string): string {
  return `users/${uid}/shifts`;
}

export function subscribeBeverages(
  uid: string,
  onData: (items: BeverageItem[], fromCloudCount: number) => void,
  onError?: (err: Error) => void
): () => void {
  const colPath = beveragesColPath(uid);
  const q = query(collection(db, colPath), where('ownerId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Array<{ item: BeverageItem; sortMs: number }> = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const createdMs =
          d.createdAt && typeof d.createdAt.toMillis === 'function'
            ? d.createdAt.toMillis()
            : 0;
        list.push({
          sortMs: createdMs,
          item: {
            id: docSnap.id,
            nome: typeof d.nome === 'string' ? d.nome : 'Bebida',
            categoria: sanitizeCategory(d.categoria),
            inicial: clampStock(d.inicial),
            final: clampStock(d.final),
            ideal: clampStock(d.ideal),
            checkedInicial: Boolean(d.checkedInicial),
            checkedFinal: Boolean(d.checkedFinal),
          },
        });
      });

      list.sort((a, b) => a.sortMs - b.sortMs || a.item.nome.localeCompare(b.item.nome, 'pt-BR'));
      onData(
        list.map((entry) => entry.item),
        list.length
      );
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, colPath);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        } else {
          throw wrapped;
        }
      }
    }
  );
}

export function subscribeShiftMeta(
  uid: string,
  onData: (meta: CurrentShiftMeta | null) => void,
  onError?: (err: Error) => void
): () => void {
  const docPath = shiftMetaDocPath(uid);
  const ref = doc(db, 'users', uid, 'meta', 'currentShift');

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const d = snap.data();
      onData({
        dataOperacional: sanitizeDateISO(String(d.dataOperacional ?? '')),
        abertoEm: typeof d.abertoEm === 'string' ? d.abertoEm : new Date().toISOString(),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, docPath);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        } else {
          throw wrapped;
        }
      }
    }
  );
}

export function subscribeShiftHistory(
  uid: string,
  onData: (records: ShiftRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colPath = shiftsColPath(uid);
  const q = query(collection(db, colPath), where('ownerId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const records: ShiftRecord[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const catMap = {} as Record<Category, number>;
        for (const cat of CATEGORIES) {
          const val = d.consumoPorCategoria?.[cat];
          catMap[cat] = typeof val === 'number' && Number.isFinite(val) ? Math.max(0, val) : 0;
        }
        records.push({
          id: docSnap.id,
          dataOperacional:
            typeof d.dataOperacional === 'string' && DATE_REGEX.test(d.dataOperacional)
              ? d.dataOperacional
              : undefined,
          abertoEm: typeof d.abertoEm === 'string' ? d.abertoEm : undefined,
          encerradoEm:
            typeof d.encerradoEm === 'string' ? d.encerradoEm : new Date().toISOString(),
          rotulo: typeof d.rotulo === 'string' ? d.rotulo : 'Turno',
          totalItens: Number(d.totalItens) || 0,
          itensConferidos: Number(d.itensConferidos) || 0,
          totalConsumo: Number(d.totalConsumo) || 0,
          totalPedir: Number(d.totalPedir) || 0,
          consumoPorCategoria: catMap,
          itens: Array.isArray(d.itens) ? d.itens : [],
        });
      });

      records.sort(
        (a, b) => new Date(b.encerradoEm).getTime() - new Date(a.encerradoEm).getTime()
      );
      onData(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, colPath);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        } else {
          throw wrapped;
        }
      }
    }
  );
}

export async function createBeverageCloud(uid: string, item: BeverageItem): Promise<void> {
  const id = safeDocId(item.id);
  const path = `${beveragesColPath(uid)}/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'beverages', id), {
      ownerId: uid,
      nome: item.nome.trim().slice(0, MAX_NAME_LENGTH) || 'Bebida',
      categoria: sanitizeCategory(item.categoria),
      inicial: clampStock(item.inicial),
      final: clampStock(item.final),
      ideal: clampStock(item.ideal),
      checkedInicial: Boolean(item.checkedInicial),
      checkedFinal: Boolean(item.checkedFinal),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateBeverageMetadataCloud(
  uid: string,
  id: string,
  payload: { nome: string; categoria: Category; ideal: number | null }
): Promise<void> {
  const docId = safeDocId(id);
  const path = `${beveragesColPath(uid)}/${docId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'beverages', docId), {
      nome: payload.nome.trim().slice(0, MAX_NAME_LENGTH) || 'Bebida',
      categoria: sanitizeCategory(payload.categoria),
      ideal: clampStock(payload.ideal),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateBeverageCountCloud(
  uid: string,
  id: string,
  patch: Partial<Pick<BeverageItem, 'inicial' | 'final' | 'ideal' | 'checkedInicial' | 'checkedFinal'>>
): Promise<void> {
  const docId = safeDocId(id);
  const path = `${beveragesColPath(uid)}/${docId}`;
  const cleanPatch: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if ('inicial' in patch) cleanPatch.inicial = clampStock(patch.inicial);
  if ('final' in patch) cleanPatch.final = clampStock(patch.final);
  if ('ideal' in patch) cleanPatch.ideal = clampStock(patch.ideal);
  if ('checkedInicial' in patch) cleanPatch.checkedInicial = Boolean(patch.checkedInicial);
  if ('checkedFinal' in patch) cleanPatch.checkedFinal = Boolean(patch.checkedFinal);

  try {
    await updateDoc(doc(db, 'users', uid, 'beverages', docId), cleanPatch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBeverageCloud(uid: string, id: string): Promise<void> {
  const docId = safeDocId(id);
  const path = `${beveragesColPath(uid)}/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'beverages', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertShiftMetaCloud(
  uid: string,
  meta: CurrentShiftMeta
): Promise<void> {
  const path = shiftMetaDocPath(uid);
  const ref = doc(db, 'users', uid, 'meta', 'currentShift');
  const cleanDate = sanitizeDateISO(meta.dataOperacional);
  const cleanAberto = (meta.abertoEm || new Date().toISOString()).slice(0, MAX_ISO_LENGTH);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ownerId: uid,
        dataOperacional: cleanDate,
        abertoEm: cleanAberto,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        dataOperacional: cleanDate,
        abertoEm: cleanAberto,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function createShiftRecordCloud(uid: string, record: ShiftRecord): Promise<void> {
  const id = safeDocId(record.id);
  const path = `${shiftsColPath(uid)}/${id}`;
  const catMap: Record<string, number> = {};
  for (const cat of CATEGORIES) {
    const val = record.consumoPorCategoria?.[cat];
    catMap[cat] = typeof val === 'number' && Number.isFinite(val) ? Math.max(0, Math.min(1000000, val)) : 0;
  }

  const boundedItems = record.itens.slice(0, MAX_SHIFT_ITEMS).map((snap) => ({
    nome: snap.nome.trim().slice(0, MAX_NAME_LENGTH),
    categoria: sanitizeCategory(snap.categoria),
    inicial: clampStock(snap.inicial),
    final: clampStock(snap.final),
    ideal: clampStock(snap.ideal),
    consumo: clampStock(snap.consumo),
    pedido: clampStock(snap.pedido),
  }));

  try {
    await setDoc(doc(db, 'users', uid, 'shifts', id), {
      ownerId: uid,
      dataOperacional: sanitizeDateISO(record.dataOperacional ?? getDefaultBusinessDate()),
      abertoEm: (record.abertoEm ?? record.encerradoEm).slice(0, MAX_ISO_LENGTH),
      encerradoEm: record.encerradoEm.slice(0, MAX_ISO_LENGTH),
      rotulo: record.rotulo.trim().slice(0, MAX_ROTULO_LENGTH) || 'Turno',
      totalItens: Math.max(0, Math.min(500, record.totalItens)),
      itensConferidos: Math.max(0, Math.min(500, record.itensConferidos)),
      totalConsumo: Math.max(0, Math.min(1000000, record.totalConsumo)),
      totalPedir: Math.max(0, Math.min(1000000, record.totalPedir)),
      consumoPorCategoria: catMap,
      itens: boundedItems,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteShiftRecordCloud(uid: string, id: string): Promise<void> {
  const docId = safeDocId(id);
  const path = `${shiftsColPath(uid)}/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'shifts', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function batchRolloverShiftCloud(
  uid: string,
  items: BeverageItem[],
  nextMeta: CurrentShiftMeta,
  recordToSave?: ShiftRecord
): Promise<void> {
  const path = beveragesColPath(uid);
  try {
    if (recordToSave) {
      await createShiftRecordCloud(uid, recordToSave);
    }

    const batch = writeBatch(db);
    for (const item of items) {
      const docId = safeDocId(item.id);
      const nextInicial = item.final !== null ? item.final : item.inicial;
      batch.update(doc(db, 'users', uid, 'beverages', docId), {
        inicial: clampStock(nextInicial),
        final: null,
        checkedInicial: nextInicial !== null,
        checkedFinal: false,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    await upsertShiftMetaCloud(uid, nextMeta);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function batchResetCountsCloud(uid: string, items: BeverageItem[]): Promise<void> {
  const path = beveragesColPath(uid);
  try {
    const batch = writeBatch(db);
    for (const item of items) {
      const docId = safeDocId(item.id);
      batch.update(doc(db, 'users', uid, 'beverages', docId), {
        inicial: null,
        final: null,
        checkedInicial: false,
        checkedFinal: false,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function batchSeedBeveragesCloud(uid: string, items: BeverageItem[]): Promise<void> {
  const path = beveragesColPath(uid);
  try {
    const batch = writeBatch(db);
    for (const item of items) {
      const docId = safeDocId(item.id);
      batch.set(doc(db, 'users', uid, 'beverages', docId), {
        ownerId: uid,
        nome: item.nome.trim().slice(0, MAX_NAME_LENGTH) || 'Bebida',
        categoria: sanitizeCategory(item.categoria),
        inicial: clampStock(item.inicial),
        final: clampStock(item.final),
        ideal: clampStock(item.ideal),
        checkedInicial: Boolean(item.checkedInicial),
        checkedFinal: Boolean(item.checkedFinal),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * On first login to an empty Firestore workspace, migrates existing local
 * inventory, shift date, and history cleanly so no local work is ever lost.
 */
export async function migrateLocalToCloudIfEmpty(
  uid: string,
  localItems: BeverageItem[],
  localMeta: CurrentShiftMeta,
  localHistory: ShiftRecord[]
): Promise<boolean> {
  const colPath = beveragesColPath(uid);
  try {
    const existingSnap = await getDocs(
      query(collection(db, colPath), where('ownerId', '==', uid))
    );
    if (!existingSnap.empty) {
      // Ensure shiftMeta exists if somehow missing
      const metaSnap = await getDoc(doc(db, 'users', uid, 'meta', 'currentShift'));
      if (!metaSnap.exists()) {
        await upsertShiftMetaCloud(uid, localMeta);
      }
      return false;
    }

    if (localItems.length > 0) {
      await batchSeedBeveragesCloud(uid, localItems);
    }
    await upsertShiftMetaCloud(uid, localMeta);

    const historySnap = await getDocs(
      query(collection(db, shiftsColPath(uid)), where('ownerId', '==', uid))
    );
    if (historySnap.empty && localHistory.length > 0) {
      for (const rec of localHistory.slice(0, 20)) {
        await createShiftRecordCloud(uid, rec);
      }
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, colPath);
  }
}
