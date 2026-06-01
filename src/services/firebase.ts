import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  QueryDocumentSnapshot,
  DocumentData,
  Firestore,
} from 'firebase/firestore';
import { setDoc, deleteDoc } from 'firebase/firestore';

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
  setPersistence,
  inMemoryPersistence, // 🔹 persistência só em memória
} from 'firebase/auth';

// Config do seu Firebase
const firebaseConfig = {
  apiKey: 'AIzaSyAmByQu1SMMOabUJL3nrRh6piV-IykIRqw',
  authDomain: 'envi-1b323.firebaseapp.com',
  projectId: 'envi-1b323',
  storageBucket: 'envi-1b323.firebasestorage.app',
  messagingSenderId: '358397293574',
  appId: '1:358397293574:web:8d2069116dede6d41a3f87',
  measurementId: 'G-WB3G6WEYP9',
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Firestore e Auth
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

// 🔹 Configura persistência para não guardar login automaticamente
setPersistence(auth, inMemoryPersistence);

// TIPOS DE EMPADÃO
export type TamanhoEmpada = '250g' | '500g';

export type ComboEmpada =
  | 'Somente empadão'
  | 'Empadão + Mousse de Maracuja'
  | 'Empadão + Mini refrigerante';

export type SaborEmpada =
  | 'Frango com Palmito e Catupiry'
  | 'Frango com Catupiry';

export interface PedidoEmpada {
  id?: string;
  nome: string;
  telefone: string;
  sabor: SaborEmpada;
  tamanho: TamanhoEmpada;
  combo: ComboEmpada;
  observacao?: string;
  createdAt?: any;
  entregue?: boolean;
  status?: 'pendente' | 'entregue';
}

export const tamanhos: TamanhoEmpada[] = ['250g', '500g'];

export const combos: ComboEmpada[] = [
  'Somente empadão',
  'Empadão + Mousse de Maracuja',
  'Empadão + Mini refrigerante',
];

export const sabores: SaborEmpada[] = [
  'Frango com Palmito e Catupiry',
  'Frango com Catupiry',
];

const collectionName = 'empadaPedidos';

// CRUD DE PEDIDOS
export async function criarPedidoEmpada(
  pedido: Omit<PedidoEmpada, 'id' | 'createdAt' | 'entregue' | 'status'>,
) {
  try {
    const novo: Omit<PedidoEmpada, 'id'> = {
      ...pedido,
      createdAt: serverTimestamp(),
      entregue: false,
      status: 'pendente',
    };

    const ref = await addDoc(collection(db, collectionName), novo as DocumentData);
    return { success: true as const, id: ref.id };
  } catch (e: any) {
    return { success: false as const, error: e.message as string };
  }
}

export async function listarPedidosEmpada() {
  try {
    const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    const pedidos: PedidoEmpada[] = [];
    snap.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
      pedidos.push({
        id: d.id,
        ...(d.data() as Omit<PedidoEmpada, 'id'>),
      });
    });

    return { success: true as const, pedidos };
  } catch (e: any) {
    return { success: false as const, error: e.message as string };
  }
}

export async function marcarEntregueEmpada(id: string, entregue: boolean) {
  try {
    const ref = doc(db, collectionName, id);
    await updateDoc(ref, {
      entregue,
      status: entregue ? 'entregue' : 'pendente',
    });
    return { success: true as const };
  } catch (e: any) {
    return { success: false as const, error: e.message as string };
  }
}

// AUTH ADMIN (login para painel)
export async function loginAdmin(email: string, password: string) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { success: true as const, user: cred.user };
  } catch (e: any) {
    return { success: false as const, error: e.message as string };
  }
}

export async function logoutAdmin() {
  try {
    await signOut(auth);
    return { success: true as const };
  } catch (e: any) {
    return { success: false as const, error: e.message as string };
  }
}

export function onAdminAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}


export async function moverPedidosConcluidosParaDashboard() {
  try {
    const q = query(collection(db, 'empadaPedidos'));
    const snap = await getDocs(q);

    const promises: Promise<any>[] = [];
    snap.forEach((d) => {
      const data = d.data() as PedidoEmpada;
      if (data.entregue) {
        // salva no dashboard
        const dashboardRef = doc(collection(db, 'dashboard'), d.id);
        promises.push(setDoc(dashboardRef, data));

        // remove da coleção principal
        promises.push(deleteDoc(doc(db, 'empadaPedidos', d.id)));
      }
    });

    await Promise.all(promises);
    return { success: true as const };
  } catch (e: any) {
    return { success: false as const, error: e.message as string };
  }
}
export async function deletarPedidoDashboard(id: string) {
  try {
    const ref = doc(db, 'dashboard', id);
    await deleteDoc(ref);
    console.log('Documento deletado:', id);
    return { success: true as const };
  } catch (e: any) {
    console.log('Erro ao deletar dashboard:', e);
    return { success: false as const, error: e.message as string };
  }
}

