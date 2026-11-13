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
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  listarPedidosEmpada,
  marcarEntregueEmpada,
  PedidoEmpada,
  onAdminAuthChange,
  logoutAdmin,
  moverPedidosConcluidosParaDashboard,
  formatarMoeda,
  AvaliacaoEmpada,
  listarAvaliacoesPendentes,
  aprovarAvaliacaoEmpada,
  excluirAvaliacaoEmpada,
} from '../src/services/firebase';

// ajuste o caminho se for diferente
import logoEmpadao from '../assets/logo-empadao-tai.png';

const AdminScreen: React.FC = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const [pedidos, setPedidos] = useState<PedidoEmpada[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [avaliacoesPendentes, setAvaliacoesPendentes] = useState<AvaliacaoEmpada[]>([]);
  const [loadingAvaliacoes, setLoadingAvaliacoes] = useState(false);

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

  const carregarAvaliacoes = async () => {
    setLoadingAvaliacoes(true);
    const res = await listarAvaliacoesPendentes();
    setLoadingAvaliacoes(false);
    if (res.success) {
      setAvaliacoesPendentes(res.avaliacoes);
    } else {
      Alert.alert('Comentários', res.error ?? 'Não foi possível carregar os comentários pendentes.');
    }
  };

  useEffect(() => {
    const unsub = onAdminAuthChange((user) => {
      if (!user) {
        router.replace('/');
      } else {
        carregar();
        carregarAvaliacoes();
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

  const aprovarAvaliacao = async (id: string) => {
    const res = await aprovarAvaliacaoEmpada(id);
    if (res.success) {
      setAvaliacoesPendentes((items) => items.filter((item) => item.id !== id));
    } else {
      Alert.alert('Comentários', res.error ?? 'Não foi possível aprovar o comentário.');
    }
  };

  const excluirAvaliacao = (id: string) => {
    Alert.alert('Excluir comentário?', 'Ele não será publicado no site.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const res = await excluirAvaliacaoEmpada(id);
          if (res.success) {
            setAvaliacoesPendentes((items) => items.filter((item) => item.id !== id));
          } else {
            Alert.alert('Comentários', res.error ?? 'Não foi possível excluir o comentário.');
          }
        },
      },
    ]);
  };

  const pendentes = pedidos.filter((p) => !p.entregue);
  const entregues = pedidos.filter((p) => p.entregue);

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
            <Text style={styles.titulo}>Painel Administrativo</Text>
            <Text style={styles.subtitulo}>Empadão da Taí · Gestão de pedidos</Text>
          </View>
        </View>

        <View style={[styles.headerButtons, isWide && styles.headerButtonsWide]}>
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
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Visão geral</Text>
            <Text style={styles.sectionHint}>Acompanhe os pedidos da loja</Text>
          </View>
        </View>
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

        <TouchableOpacity style={styles.atualizarBtn} onPress={() => { carregar(); carregarAvaliacoes(); }}>
          <Text style={styles.atualizarText}>Atualizar pedidos e comentários</Text>
        </TouchableOpacity>
      </View>

      {/* Pendentes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pedidos pendentes</Text>
        {loading && pedidos.length === 0 ? (
          <ActivityIndicator color="#A74436" />
        ) : pendentes.length === 0 ? (
          <Text style={styles.empty}>Nenhum pedido pendente</Text>
        ) : (
          <View style={[styles.cardGrid, isWide && styles.cardGridWide]}>
          {pendentes.map((p) => (
            <View key={p.id} style={[styles.card, isWide && styles.cardWide]}>
              <View style={styles.cardHeader}>
                <Text style={styles.nome}>{p.nome}</Text>
                <Text style={styles.tagPendentes}>Pendente</Text>
              </View>

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
              {p.formaPagamento ? <Text style={styles.linha}>Pagamento: {p.formaPagamento === 'pix' ? 'Pix agora · conferir comprovante' : 'Na entrega'}</Text> : null}
              {typeof p.valorTotal === 'number' ? <Text style={styles.preco}>Total: {formatarMoeda(p.valorTotal)}</Text> : null}
              {p.observacao ? <Text style={styles.linha}>Obs: {p.observacao}</Text> : null}

              <TouchableOpacity
                style={[styles.btnMini, styles.btnEntregar]}
                onPress={() => p.id && handleToggle(p.id, true)}
              >
                <Text style={styles.btnMiniText}>Marcar como entregue</Text>
              </TouchableOpacity>
            </View>
          ))}
          </View>
        )}
      </View>

      {/* Entregues */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pedidos entregues</Text>
        {entregues.length === 0 ? (
          <Text style={styles.empty}>Nenhum pedido entregue ainda</Text>
        ) : (
          <View style={[styles.cardGrid, isWide && styles.cardGridWide]}>
          {entregues.map((p) => (
            <View key={p.id} style={[styles.card, styles.cardEntregue, isWide && styles.cardWide]}>
              <View style={styles.cardHeader}>
                <Text style={styles.nome}>{p.nome}</Text>
                <Text style={styles.tagEntregue}>Entregue</Text>
              </View>

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
              {p.formaPagamento ? <Text style={styles.linha}>Pagamento: {p.formaPagamento === 'pix' ? 'Pix agora · conferir comprovante' : 'Na entrega'}</Text> : null}
              {typeof p.valorTotal === 'number' ? <Text style={styles.preco}>Total: {formatarMoeda(p.valorTotal)}</Text> : null}
              {p.observacao ? <Text style={styles.linha}>Obs: {p.observacao}</Text> : null}
            </View>
          ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Comentários para aprovar</Text>
        {loadingAvaliacoes ? (
          <ActivityIndicator color="#A74436" />
        ) : avaliacoesPendentes.length === 0 ? (
          <Text style={styles.empty}>Nenhum comentário aguardando aprovação.</Text>
        ) : (
          <View style={[styles.cardGrid, isWide && styles.cardGridWide]}>
          {avaliacoesPendentes.map((avaliacao) => (
            <View key={avaliacao.id} style={[styles.card, isWide && styles.cardWide]}>
              <View style={styles.cardHeader}>
                <Text style={styles.nome}>{avaliacao.nome}</Text>
                <Text style={styles.avaliacaoEstrelas}>{'★'.repeat(avaliacao.nota)}{'☆'.repeat(5 - avaliacao.nota)}</Text>
              </View>
              <Text style={styles.linha}>{avaliacao.comentario}</Text>
              <View style={styles.avaliacaoActions}>
                <TouchableOpacity style={styles.aprovarBtn} onPress={() => aprovarAvaliacao(avaliacao.id)}>
                  <Text style={styles.avaliacaoActionText}>Aprovar e publicar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.excluirAvaliacaoBtn} onPress={() => excluirAvaliacao(avaliacao.id)}>
                  <Text style={styles.excluirAvaliacaoText}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          </View>
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
  headerButtons: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, gap: 10 },
  headerButtonsWide: { marginTop: 0, justifyContent: 'flex-end' },
  backBtn: { paddingHorizontal: 15, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: '#F4E4DD', backgroundColor: '#FFF9F4' },
  backText: { color: '#512A46', fontSize: 12, fontWeight: '800' },
  logoutBtn: { paddingHorizontal: 15, paddingVertical: 11, borderRadius: 12, backgroundColor: '#7B3650', borderWidth: 1, borderColor: '#93536A' },
  logoutText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

  section: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: '#4D2C43', marginBottom: 4 },
  sectionHint: { fontSize: 12, color: '#927A8D' },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  stat: { alignItems: 'flex-start', justifyContent: 'center', flex: 1, padding: 14, borderRadius: 17, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EFE2DC' },
  statNumero: { fontSize: 27, fontWeight: '800', color: '#A74436' },
  statLabel: { fontSize: 11, color: '#806578', marginTop: 4, fontWeight: '700' },
  atualizarBtn: { alignSelf: 'flex-start', backgroundColor: '#A74436', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12 },
  atualizarText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  avaliacaoEstrelas: { color: '#D99B2B', fontSize: 14, letterSpacing: 1 },
  avaliacaoActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  aprovarBtn: { flex: 1, paddingVertical: 11, paddingHorizontal: 10, borderRadius: 11, alignItems: 'center', backgroundColor: '#37866B' },
  avaliacaoActionText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  excluirAvaliacaoBtn: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: 11, alignItems: 'center', backgroundColor: '#FFF3F0', borderWidth: 1, borderColor: '#F0D8D0' },
  excluirAvaliacaoText: { color: '#A3312D', fontSize: 11, fontWeight: '800' },
  empty: { fontSize: 13, color: '#927A8D', marginTop: 4, padding: 16, borderRadius: 14, backgroundColor: '#FFFDFB' },

  cardGrid: { gap: 12 },
  cardGridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#EFE2DC', shadowColor: '#513A34', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardWide: { width: '48.5%' },
  cardEntregue: { borderColor: '#D5E8D8', backgroundColor: '#FBFEFA' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  nome: { flexShrink: 1, fontSize: 15, fontWeight: '800', color: '#3E2B34' },
  linha: { fontSize: 12, lineHeight: 19, color: '#73606A', marginTop: 2 },
  preco: { fontSize: 15, fontWeight: '800', color: '#A74436', marginTop: 7 },
  tagPendentes: { fontSize: 10, fontWeight: '800', color: '#8A5B12', backgroundColor: '#FFF4D6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  tagEntregue: { fontSize: 10, fontWeight: '800', color: '#286A59', backgroundColor: '#E5F4E8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  btnMini: { marginTop: 14, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 11, alignItems: 'center' },
  btnMiniText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  btnEntregar: { backgroundColor: '#37866B' },
  btnDashboardMove: { backgroundColor: '#A74436', marginTop: 6 },
  btnDashboardSimple: { backgroundColor: '#704D67', marginTop: 8 },
});
