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

export const WORKSPACE_ID = 'estacao-cupim';
export const BOOTSTRAP_ADMIN_EMAIL = 'skalee.razarth@gmail.com';

export type TeamRole = 'admin' | 'operador';

export interface TeamMemberRecord {
  email: string;
  nome: string;
  role: TeamRole;
  addedByUid: string;
  createdAtMs: number;
}

export interface ActorInfo {
  uid: string;
  name: string;
}

const MAX_NAME_LENGTH = 120;
const MAX_ACTOR_NAME_LENGTH = 80;
const MAX_ROTULO_LENGTH = 60;
const MAX_ISO_LENGTH = 40;
const MAX_STOCK_VAL = 100000;
const MAX_SHIFT_ITEMS = 200;
const DATE_REGEX = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;
const EMAIL_ID_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

function clampStock(val: number | null | undefined): number | null {
  const n = sanitizeNumber(val);
  if (n === null) return null;
  return Math.min(MAX_STOCK_VAL, Math.max(0, n));
}

function safeDocId(rawId?: string): string {
  if (rawId && SAFE_ID_REGEX.test(rawId)) return rawId;
  return createId().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

function sanitizeActorName(name?: string | null): string {
  const clean = (name ?? '').trim().slice(0, MAX_ACTOR_NAME_LENGTH);
  return clean || 'Operador';
}

function sanitizeCategory(cat: unknown): Category {
  return isValidCategory(cat) ? cat : 'Outros';
}

function sanitizeDateISO(val: string): string {
  return DATE_REGEX.test(val) ? val : getDefaultBusinessDate(new Date());
}

export function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase().slice(0, 128);
}

export function isValidTeamEmail(email: string): boolean {
  return EMAIL_ID_REGEX.test(normalizeEmailKey(email));
}

function membersColPath(): string {
  return `workspaces/${WORKSPACE_ID}/members`;
}

function beveragesColPath(): string {
  return `workspaces/${WORKSPACE_ID}/beverages`;
}

function shiftMetaDocPath(): string {
  return `workspaces/${WORKSPACE_ID}/meta/currentShift`;
}

function shiftsColPath(): string {
  return `workspaces/${WORKSPACE_ID}/shifts`;
}

/**
 * Watches real-time authorization for the currently signed-in verified email.
 * The bootstrap admin is always authorized as 'admin'; all other accounts must
 * exist in /workspaces/estacao-cupim/members/{lowercaseEmail}.
 */
export function subscribeMyMembership(
  email: string,
  onResult: (authorized: boolean, role: TeamRole | null) => void,
  onError?: (err: Error) => void
): () => void {
  const normalized = normalizeEmailKey(email);
  if (!normalized || !EMAIL_ID_REGEX.test(normalized)) {
    onResult(false, null);
    return () => {};
  }

  if (normalized === BOOTSTRAP_ADMIN_EMAIL) {
    onResult(true, 'admin');
    return () => {};
  }

  const docPath = `${membersColPath()}/${normalized}`;
  const ref = doc(db, 'workspaces', WORKSPACE_ID, 'members', normalized);

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onResult(false, null);
        return;
      }
      const d = snap.data();
      const role: TeamRole = d.role === 'admin' ? 'admin' : 'operador';
      onResult(true, role);
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

