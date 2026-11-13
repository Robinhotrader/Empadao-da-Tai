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
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  PedidoEmpada,
  onAdminAuthChange,
  logoutAdmin,
  db,
  formatarMoeda,
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
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const [pedidos, setPedidos] = useState<PedidoEmpada[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // KPIs simples
  const totalPedidos = pedidos.length;
  const totalProdutos = new Set(
    pedidos.flatMap((p) =>
      p.itens?.map((item) => `${item.sabor}-${item.tamanho}`) ?? [`${p.sabor}-${p.tamanho}`],
    ),
  ).size;

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
        <ActivityIndicator size="large" color="#A74436" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.header, isWide && styles.headerWide]}>
        <View style={styles.headerInfo}>
          <Image source={logoEmpadao} style={styles.logo} />
          <View>
            <Text style={styles.headerEyebrow}>ÁREA ADMINISTRATIVA</Text>
            <Text style={styles.titulo}>Dashboard - Empadão da Taí</Text>
            <Text style={styles.subtitulo}>Acompanhamento dos pedidos concluídos</Text>
          </View>
        </View>

        <View style={[styles.headerActions, isWide && styles.headerActionsWide]}>
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
          <Text style={styles.kpiLabel}>Produtos registrados</Text>
          <Text style={styles.kpiValor}>{totalProdutos}</Text>
        </View>
      </View>

      {/* Lista de pedidos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Histórico de pedidos</Text>

        {loading ? (
          <ActivityIndicator color="#A74436" />
        ) : pedidos.length === 0 ? (
          <Text style={styles.empty}>Nenhum pedido concluído ainda</Text>
        ) : (
          <View style={[styles.cardGrid, isWide && styles.cardGridWide]}>
          {pedidos.map((p) => (
            <View key={p.id} style={[styles.card, isWide && styles.cardWide]}>
              <View style={styles.cardHeader}>
                <Text style={styles.nome}>{p.nome}</Text>
                <Text style={styles.tagStatus}>Entregue</Text>
              </View>

              <Text style={styles.linha}>ID: {p.id}</Text>
              <Text style={styles.linha}>{p.telefone}</Text>
              {p.itens?.length ? (
                <>
                  <Text style={styles.linha}>Itens do pedido · {p.quantidade ?? p.itens.reduce((total, item) => total + item.quantidade, 0)} unidades</Text>
                  {p.itens.map((item, index) => (
                    <Text key={`${item.sabor}-${item.tamanho}-${item.combo}-${index}`} style={styles.linha}>
                      • {item.quantidade}x {item.sabor} · {item.tamanho} · {item.combo === 'Com mini refrigerante' ? 'com mini refrigerante' : 'sem refrigerante'} · {formatarMoeda(item.valorTotal)}
                    </Text>
                  ))}
                </>
              ) : (
                <>
                  <Text style={styles.linha}>Quantidade: {p.quantidade ?? 1}</Text>
                  <Text style={styles.linha}>Produto: {p.sabor}</Text>
                  <Text style={styles.linha}>Tamanho: {p.tamanho}</Text>
                  <Text style={styles.linha}>Acompanhamento: {p.combo}</Text>
                </>
              )}
              {p.formaPagamento ? <Text style={styles.linha}>Pagamento: {p.formaPagamento === 'pix' ? 'Pix agora' : 'Na entrega'}</Text> : null}
              {typeof p.valorTotal === 'number' ? <Text style={styles.preco}>Total: {formatarMoeda(p.valorTotal)}</Text> : null}
              {p.observacao ? <Text style={styles.linha}>Obs: {p.observacao}</Text> : null}

              <TouchableOpacity
                style={styles.btnExcluir}
                onPress={() => handleExcluir(p.id)}
              >
                <Text style={styles.btnExcluirText}>Excluir permanentemente</Text>
              </TouchableOpacity>
            </View>
          ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCF7F0' },
  scrollContent: { paddingBottom: 48 },
  loading: { flex: 1, backgroundColor: '#FCF7F0', justifyContent: 'center', alignItems: 'center' },
  header: {
    width: '100%', maxWidth: 1180, alignSelf: 'center', marginTop: 18,
    paddingTop: 24, paddingBottom: 22, paddingHorizontal: 20,
    backgroundColor: '#512A46', borderRadius: 22,
  },
  headerWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  logo: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#F6E3EC' },
  headerEyebrow: { color: '#EBC5DD', fontSize: 9, fontWeight: '800', letterSpacing: 1.4, marginBottom: 4 },
  titulo: { color: '#FFFFFF', fontSize: 21, fontWeight: '800' },
  subtitulo: { color: '#EBDCE8', fontSize: 12, marginTop: 4 },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, gap: 10 },
  headerActionsWide: { marginTop: 0, justifyContent: 'flex-end' },
  headerBtn: { paddingHorizontal: 15, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: '#F4E4DD', backgroundColor: '#FFF9F4' },
  headerBtnText: { fontSize: 12, color: '#512A46', fontWeight: '800' },
  headerBtnLogout: { backgroundColor: '#7B3650', borderColor: '#93536A' },
  headerBtnLogoutText: { color: '#FFFFFF' },

  kpiSection: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 4, flexDirection: 'row', gap: 12 },
  kpiCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#EFE2DC', shadowColor: '#513A34', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  kpiLabel: { fontSize: 11, color: '#806578', fontWeight: '700' },
  kpiValor: { marginTop: 6, fontSize: 27, fontWeight: '800', color: '#A74436' },

  section: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: '#4D2C43', marginBottom: 12 },
  empty: { fontSize: 13, color: '#927A8D', marginTop: 4, padding: 16, borderRadius: 14, backgroundColor: '#FFFDFB' },
  cardGrid: { gap: 12 },
  cardGridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#EFE2DC', shadowColor: '#513A34', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardWide: { width: '48.5%' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  nome: { flexShrink: 1, fontSize: 15, fontWeight: '800', color: '#3E2B34' },
  linha: { fontSize: 12, lineHeight: 19, color: '#73606A', marginTop: 2 },
  preco: { fontSize: 15, fontWeight: '800', color: '#A74436', marginTop: 7 },
  tagStatus: { fontSize: 10, fontWeight: '800', color: '#286A59', backgroundColor: '#E5F4E8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  status: { fontSize: 12, color: '#286A59', marginTop: 6, fontWeight: '700' },
  btnExcluir: { marginTop: 14, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 11, alignItems: 'center', backgroundColor: '#FFF3F0', borderWidth: 1, borderColor: '#F0D8D0' },
  btnExcluirText: { color: '#A3312D', fontSize: 12, fontWeight: '800' },
});
