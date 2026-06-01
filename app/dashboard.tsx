import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  PedidoEmpada,
  onAdminAuthChange,
  logoutAdmin,
  db,
} from '../src/services/firebase';
import {
  collection,
  orderBy,
  query,
  onSnapshot,
  deleteDoc,
  doc,
} from 'firebase/firestore';

// ajuste o caminho se o arquivo estiver em outro lugar
import logoEmpadao from '../assets/logo-empadao-tai.png';

const DashboardScreen: React.FC = () => {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<PedidoEmpada[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // KPIs simples
  const totalPedidos = pedidos.length;
  const totalSabores = new Set(pedidos.map((p) => p.sabor)).size;

  // Carregar em tempo real com onSnapshot
  useEffect(() => {
    const unsubAuth = onAdminAuthChange((user) => {
      if (!user) {
        router.replace('/');
        setCheckingAuth(false);
        return;
      }

      const q = query(collection(db, 'dashboard'), orderBy('createdAt', 'desc'));

      const unsubSnap = onSnapshot(
        q,
        (snap) => {
          const lista: PedidoEmpada[] = [];
          snap.forEach((d) => {
            lista.push({
              id: d.id,
              ...(d.data() as Omit<PedidoEmpada, 'id'>),
            });
          });
          setPedidos(lista);
          setLoading(false);
          setCheckingAuth(false);
        },
        (err) => {
          console.log('Erro snapshot dashboard:', err);
          Alert.alert('Erro', 'Não foi possível carregar o dashboard.');
          setLoading(false);
          setCheckingAuth(false);
        },
      );

      return () => {
        unsubSnap();
      };
    });

    return unsubAuth;
  }, [router]);

 const handleExcluir = async (id?: string) => {
  if (!id) {
    console.log('Sem id para deletar');
    return;
  }

  try {
    const ref = doc(db, 'dashboard', id);
    await deleteDoc(ref);
    console.log('Documento deletado (teste):', id);
  } catch (e: any) {
    console.log('Erro ao deletar (teste):', e);
    Alert.alert(
      'Erro',
      e?.message ?? 'Não foi possível excluir o pedido do dashboard.',
    );
  }
};

  if (checkingAuth) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header institucional com logo */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Image source={logoEmpadao} style={styles.logo} />
          <View>
            <Text style={styles.titulo}>Dashboard - Empadão da Taí</Text>
            <Text style={styles.subtitulo}>Acompanhamento dos pedidos concluídos</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.replace('/admin')}
          >
            <Text style={styles.headerBtnText}>Voltar ao Admin</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerBtn, styles.headerBtnLogout]}
            onPress={async () => {
              await logoutAdmin();
              router.replace('/');
            }}
          >
            <Text style={[styles.headerBtnText, styles.headerBtnLogoutText]}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Cards de KPIs */}
      <View style={styles.kpiSection}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total de pedidos</Text>
          <Text style={styles.kpiValor}>{totalPedidos}</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Sabores atendidos</Text>
          <Text style={styles.kpiValor}>{totalSabores}</Text>
        </View>
      </View>

      {/* Lista de pedidos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Histórico de pedidos</Text>

        {loading ? (
          <ActivityIndicator color="#3B82F6" />
        ) : pedidos.length === 0 ? (
          <Text style={styles.empty}>Nenhum pedido concluído ainda</Text>
        ) : (
          pedidos.map((p) => (
            <View key={p.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.nome}>{p.nome}</Text>
                <Text style={styles.tagStatus}>Entregue</Text>
              </View>

              <Text style={styles.linha}>ID: {p.id}</Text>
              <Text style={styles.linha}>{p.telefone}</Text>
              <Text style={styles.linha}>Sabor: {p.sabor}</Text>
              <Text style={styles.linha}>Tamanho: {p.tamanho}</Text>
              <Text style={styles.linha}>Combo: {p.combo}</Text>
              {p.observacao ? <Text style={styles.linha}>Obs: {p.observacao}</Text> : null}

              <TouchableOpacity
                style={styles.btnExcluir}
                onPress={() => handleExcluir(p.id)}
              >
                <Text style={styles.btnExcluirText}>Excluir permanentemente</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loading: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F9A8D4',
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  titulo: { color: '#0F172A', fontSize: 20, fontWeight: '700' },
  subtitulo: { color: '#475569', fontSize: 13, marginTop: 4 },
  headerActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#93C5FD',
    backgroundColor: '#FFFFFF',
  },
  headerBtnText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
  },
  headerBtnLogout: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  headerBtnLogoutText: {
    color: '#B91C1C',
  },

  // KPIs
  kpiSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    flexDirection: 'row',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  kpiLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  kpiValor: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  section: { padding: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  empty: { fontSize: 13, color: '#6B7280', marginTop: 4 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nome: { fontSize: 15, fontWeight: '700', color: '#111827' },
  linha: { fontSize: 13, color: '#4B5563' },
  tagStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  status: { fontSize: 12, color: '#16A34A', marginTop: 6, fontWeight: '600' },
  btnExcluir: {
    marginTop: 10,
    paddingVertical: 7,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: '#ec7af7',
  },
  btnExcluirText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});