export function subscribeTeamMembers(
  onData: (members: TeamMemberRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colPath = membersColPath();
  const q = query(collection(db, colPath), where('workspaceId', '==', WORKSPACE_ID));

  return onSnapshot(
    q,
    (snapshot) => {
      const members: TeamMemberRecord[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const createdAtMs =
          d.createdAt && typeof d.createdAt.toMillis === 'function'
            ? d.createdAt.toMillis()
            : 0;
        members.push({
          email: typeof d.email === 'string' ? d.email : docSnap.id,
          nome: typeof d.nome === 'string' ? d.nome : docSnap.id,
          role: d.role === 'admin' ? 'admin' : 'operador',
          addedByUid: typeof d.addedByUid === 'string' ? d.addedByUid : '',
          createdAtMs,
        });
      });

      members.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      onData(members);
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

export async function saveTeamMemberCloud(
  actorUid: string,
  payload: { email: string; nome: string; role: TeamRole }
): Promise<void> {
  const cleanEmail = normalizeEmailKey(payload.email);
  if (!EMAIL_ID_REGEX.test(cleanEmail)) {
    throw new Error('E-mail inválido.');
  }
  const cleanName = payload.nome.trim().slice(0, MAX_ACTOR_NAME_LENGTH) || cleanEmail.split('@')[0];
  const role: TeamRole = payload.role === 'admin' ? 'admin' : 'operador';
  const path = `${membersColPath()}/${cleanEmail}`;
  const ref = doc(db, 'workspaces', WORKSPACE_ID, 'members', cleanEmail);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        workspaceId: WORKSPACE_ID,
        email: cleanEmail,
        nome: cleanName,
        role,
        addedByUid: actorUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        nome: cleanName,
        role,
        addedByUid: actorUid,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeTeamMemberCloud(memberEmail: string): Promise<void> {
  const cleanEmail = normalizeEmailKey(memberEmail);
  if (!EMAIL_ID_REGEX.test(cleanEmail) || cleanEmail === BOOTSTRAP_ADMIN_EMAIL) return;
  const path = `${membersColPath()}/${cleanEmail}`;
  try {
    await deleteDoc(doc(db, 'workspaces', WORKSPACE_ID, 'members', cleanEmail));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeBeverages(
  onData: (items: BeverageItem[], fromCloudCount: number) => void,
  onError?: (err: Error) => void
): () => void {
  const colPath = beveragesColPath();
  const q = query(collection(db, colPath), where('workspaceId', '==', WORKSPACE_ID));

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
  onData: (meta: CurrentShiftMeta | null) => void,
  onError?: (err: Error) => void
): () => void {
  const docPath = shiftMetaDocPath();
  const ref = doc(db, 'workspaces', WORKSPACE_ID, 'meta', 'currentShift');

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
  onData: (records: ShiftRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colPath = shiftsColPath();
  const q = query(collection(db, colPath), where('workspaceId', '==', WORKSPACE_ID));

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

export async function createBeverageCloud(actor: ActorInfo, item: BeverageItem): Promise<void> {
  const id = safeDocId(item.id);
  const path = `${beveragesColPath()}/${id}`;
  try {
    await setDoc(doc(db, 'workspaces', WORKSPACE_ID, 'beverages', id), {
      workspaceId: WORKSPACE_ID,
      createdByUid: actor.uid,
      updatedByUid: actor.uid,
      updatedByName: sanitizeActorName(actor.name),
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
  actor: ActorInfo,
  id: string,
  payload: { nome: string; categoria: Category; ideal: number | null }
): Promise<void> {
  const docId = safeDocId(id);
  const path = `${beveragesColPath()}/${docId}`;
  try {
    await updateDoc(doc(db, 'workspaces', WORKSPACE_ID, 'beverages', docId), {
      nome: payload.nome.trim().slice(0, MAX_NAME_LENGTH) || 'Bebida',
      categoria: sanitizeCategory(payload.categoria),
      ideal: clampStock(payload.ideal),
      updatedByUid: actor.uid,
      updatedByName: sanitizeActorName(actor.name),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateBeverageCountCloud(
  actor: ActorInfo,
  id: string,
  patch: Partial<Pick<BeverageItem, 'inicial' | 'final' | 'ideal' | 'checkedInicial' | 'checkedFinal'>>
): Promise<void> {
  const docId = safeDocId(id);
  const path = `${beveragesColPath()}/${docId}`;
  const cleanPatch: Record<string, unknown> = {
    updatedByUid: actor.uid,
    updatedByName: sanitizeActorName(actor.name),
    updatedAt: serverTimestamp(),
  };
  if ('inicial' in patch) cleanPatch.inicial = clampStock(patch.inicial);
  if ('final' in patch) cleanPatch.final = clampStock(patch.final);
  if ('ideal' in patch) cleanPatch.ideal = clampStock(patch.ideal);
  if ('checkedInicial' in patch) cleanPatch.checkedInicial = Boolean(patch.checkedInicial);
  if ('checkedFinal' in patch) cleanPatch.checkedFinal = Boolean(patch.checkedFinal);

  try {
    await updateDoc(doc(db, 'workspaces', WORKSPACE_ID, 'beverages', docId), cleanPatch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBeverageCloud(id: string): Promise<void> {
  const docId = safeDocId(id);
  const path = `${beveragesColPath()}/${docId}`;
  try {
    await deleteDoc(doc(db, 'workspaces', WORKSPACE_ID, 'beverages', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertShiftMetaCloud(
  actor: ActorInfo,
  meta: CurrentShiftMeta
): Promise<void> {
  const path = shiftMetaDocPath();
  const ref = doc(db, 'workspaces', WORKSPACE_ID, 'meta', 'currentShift');
  const cleanDate = sanitizeDateISO(meta.dataOperacional);
  const cleanAberto = (meta.abertoEm || new Date().toISOString()).slice(0, MAX_ISO_LENGTH);
  const actorName = sanitizeActorName(actor.name);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        workspaceId: WORKSPACE_ID,
        dataOperacional: cleanDate,
        abertoEm: cleanAberto,
        updatedByUid: actor.uid,
        updatedByName: actorName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        dataOperacional: cleanDate,
        abertoEm: cleanAberto,
        updatedByUid: actor.uid,
        updatedByName: actorName,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function createShiftRecordCloud(actor: ActorInfo, record: ShiftRecord): Promise<void> {
  const id = safeDocId(record.id);
  const path = `${shiftsColPath()}/${id}`;
  const catMap: Record<string, number> = {};
  for (const cat of CATEGORIES) {
    const val = record.consumoPorCategoria?.[cat];
    catMap[cat] =
      typeof val === 'number' && Number.isFinite(val) ? Math.max(0, Math.min(1000000, val)) : 0;
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
    await setDoc(doc(db, 'workspaces', WORKSPACE_ID, 'shifts', id), {
      workspaceId: WORKSPACE_ID,
      createdByUid: actor.uid,
      closedByName: sanitizeActorName(actor.name),
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

export async function deleteShiftRecordCloud(id: string): Promise<void> {
  const docId = safeDocId(id);
  const path = `${shiftsColPath()}/${docId}`;
  try {
    await deleteDoc(doc(db, 'workspaces', WORKSPACE_ID, 'shifts', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function batchRolloverShiftCloud(
  actor: ActorInfo,
  items: BeverageItem[],
  nextMeta: CurrentShiftMeta,
  recordToSave?: ShiftRecord
): Promise<void> {
  const path = beveragesColPath();
  const actorName = sanitizeActorName(actor.name);
  try {
    if (recordToSave) {
      await createShiftRecordCloud(actor, recordToSave);
    }

    const batch = writeBatch(db);
    for (const item of items) {
      const docId = safeDocId(item.id);
      const nextInicial = item.final !== null ? item.final : item.inicial;
      batch.update(doc(db, 'workspaces', WORKSPACE_ID, 'beverages', docId), {
        inicial: clampStock(nextInicial),
        final: null,
        checkedInicial: nextInicial !== null,
        checkedFinal: false,
        updatedByUid: actor.uid,
        updatedByName: actorName,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    await upsertShiftMetaCloud(actor, nextMeta);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function batchResetCountsCloud(
  actor: ActorInfo,
  items: BeverageItem[]
): Promise<void> {
  const path = beveragesColPath();
  const actorName = sanitizeActorName(actor.name);
  try {
    const batch = writeBatch(db);
    for (const item of items) {
      const docId = safeDocId(item.id);
      batch.update(doc(db, 'workspaces', WORKSPACE_ID, 'beverages', docId), {
        inicial: null,
        final: null,
        checkedInicial: false,
        checkedFinal: false,
        updatedByUid: actor.uid,
        updatedByName: actorName,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function batchSeedBeveragesCloud(
  actor: ActorInfo,
  items: BeverageItem[]
): Promise<void> {
  const path = beveragesColPath();
  const actorName = sanitizeActorName(actor.name);
  try {
    const batch = writeBatch(db);
    for (const item of items) {
      const docId = safeDocId(item.id);
      batch.set(doc(db, 'workspaces', WORKSPACE_ID, 'beverages', docId), {
        workspaceId: WORKSPACE_ID,
        createdByUid: actor.uid,
        updatedByUid: actor.uid,
        updatedByName: actorName,
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
 * On first login to an empty shared Estação Cupim workspace, migrates existing
 * local inventory, shift date, and history so no prior local work is lost.
 */
export async function migrateLocalToCloudIfEmpty(
  actor: ActorInfo,
  localItems: BeverageItem[],
  localMeta: CurrentShiftMeta,
  localHistory: ShiftRecord[]
): Promise<boolean> {
  const colPath = beveragesColPath();
  try {
    const existingSnap = await getDocs(
      query(collection(db, colPath), where('workspaceId', '==', WORKSPACE_ID))
    );
    if (!existingSnap.empty) {
      const metaSnap = await getDoc(doc(db, 'workspaces', WORKSPACE_ID, 'meta', 'currentShift'));
      if (!metaSnap.exists()) {
        await upsertShiftMetaCloud(actor, localMeta);
      }
      return false;
    }

    if (localItems.length > 0) {
      await batchSeedBeveragesCloud(actor, localItems);
    }
    await upsertShiftMetaCloud(actor, localMeta);

    const historySnap = await getDocs(
      query(collection(db, shiftsColPath()), where('workspaceId', '==', WORKSPACE_ID))
    );
    if (historySnap.empty && localHistory.length > 0) {
      for (const rec of localHistory.slice(0, 20)) {
        await createShiftRecordCloud(actor, rec);
      }
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, colPath);
  }
}
