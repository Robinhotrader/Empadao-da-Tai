import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  listarPedidosEmpada,
  marcarEntregueEmpada,
  PedidoEmpada,
  onAdminAuthChange,
  logoutAdmin,
  moverPedidosConcluidosParaDashboard,
} from '../src/services/firebase';

// ajuste o caminho se for diferente
import logoEmpadao from '../assets/logo-empadao-tai.png';

const AdminScreen: React.FC = () => {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<PedidoEmpada[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  const carregar = async () => {
    setLoading(true);
    const res = await listarPedidosEmpada();
    setLoading(false);

    if (res.success) {
      setPedidos(res.pedidos);
    } else {
      Alert.alert('Erro', res.error ?? 'Não foi possível carregar pedidos');
    }
  };

  useEffect(() => {
    const unsub = onAdminAuthChange((user) => {
      if (!user) {
        router.replace('/');
      } else {
        carregar();
      }
      setCheckingAuth(false);
    });

    return unsub;
  }, [router]);

  const handleToggle = async (id: string, entregue: boolean) => {
    const res = await marcarEntregueEmpada(id, entregue);
    if (res.success) {
      carregar();
    } else {
      Alert.alert('Erro', res.error ?? 'Não foi possível atualizar o pedido');
    }
  };

  const pendentes = pedidos.filter((p) => !p.entregue);
  const entregues = pedidos.filter((p) => p.entregue);

  if (checkingAuth) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header com logo e cores suaves */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Image source={logoEmpadao} style={styles.logo} />
          <View>
            <Text style={styles.titulo}>Painel Administrativo</Text>
            <Text style={styles.subtitulo}>Empadão da Taí · Gestão de pedidos</Text>
          </View>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push('/')}
          >
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={async () => {
              await logoutAdmin();
              router.replace('/');
            }}
          >
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Estatísticas rápidas */}
      <View style={styles.section}>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNumero}>{pendentes.length}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumero}>{entregues.length}</Text>
            <Text style={styles.statLabel}>Entregues</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumero}>{pedidos.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.atualizarBtn} onPress={carregar}>
          <Text style={styles.atualizarText}>Atualizar lista</Text>
        </TouchableOpacity>
      </View>

      {/* Pendentes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pedidos pendentes</Text>
        {loading && pedidos.length === 0 ? (
          <ActivityIndicator color="#3B82F6" />
        ) : pendentes.length === 0 ? (
          <Text style={styles.empty}>Nenhum pedido pendente</Text>
        ) : (
          pendentes.map((p) => (
            <View key={p.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.nome}>{p.nome}</Text>
                <Text style={styles.tagPendentes}>Pendente</Text>
              </View>

              <Text style={styles.linha}>{p.telefone}</Text>
              <Text style={styles.linha}>Sabor: {p.sabor}</Text>
              <Text style={styles.linha}>Tamanho: {p.tamanho}</Text>
              <Text style={styles.linha}>Combo: {p.combo}</Text>
              {p.observacao ? <Text style={styles.linha}>Obs: {p.observacao}</Text> : null}

              <TouchableOpacity
                style={[styles.btnMini, styles.btnEntregar]}
                onPress={() => p.id && handleToggle(p.id, true)}
              >
                <Text style={styles.btnMiniText}>Marcar como entregue</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Entregues */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pedidos entregues</Text>
        {entregues.length === 0 ? (
          <Text style={styles.empty}>Nenhum pedido entregue ainda</Text>
        ) : (
          entregues.map((p) => (
            <View key={p.id} style={[styles.card, styles.cardEntregue]}>
              <View style={styles.cardHeader}>
                <Text style={styles.nome}>{p.nome}</Text>
                <Text style={styles.tagEntregue}>Entregue</Text>
              </View>

              <Text style={styles.linha}>{p.telefone}</Text>
              <Text style={styles.linha}>Sabor: {p.sabor}</Text>
              <Text style={styles.linha}>Tamanho: {p.tamanho}</Text>
              <Text style={styles.linha}>Combo: {p.combo}</Text>
              {p.observacao ? <Text style={styles.linha}>Obs: {p.observacao}</Text> : null}
            </View>
          ))
        )}
      </View>

      {/* Ações de Dashboard */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.btnMini, styles.btnDashboardMove]}
          onPress={async () => {
            const res = await moverPedidosConcluidosParaDashboard();
            if (res.success) {
              Alert.alert('Sucesso', 'Pedidos entregues foram movidos para o Dashboard.');
              carregar();
              router.push('/dashboard');
            } else {
              Alert.alert('Erro', res.error ?? 'Não foi possível mover pedidos.');
            }
          }}
        >
          <Text style={styles.btnMiniText}>Mover entregues e ir para Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnMini, styles.btnDashboardSimple]}
          onPress={() => router.push('/dashboard')}
        >
          <Text style={styles.btnMiniText}>Ir para Dashboard</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default AdminScreen;

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
    backgroundColor: '#F9A8D4', // mesmo tom pastel do dashboard
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
  subtitulo: { color: '#475569', fontSize: 13, marginTop: 2 },
  headerButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#93C5FD',
    backgroundColor: '#FFFFFF',
  },
  backText: {
    color: '#1E40AF',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },

  section: { padding: 20 },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stat: { alignItems: 'center', flex: 1 },
  statNumero: { fontSize: 22, fontWeight: 'bold', color: '#1E40AF' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  atualizarBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  atualizarText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  empty: { fontSize: 13, color: '#6B7280', marginTop: 4 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  cardEntregue: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nome: { fontSize: 15, fontWeight: '700', color: '#111827' },
  linha: { fontSize: 13, color: '#4B5563' },

  tagPendentes: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  tagEntregue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6bdbcc',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },

  btnMini: {
    marginTop: 10,
    paddingVertical: 7,
    borderRadius: 999,
    alignItems: 'center',
  },
  btnMiniText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  btnEntregar: {
    backgroundColor: '#4ec0a7',
  },
  btnDashboardMove: {
    backgroundColor: '#3B82F6',
    marginTop: 12,
  },
  btnDashboardSimple: {
    backgroundColor: '#ec7af7',
    marginTop: 8,
  },
});