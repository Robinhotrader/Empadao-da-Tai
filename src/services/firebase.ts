import { initializeApp } from 'firebase/app';
import { Linking } from 'react-native';

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
  where,
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
  | 'Sem mini refrigerante'
  | 'Com mini refrigerante'
  // Valores antigos ficam reconhecidos para preservar pedidos já salvos.
  | 'Somente empadão'
  | 'Empadão + Mousse de Maracuja'
  | 'Empadão + Mini refrigerante';

export type SaborEmpada =
  | 'Frango com Palmito e Catupiry'
  | 'Torta Fria'
  // Mantém a leitura dos pedidos antigos.
  | 'Frango com Catupiry';

export interface PedidoEmpada {
  id?: string;
  nome: string;
  telefone: string;
  sabor: SaborEmpada;
  tamanho: TamanhoEmpada;
  combo: ComboEmpada;
  quantidade?: number;
  precoUnitario?: number;
  valorTotal?: number;
  observacao?: string;
  createdAt?: any;
  entregue?: boolean;
  status?: 'pendente' | 'entregue';
}

export interface AvaliacaoEmpada {
  id: string;
  nome: string;
  comentario: string;
  nota: number;
  status: 'pendente' | 'aprovada';
  createdAt?: any;
}

export const tamanhos: TamanhoEmpada[] = ['250g', '500g'];

export const combos: ComboEmpada[] = [
  'Sem mini refrigerante',
  'Com mini refrigerante',
];

export const sabores: SaborEmpada[] = [
  'Frango com Palmito e Catupiry',
  'Torta Fria',
];

export const precos = {
  empadao250g: 10,
  empadao500g: 20,
  tortaFria500g: 17,
  miniRefrigerante: 5,
} as const;

export function calcularPrecoUnitarioPedido(
  sabor: SaborEmpada,
  tamanho: TamanhoEmpada,
  combo: ComboEmpada,
) {
  const precoProduto = sabor === 'Torta Fria'
    ? precos.tortaFria500g
    : tamanho === '250g'
      ? precos.empadao250g
      : precos.empadao500g;
  const adicionalRefrigerante = combo === 'Com mini refrigerante' ? precos.miniRefrigerante : 0;
  return precoProduto + adicionalRefrigerante;
}

export function formatarMoeda(valor: number) {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

const collectionName = 'empadaPedidos';
const avaliacoesCollectionName = 'avaliacoesEmpadas';

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

export async function criarAvaliacaoEmpada(avaliacao: Omit<AvaliacaoEmpada, 'id' | 'status' | 'createdAt'>) {
  try {
    const nome = avaliacao.nome.trim();
    const comentario = avaliacao.comentario.trim();

    if (nome.length < 2 || nome.length > 60) {
      return { success: false as const, error: 'Informe um nome com até 60 caracteres.' };
    }
    if (comentario.length < 8 || comentario.length > 500) {
      return { success: false as const, error: 'O comentário deve ter entre 8 e 500 caracteres.' };
    }
    if (!Number.isInteger(avaliacao.nota) || avaliacao.nota < 1 || avaliacao.nota > 5) {
      return { success: false as const, error: 'Selecione uma nota de 1 a 5 estrelas.' };
    }

    await addDoc(collection(db, avaliacoesCollectionName), {
      nome,
      comentario,
      nota: avaliacao.nota,
      status: 'pendente',
      createdAt: serverTimestamp(),
    });
    return { success: true as const };
  } catch (e: any) {
    return { success: false as const, error: e.message as string };
  }
}

async function listarAvaliacoesPorStatus(status: AvaliacaoEmpada['status']) {
  const q = query(collection(db, avaliacoesCollectionName), where('status', '==', status));
  const snap = await getDocs(q);
  const avaliacoes = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<AvaliacaoEmpada, 'id'>),
  }));
  avaliacoes.sort((a, b) => {
    const dataA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : 0;
    const dataB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : 0;
    return dataB - dataA;
  });
  return avaliacoes;
}

export async function listarAvaliacoesAprovadas() {
  try {
    return { success: true as const, avaliacoes: await listarAvaliacoesPorStatus('aprovada') };
  } catch (e: any) {
    return { success: false as const, error: e.message as string };
  }
}

export async function listarAvaliacoesPendentes() {
  try {
    return { success: true as const, avaliacoes: await listarAvaliacoesPorStatus('pendente') };
  } catch (e: any) {
    return { success: false as const, error: e.message as string };
  }
}

export async function aprovarAvaliacaoEmpada(id: string) {
  try {
    await updateDoc(doc(db, avaliacoesCollectionName, id), { status: 'aprovada' });
    return { success: true as const };
  } catch (e: any) {
    return { success: false as const, error: e.message as string };
  }
}

export async function excluirAvaliacaoEmpada(id: string) {
  try {
    await deleteDoc(doc(db, avaliacoesCollectionName, id));
    return { success: true as const };
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

