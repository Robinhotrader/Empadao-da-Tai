import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../src/components/Input';
import { PixQrCode } from '../src/components/PixQrCode';
import { criarPayloadPix, PIX_KEY, PIX_RECEIVER_NAME } from '../src/services/pix';
import {
  criarPedidoEmpada,
  tamanhos,
  combos,
  sabores,
  TamanhoEmpada,
  ComboEmpada,
  SaborEmpada,
  FormaPagamentoEmpada,
  ItemPedidoEmpada,
  precos,
  calcularPrecoUnitarioPedido,
  formatarMoeda,
  AvaliacaoEmpada,
  criarAvaliacaoEmpada,
  listarAvaliacoesAprovadas,
} from '../src/services/firebase';
import logoEmpadaoTai from '../assets/logo-empadao-tai.png';
import fotoProdutos from '../assets/produtos-empadao-torta-fria.jpeg';

const ADMIN_WHATSAPP_NUMBER = '5547988564569';
const MAX_QUANTIDADE = 20;
type PedidoConfirmado = {
  id: string;
  nome: string;
  telefone: string;
  itens: ItemPedidoEmpada[];
  formaPagamento: FormaPagamentoEmpada;
  quantidade: number;
  valorTotal: number;
  observacao: string;
};

function mesmaVariacaoPedido(a: ItemPedidoEmpada, b: ItemPedidoEmpada) {
  return a.sabor === b.sabor && a.tamanho === b.tamanho && a.combo === b.combo;
}

function formatarTelefone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) {
    if (!digits.length) return '';
    return digits.length === 2 ? `(${digits})` : `(${digits}`;
  }
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function nomeCombo(combo: ComboEmpada) {
  if (combo === 'Sem mini refrigerante') return 'Sem mini refrigerante';
  if (combo === 'Com mini refrigerante') return `Mini refrigerante (+ ${formatarMoeda(precos.miniRefrigerante)} por unidade)`;
  return combo.replace('Maracuja', 'Maracujá');
}

function nomeFormaPagamento(formaPagamento: FormaPagamentoEmpada) {
  return formaPagamento === 'pix' ? 'Pix agora' : 'Pagamento na entrega';
}

export default function HomeScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const positions = useRef({ menu: 0, pedido: 0 });
  const pageOffset = useRef(0);
  const { width } = useWindowDimensions();
  const isWide = width >= 760;

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [sabor, setSabor] = useState<SaborEmpada>(sabores[0]);
  const [tamanho, setTamanho] = useState<TamanhoEmpada>(tamanhos[0]);
  const [combo, setCombo] = useState<ComboEmpada>(combos[0]);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamentoEmpada>('entrega');
  const [quantidade, setQuantidade] = useState(1);
  const [itensCarrinho, setItensCarrinho] = useState<ItemPedidoEmpada[]>([]);
  const [mensagemCarrinho, setMensagemCarrinho] = useState('');
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [pedidoConfirmado, setPedidoConfirmado] = useState<PedidoConfirmado | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoEmpada[]>([]);
  const [carregandoAvaliacoes, setCarregandoAvaliacoes] = useState(true);
  const [erroCarregamentoAvaliacoes, setErroCarregamentoAvaliacoes] = useState(false);
  const [nomeAvaliacao, setNomeAvaliacao] = useState('');
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState('');
  const [notaAvaliacao, setNotaAvaliacao] = useState(0);
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
  const [mensagemAvaliacao, setMensagemAvaliacao] = useState('');
  const [erroAvaliacao, setErroAvaliacao] = useState('');
  const [fotoAmpliada, setFotoAmpliada] = useState(false);
  const tamanhosDisponiveis: TamanhoEmpada[] = sabor === 'Torta Fria' ? ['500g'] : tamanhos;
  const precoUnitario = calcularPrecoUnitarioPedido(sabor, tamanho, combo);
  const subtotalSelecionado = precoUnitario * quantidade;
  const unidadesCarrinho = itensCarrinho.reduce((total, item) => total + item.quantidade, 0);
  const quantidadeDisponivel = Math.max(0, MAX_QUANTIDADE - unidadesCarrinho);
  const valorTotalCarrinho = itensCarrinho.reduce((total, item) => total + item.valorTotal, 0);

  useEffect(() => {
    let ativo = true;
    listarAvaliacoesAprovadas().then((res) => {
      if (!ativo) return;
      if (res.success) setAvaliacoes(res.avaliacoes);
      else setErroCarregamentoAvaliacoes(true);
      setCarregandoAvaliacoes(false);
    });
    return () => { ativo = false; };
  }, []);

  const irPara = (section: 'menu' | 'pedido') => {
    scrollRef.current?.scrollTo({ y: positions.current[section], animated: true });
  };

  const aplicarSabor = (novoSabor: SaborEmpada) => {
    setSabor(novoSabor);
    setTamanho(novoSabor === 'Torta Fria' ? '500g' : '250g');
  };

  const selecionarSabor = (novoSabor: SaborEmpada) => {
    aplicarSabor(novoSabor);
    irPara('pedido');
  };

  const adicionarItemCarrinho = () => {
    setErro('');
    setMensagemCarrinho('');

    if (quantidade > quantidadeDisponivel) {
      setErro(`Este pedido permite até ${MAX_QUANTIDADE} unidades no total.`);
      return;
    }

    const novoItem: ItemPedidoEmpada = {
      sabor,
      tamanho,
      combo,
      quantidade,
      precoUnitario,
      valorTotal: subtotalSelecionado,
    };
    setItensCarrinho((itens) => {
      const unidadesAtuais = itens.reduce((total, item) => total + item.quantidade, 0);
      if (unidadesAtuais + quantidade > MAX_QUANTIDADE) return itens;
      const indiceExistente = itens.findIndex((item) => mesmaVariacaoPedido(item, novoItem));
      if (indiceExistente >= 0) {
        return itens.map((item, index) => {
          if (index !== indiceExistente) return item;
          const novaQuantidade = item.quantidade + quantidade;
          return { ...item, quantidade: novaQuantidade, valorTotal: item.precoUnitario * novaQuantidade };
        });
      }
      return [...itens, novoItem];
    });

    setMensagemCarrinho('Item adicionado ao pedido. Você pode escolher outro produto ou tamanho.');
    setQuantidade(1);
  };

  const alterarQuantidadeCarrinho = (itemAlvo: ItemPedidoEmpada, variacao: number) => {
    setItensCarrinho((itens) => {
      const unidadesAtuais = itens.reduce((total, item) => total + item.quantidade, 0);
      if (variacao > 0 && unidadesAtuais >= MAX_QUANTIDADE) return itens;
      return itens.map((item) => {
        if (!mesmaVariacaoPedido(item, itemAlvo)) return item;
        const novaQuantidade = Math.max(1, item.quantidade + variacao);
        return { ...item, quantidade: novaQuantidade, valorTotal: item.precoUnitario * novaQuantidade };
      });
    });
    setMensagemCarrinho('');
    setErro('');
  };

  const removerItemCarrinho = (itemAlvo: ItemPedidoEmpada) => {
    setItensCarrinho((itens) => itens.filter((item) => !mesmaVariacaoPedido(item, itemAlvo)));
    setMensagemCarrinho('');
    setErro('');
  };

  const enviarAvaliacao = async () => {
    const nomeLimpo = nomeAvaliacao.trim();
    const comentarioLimpo = comentarioAvaliacao.trim();
    setErroAvaliacao('');
    setMensagemAvaliacao('');

    if (nomeLimpo.length < 2) {
      setErroAvaliacao('Informe seu nome para enviar a avaliação.');
      return;
    }
    if (comentarioLimpo.length < 8) {
      setErroAvaliacao('Escreva um pouco mais sobre sua experiência (mínimo de 8 caracteres).');
      return;
    }
    if (notaAvaliacao === 0) {
      setErroAvaliacao('Escolha uma nota de 1 a 5 estrelas.');
      return;
    }

    setEnviandoAvaliacao(true);
    const res = await criarAvaliacaoEmpada({ nome: nomeLimpo, comentario: comentarioLimpo, nota: notaAvaliacao });
    setEnviandoAvaliacao(false);

    if (res.success) {
      setNomeAvaliacao('');
      setComentarioAvaliacao('');
      setNotaAvaliacao(0);
      setMensagemAvaliacao('Obrigada! Seu comentário foi enviado e aparecerá aqui depois da aprovação.');
      return;
    }

    setErroAvaliacao(
      res.error?.toLowerCase().includes('permission')
        ? 'O Firebase ainda não liberou o envio de avaliações. Tente novamente mais tarde.'
        : res.error ?? 'Não foi possível enviar agora. Tente novamente.',
    );
  };

  const handleEnviar = async () => {
    const nomeLimpo = nome.trim();
    const telefoneLimpo = telefone.replace(/\D/g, '');

    if (itensCarrinho.length === 0) {
      setErro('Adicione pelo menos um produto ao pedido.');
      return;
    }
    if (!nomeLimpo) {
      setErro('Informe seu nome para identificar o pedido.');
      return;
    }
    if (telefoneLimpo.length < 10) {
      setErro('Confira o telefone com DDD para a Taí poder falar com você.');
      return;
    }

    setErro('');
    setLoading(true);
    const primeiroItem = itensCarrinho[0];
    const res = await criarPedidoEmpada({
      nome: nomeLimpo,
      telefone: formatarTelefone(telefone),
      sabor: primeiroItem.sabor,
      tamanho: primeiroItem.tamanho,
      combo: primeiroItem.combo,
      itens: itensCarrinho,
      formaPagamento,
      quantidade: unidadesCarrinho,
      precoUnitario: primeiroItem.precoUnitario,
      valorTotal: valorTotalCarrinho,
      observacao: observacao.trim(),
    });
    setLoading(false);

    if (res.success) {
      setPedidoConfirmado({
        id: res.id,
        nome: nomeLimpo,
        telefone: formatarTelefone(telefone),
        itens: [...itensCarrinho],
        formaPagamento,
        quantidade: unidadesCarrinho,
        valorTotal: valorTotalCarrinho,
        observacao: observacao.trim(),
      });
      setNome('');
      setTelefone('');
      setObservacao('');
      setQuantidade(1);
      setItensCarrinho([]);
      setMensagemCarrinho('');
      setSabor(sabores[0]);
      setTamanho(tamanhos[0]);
      setCombo(combos[0]);
      setFormaPagamento('entrega');
      scrollRef.current?.scrollTo({ y: positions.current.pedido, animated: true });
    } else {
      setErro(res.error ?? 'Não foi possível registrar o pedido. Tente novamente.');
    }
  };

  const abrirWhatsApp = (pedido: PedidoConfirmado) => {
    const resumoItens = pedido.itens.map((item) =>
      `• ${item.quantidade}x ${item.sabor} (${item.tamanho}) · ${nomeCombo(item.combo)} · ${formatarMoeda(item.valorTotal)}`,
    ).join('\n');
    const mensagem = encodeURIComponent(
      `Olá, Taí! Acabei de registrar meu pedido pelo site.\n\n` +
        `Pedido: ${pedido.id.slice(0, 8).toUpperCase()}\n` +
        `Nome: ${pedido.nome}\n` +
        `Telefone: ${pedido.telefone}\n` +
        `Itens do pedido:\n${resumoItens}\n` +
        `Quantidade total: ${pedido.quantidade}\n` +
        `Forma de pagamento: ${nomeFormaPagamento(pedido.formaPagamento)}\n` +
        `Total: ${formatarMoeda(pedido.valorTotal)}\n` +
        `${pedido.formaPagamento === 'pix' ? 'Vou enviar o comprovante do Pix por aqui.\n' : ''}` +
        `Observação: ${pedido.observacao || 'Nenhuma'}`,
    );
    const url = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${mensagem}`;

    if (Platform.OS === 'web') {
      // O botão é uma ação direta da pessoa, então o Safari não bloqueia a abertura.
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    Linking.openURL(url).catch(() => {
      Alert.alert('Não foi possível abrir o WhatsApp', 'Tente novamente ou fale com a Taí pelo telefone.');
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        <View style={styles.headerShell}>
          <View style={[styles.headerInner, isWide && styles.headerInnerWide]}>
            <TouchableOpacity
              style={styles.brand}
              onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
              accessibilityRole="button"
              accessibilityLabel="Voltar ao início"
            >
              <Image source={logoEmpadaoTai} style={styles.brandLogo} accessibilityLabel="Logo Empadão da Taí" />
              <View>
                <Text style={styles.brandName}>Empadão da Taí</Text>
                <Text style={styles.brandCaption}>feito com carinho</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.nav}>
              <TouchableOpacity onPress={() => irPara('menu')} style={styles.navButton} accessibilityRole="button">
                <Text style={styles.navText}>Cardápio</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => irPara('pedido')} style={styles.navButton} accessibilityRole="button">
                <Text style={styles.navText}>Como pedir</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/admin-login')} style={styles.adminNav} accessibilityRole="button">
                <Text style={styles.adminNavText}>Área da Taí</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View
          style={[styles.page, { paddingHorizontal: isWide ? 34 : 18 }]}
          onLayout={(event) => { pageOffset.current = event.nativeEvent.layout.y; }}
        >
          <View style={[styles.hero, isWide && styles.heroWide]}>
            <View style={styles.heroCopy}>
              <View style={styles.eyebrow}>
                <Text style={styles.eyebrowText}>✨ RECEITA CASEIRA, SABOR DE VERDADE</Text>
              </View>
              <Text style={[styles.heroTitle, !isWide && styles.heroTitleMobile]}>
                Um pedacinho de carinho em cada fatia.
              </Text>
              <Text style={styles.heroDescription}>
                Escolha seu empadão ou torta fria e monte seu pedido. A Taí confirma os detalhes com você pelo WhatsApp.
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => irPara('pedido')} accessibilityRole="button">
                <Text style={styles.primaryButtonText}>Montar meu pedido</Text>
                <Text style={styles.primaryButtonArrow}>→</Text>
              </TouchableOpacity>
              <View style={styles.heroNote}>
                <View style={styles.noteDot} />
                <Text style={styles.heroNoteText}>Pedido enviado direto para a Taí</Text>
              </View>
            </View>
            <View style={styles.heroArt}>
              <View style={styles.artCircle} />
              <Image source={logoEmpadaoTai} style={[styles.heroLogo, !isWide && styles.heroLogoMobile]} resizeMode="contain" />
              <View style={styles.artTag}>
                <Text style={styles.artTagEmoji}>🥧</Text>
                <View>
                  <Text style={styles.artTagTitle}>Feito com carinho</Text>
                  <Text style={styles.artTagCaption}>da cozinha da Taí</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.trustRow, !isWide && styles.trustRowMobile]}>
            <TrustItem icon="♡" title="Sabor caseiro" detail="com aquele toque especial" />
            <View style={styles.trustDivider} />
            <TrustItem icon="✦" title="Do seu jeito" detail="escolha produto e tamanho" />
            <View style={styles.trustDivider} />
            <TrustItem icon="☏" title="Fácil de pedir" detail="confirme pelo WhatsApp" />
          </View>

          <View onLayout={(event) => { positions.current.menu = pageOffset.current + event.nativeEvent.layout.y; }} style={styles.section}>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionEyebrow}>ESCOLHA O SEU FAVORITO</Text>
                <Text style={styles.sectionTitle}>Nosso cardápio</Text>
              </View>
              <Text style={styles.sectionAside}>Empadão e torta fria, feitos com carinho.</Text>
            </View>
            <View style={[styles.flavorGrid, isWide && styles.flavorGridWide]}>
              {sabores.map((item, index) => (
                <View key={item} style={[styles.flavorCard, isWide && styles.flavorCardWide]}>
                  <View style={[styles.flavorIllustration, index === 1 && styles.flavorIllustrationAlt]}>
                    <Text style={styles.flavorEmoji}>🥧</Text>
                    <View style={styles.flavorBadge}>
                      <Text style={styles.flavorBadgeText}>DA TAÍ</Text>
                    </View>
                  </View>
                  <View style={styles.flavorInfo}>
                    <Text style={styles.flavorName}>{item}</Text>
                    <Text style={styles.flavorDescription}>
                      {item === 'Torta Fria'
                        ? 'Torta fria em porção de 500 g.'
                        : 'Frango, palmito e catupiry: uma combinação cremosa e cheia de sabor.'}
                    </Text>
                    <Text style={styles.flavorPrice}>
                      {item === 'Torta Fria'
                        ? `500 g · ${formatarMoeda(precos.tortaFria500g)}`
                        : `250 g · ${formatarMoeda(precos.empadao250g)}  |  500 g · ${formatarMoeda(precos.empadao500g)}`}
                    </Text>
                    <TouchableOpacity
                      style={styles.flavorButton}
                      onPress={() => selecionarSabor(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Escolher ${item}`}
                    >
                      <Text style={styles.flavorButtonText}>Escolher este produto</Text>
                      <Text style={styles.flavorButtonArrow}>↗</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
            <Text style={styles.priceNote}>Mini refrigerante opcional por {formatarMoeda(precos.miniRefrigerante)} a unidade.</Text>
          </View>

          <View style={styles.gallerySection}>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionEyebrow}>UM GOSTINHO DO QUE VEM POR AÍ</Text>
                <Text style={styles.sectionTitle}>Feitos com carinho</Text>
              </View>
            </View>
            <View style={[styles.galleryCard, isWide && styles.galleryCardWide]}>
              <TouchableOpacity
                style={[styles.galleryPhotoWrap, isWide && styles.galleryPhotoWrapWide]}
                onPress={() => setFotoAmpliada(true)}
                accessibilityRole="button"
                accessibilityLabel="Ampliar a foto do Empadão e da Torta Fria da Taí"
              >
                <Image
                  source={fotoProdutos}
                  style={styles.galleryPhoto}
                  resizeMode="contain"
                  accessibilityLabel="Empadões e torta fria preparados pela Taí"
                />
              </TouchableOpacity>
              <View style={styles.galleryCopy}>
                <Text style={styles.galleryKicker}>EMPADÃO DA TAÍ</Text>
                <Text style={styles.galleryTitle}>Empadão e Torta Fria</Text>
                <Text style={styles.galleryDescription}>
                  Uma foto dos nossos produtos para você escolher com água na boca. Toque na imagem para ver de pertinho.
                </Text>
                <TouchableOpacity style={styles.galleryButton} onPress={() => irPara('pedido')} accessibilityRole="button">
                  <Text style={styles.galleryButtonText}>Quero fazer meu pedido</Text>
                  <Text style={styles.galleryButtonArrow}>→</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={[styles.reviewsSection, !isWide && styles.reviewsSectionMobile]}>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionEyebrow}>CARINHO COMPARTILHADO</Text>
                <Text style={styles.sectionTitle}>Quem já provou</Text>
              </View>
              {avaliacoes.length > 0 ? (
                <Text style={styles.reviewCount}>{avaliacoes.length} {avaliacoes.length === 1 ? 'avaliação' : 'avaliações'}</Text>
              ) : null}
            </View>

            <View style={[styles.reviewsLayout, !isWide && styles.reviewsLayoutMobile, isWide && styles.reviewsLayoutWide]}>
              <View style={[styles.reviewsList, isWide && styles.reviewsListWide]}>
                {carregandoAvaliacoes ? (
                  <ActivityIndicator color="#A74436" />
                ) : erroCarregamentoAvaliacoes ? (
                  <View style={styles.emptyReviews}>
                    <Text style={styles.emptyReviewsText}>Não foi possível carregar os comentários agora. Tente novamente mais tarde.</Text>
                  </View>
                ) : avaliacoes.length === 0 ? (
                  <View style={styles.emptyReviews}>
                    <Text style={styles.emptyReviewsIcon}>♡</Text>
                    <Text style={styles.emptyReviewsTitle}>Sua opinião pode ser a primeira</Text>
                    <Text style={styles.emptyReviewsText}>Conte como foi sua experiência com os produtos da Taí.</Text>
                  </View>
                ) : (
                  avaliacoes.map((avaliacao) => (
                    <View key={avaliacao.id} style={styles.reviewCard}>
                      <View style={styles.reviewCardHeader}>
                        <Text style={styles.reviewName}>{avaliacao.nome}</Text>
                        <Text style={styles.reviewStars} accessibilityLabel={`${avaliacao.nota} de 5 estrelas`}>
                          {'★'.repeat(avaliacao.nota)}{'☆'.repeat(5 - avaliacao.nota)}
                        </Text>
                      </View>
                      <Text style={styles.reviewComment}>{avaliacao.comentario}</Text>
                    </View>
                  ))
                )}
              </View>

              <View style={[styles.reviewForm, !isWide && styles.reviewFormMobile, isWide && styles.reviewFormWide]}>
                <Text style={styles.reviewFormTitle}>Já comprou? Deixe seu comentário</Text>
                <Text style={styles.reviewFormSubtitle}>Sua avaliação será aprovada antes de aparecer no site.</Text>
                <Input
                  label="Seu nome"
                  value={nomeAvaliacao}
                  onChangeText={(value) => { setNomeAvaliacao(value); setErroAvaliacao(''); setMensagemAvaliacao(''); }}
                  placeholder="Como podemos chamar você?"
                  maxLength={60}
                  autoComplete="name"
                />
                <Text style={styles.ratingLabel}>Sua nota</Text>
                <View style={styles.ratingButtons}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <TouchableOpacity
                      key={value}
                      onPress={() => setNotaAvaliacao(value)}
                      accessibilityRole="radio"
                      accessibilityLabel={`${value} ${value === 1 ? 'estrela' : 'estrelas'}`}
                      accessibilityState={{ checked: notaAvaliacao === value }}
                    >
                      <Text style={[styles.ratingStar, value <= notaAvaliacao && styles.ratingStarSelected]}>★</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Input
                  label="Seu comentário"
                  value={comentarioAvaliacao}
                  onChangeText={(value) => { setComentarioAvaliacao(value); setErroAvaliacao(''); setMensagemAvaliacao(''); }}
                  placeholder="Conte o que achou do seu pedido"
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  textAlignVertical="top"
                />
                <Text style={styles.commentLength}>{comentarioAvaliacao.length}/500</Text>
                {erroAvaliacao ? <Text style={styles.reviewError} accessibilityLiveRegion="polite">{erroAvaliacao}</Text> : null}
                {mensagemAvaliacao ? <Text style={styles.reviewSuccess} accessibilityLiveRegion="polite">{mensagemAvaliacao}</Text> : null}
                <TouchableOpacity
                  style={[styles.reviewSubmit, enviandoAvaliacao && styles.submitButtonDisabled]}
                  onPress={enviarAvaliacao}
                  disabled={enviandoAvaliacao}
                  accessibilityRole="button"
                >
                  {enviandoAvaliacao ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.reviewSubmitText}>Enviar para aprovação</Text>}
                  {!enviandoAvaliacao ? <Text style={styles.submitButtonArrow}>→</Text> : null}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View onLayout={(event) => { positions.current.pedido = pageOffset.current + event.nativeEvent.layout.y; }} style={[styles.orderSection, !isWide && styles.orderSectionMobile]}>
            <View style={[styles.orderLayout, !isWide && styles.orderLayoutMobile, isWide && styles.orderLayoutWide]}>
              <View style={[styles.orderIntro, isWide && styles.orderIntroWide]}>
                <Text style={styles.sectionEyebrow}>SIMPLES ASSIM</Text>
                <Text style={[styles.orderTitle, !isWide && styles.orderTitleMobile]}>Seu pedido começa aqui.</Text>
                <Text style={[styles.orderDescription, !isWide && styles.orderDescriptionMobile]}>
                  Escolha os produtos, informe seus dados e registre o pedido. Depois, confirme os detalhes com a Taí pelo WhatsApp.
                </Text>
                {isWide ? (
                  <View style={styles.steps}>
                    <Step number="01" title="Escolha" detail="produto, tamanho e refrigerante" />
                    <Step number="02" title="Registre" detail="deixe seu nome e telefone" />
                    <Step number="03" title="Confirme" detail="continue a conversa no WhatsApp" last />
                  </View>
                ) : null}
              </View>

              <View style={[styles.formCard, !isWide && styles.formCardMobile, isWide && styles.formCardWide]}>
                {pedidoConfirmado ? (
                  <View style={styles.successBox} accessibilityLiveRegion="polite">
                    <View style={styles.successIcon}><Text style={styles.successIconText}>✓</Text></View>
                    <Text style={styles.successTitle}>Pedido registrado!</Text>
                    <Text style={styles.successBody}>
                      O pedido <Text style={styles.successId}>#{pedidoConfirmado.id.slice(0, 8).toUpperCase()}</Text> já chegou para a Taí. Total: <Text style={styles.successId}>{formatarMoeda(pedidoConfirmado.valorTotal)}</Text>.
                    </Text>
                    <View style={styles.successItems}>
                      {pedidoConfirmado.itens.map((item, index) => (
                        <Text key={`${item.sabor}-${item.tamanho}-${item.combo}-${index}`} style={styles.successItemLine}>
                          {item.quantidade}x {item.sabor} · {item.tamanho} · {formatarMoeda(item.valorTotal)}
                        </Text>
                      ))}
                    </View>
                    {pedidoConfirmado.formaPagamento === 'pix' ? (
                      <View style={[styles.pixPaymentBox, width < 360 && styles.pixPaymentBoxStack]}>
                        <PixQrCode payload={criarPayloadPix(pedidoConfirmado.valorTotal)} />
                        <View style={[styles.pixPaymentDetails, width < 360 && styles.pixPaymentDetailsStack]}>
                          <Text style={styles.pixPaymentTitle}>Pague agora pelo Pix</Text>
                          <Text style={styles.pixPaymentText}>Recebedora: {PIX_RECEIVER_NAME}</Text>
                          <Text style={styles.pixPaymentText}>Valor: {formatarMoeda(pedidoConfirmado.valorTotal)}</Text>
                          <Text style={styles.pixKeyLabel}>Chave Pix (CPF)</Text>
                          <Text style={styles.pixKey} selectable>{PIX_KEY}</Text>
                          <Text style={[styles.pixPaymentHint, width < 360 && styles.pixPaymentHintCentered]}>Escaneie o QR para preencher o valor. Ou copie a chave e envie o comprovante pelo WhatsApp para a Taí confirmar o pagamento.</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.deliveryPaymentBox}>
                        <Text style={styles.deliveryPaymentText}>Pagamento escolhido: na entrega.</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.whatsappButton}
                      onPress={() => abrirWhatsApp(pedidoConfirmado)}
                      accessibilityRole="button"
                    >
                      <Text style={styles.whatsappIcon}>◉</Text>
                      <Text style={styles.whatsappButtonText}>{pedidoConfirmado.formaPagamento === 'pix' ? 'Enviar comprovante pelo WhatsApp' : 'Continuar pelo WhatsApp'}</Text>
                      <Text style={styles.whatsappArrow}>↗</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.newOrderButton}
                      onPress={() => setPedidoConfirmado(null)}
                      accessibilityRole="button"
                    >
                      <Text style={styles.newOrderButtonText}>Fazer outro pedido</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.formHeading}>
                      <Text style={styles.formTitle}>Monte seu pedido</Text>
                      <Text style={styles.formSubtitle}>Leva menos de um minuto</Text>
                    </View>

                    <Input
                      label="Seu nome"
                      value={nome}
                      onChangeText={(value) => { setNome(value); setErro(''); }}
                      placeholder="Como podemos chamar você?"
                      maxLength={80}
                      autoComplete="name"
                      returnKeyType="next"
                    />
                    <Input
                      label="WhatsApp com DDD"
                      value={telefone}
                      onChangeText={(value) => { setTelefone(formatarTelefone(value)); setErro(''); }}
                      placeholder="(47) 99999-9999"
                      keyboardType="phone-pad"
                      autoComplete="tel"
                    />

                    <OptionGroup<SaborEmpada>
                      label="Produto"
                      values={sabores}
                      selected={sabor}
                      onSelect={aplicarSabor}
                      wide={isWide}
                    />
                    <OptionGroup<TamanhoEmpada>
                      label="Tamanho"
                      values={tamanhosDisponiveis}
                      selected={tamanho}
                      onSelect={setTamanho}
                      wide={isWide}
                    />
                    <OptionGroup<ComboEmpada>
                      label="Acompanhamento"
                      values={combos}
                      selected={combo}
                      onSelect={setCombo}
                      wide={isWide}
                      displayValue={nomeCombo}
                    />

                    <View style={styles.quantityRow}>
                      <View>
                        <Text style={styles.fieldLabel}>Quantidade</Text>
                        <Text style={styles.quantityHint}>Ainda cabem {quantidadeDisponivel} unidades no pedido</Text>
                      </View>
                      <View style={styles.quantityControl}>
                        <TouchableOpacity
                          style={[styles.quantityButton, quantidade <= 1 && styles.quantityButtonDisabled]}
                          onPress={() => setQuantidade((value) => Math.max(1, value - 1))}
                          accessibilityRole="button"
                          accessibilityLabel="Diminuir quantidade"
                          accessibilityState={{ disabled: quantidade <= 1 }}
                          disabled={quantidade <= 1}
                        >
                          <Text style={styles.quantityButtonText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.quantityValue} accessibilityLiveRegion="polite">{quantidade}</Text>
                        <TouchableOpacity
                          style={[styles.quantityButton, quantidade >= quantidadeDisponivel && styles.quantityButtonDisabled]}
                          onPress={() => setQuantidade((value) => Math.min(quantidadeDisponivel, value + 1))}
                          accessibilityRole="button"
                          accessibilityLabel="Aumentar quantidade"
                          accessibilityState={{ disabled: quantidade >= quantidadeDisponivel }}
                          disabled={quantidade >= quantidadeDisponivel}
                        >
                          <Text style={styles.quantityButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.totalBox}>
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Valor por unidade</Text>
                        <Text style={styles.unitPrice}>{formatarMoeda(precoUnitario)}</Text>
                      </View>
                      <View style={[styles.totalRow, styles.grandTotalRow]}>
                        <Text style={styles.grandTotalLabel}>Subtotal deste item · {quantidade} {quantidade === 1 ? 'unidade' : 'unidades'}</Text>
                        <Text style={styles.grandTotalValue}>{formatarMoeda(subtotalSelecionado)}</Text>
                      </View>
                      {combo === 'Com mini refrigerante' ? (
                        <Text style={styles.totalHint}>Inclui mini refrigerante ({formatarMoeda(precos.miniRefrigerante)} por unidade).</Text>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      style={[styles.addItemButton, quantidadeDisponivel === 0 && styles.submitButtonDisabled]}
                      onPress={adicionarItemCarrinho}
                      disabled={quantidadeDisponivel === 0}
                      accessibilityRole="button"
                    >
                      <Text style={styles.addItemButtonText}>＋ Adicionar item ao pedido</Text>
                      <Text style={styles.addItemButtonPrice}>{formatarMoeda(subtotalSelecionado)}</Text>
                    </TouchableOpacity>

                    <View style={styles.cartBox}>
                      <View style={styles.cartHeader}>
                        <View>
                          <Text style={styles.cartTitle}>Seu pedido</Text>
                          <Text style={styles.cartCount}>{itensCarrinho.length} {itensCarrinho.length === 1 ? 'produto diferente' : 'produtos diferentes'}</Text>
                        </View>
                        <Text style={styles.cartHeaderTotal}>{formatarMoeda(valorTotalCarrinho)}</Text>
                      </View>
                      {itensCarrinho.length === 0 ? (
                        <Text style={styles.cartEmpty}>Adicione os produtos que deseja. Você pode misturar tamanhos no mesmo pedido.</Text>
                      ) : (
                        <View style={styles.cartItems}>
                          {itensCarrinho.map((item) => (
                            <View key={`${item.sabor}-${item.tamanho}-${item.combo}`} style={styles.cartItem}>
                              <View style={styles.cartItemTop}>
                                <View style={styles.cartItemInfo}>
                                  <Text style={styles.cartItemName}>{item.sabor}</Text>
                                  <Text style={styles.cartItemDescription}>{item.tamanho} · {item.combo === 'Com mini refrigerante' ? 'Com mini refrigerante' : 'Sem refrigerante'}</Text>
                                </View>
                                <Text style={styles.cartItemPrice}>{formatarMoeda(item.valorTotal)}</Text>
                              </View>
                              <View style={styles.cartItemBottom}>
                                <View style={styles.cartQuantityControl}>
                                  <TouchableOpacity
                                    style={[styles.cartQuantityButton, item.quantidade <= 1 && styles.quantityButtonDisabled]}
                                    onPress={() => alterarQuantidadeCarrinho(item, -1)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Diminuir ${item.sabor} ${item.tamanho}`}
                                    accessibilityState={{ disabled: item.quantidade <= 1 }}
                                    disabled={item.quantidade <= 1}
                                  >
                                    <Text style={styles.cartQuantityButtonText}>−</Text>
                                  </TouchableOpacity>
                                  <Text style={styles.cartQuantityValue}>{item.quantidade}</Text>
                                  <TouchableOpacity
                                    style={[styles.cartQuantityButton, unidadesCarrinho >= MAX_QUANTIDADE && styles.quantityButtonDisabled]}
                                    onPress={() => alterarQuantidadeCarrinho(item, 1)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Aumentar ${item.sabor} ${item.tamanho}`}
                                    accessibilityState={{ disabled: unidadesCarrinho >= MAX_QUANTIDADE }}
                                    disabled={unidadesCarrinho >= MAX_QUANTIDADE}
                                  >
                                    <Text style={styles.cartQuantityButtonText}>+</Text>
                                  </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                  style={styles.removeCartItem}
                                  onPress={() => removerItemCarrinho(item)}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Remover ${item.sabor} ${item.tamanho} do pedido`}
                                >
                                  <Text style={styles.removeCartItemText}>Remover</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                      <View style={styles.cartTotalRow}>
                        <Text style={styles.cartTotalLabel}>Total do pedido</Text>
                        <Text style={styles.cartTotalValue}>{formatarMoeda(valorTotalCarrinho)}</Text>
                      </View>
                    </View>
                    {mensagemCarrinho ? <Text style={styles.cartFeedback} accessibilityLiveRegion="polite">{mensagemCarrinho}</Text> : null}

                    <OptionGroup<FormaPagamentoEmpada>
                      label="Forma de pagamento"
                      values={['pix', 'entrega']}
                      selected={formaPagamento}
                      onSelect={setFormaPagamento}
                      wide={isWide}
                      displayValue={(value) => value === 'pix' ? 'Pix agora' : 'Pagar na entrega'}
                    />
                    {formaPagamento === 'pix' ? (
                      <Text style={styles.paymentHint}>Após registrar o pedido, a chave Pix e o valor aparecem na tela. A confirmação é feita manualmente após o envio do comprovante.</Text>
                    ) : null}

                    <Input
                      label="Alguma observação? (opcional)"
                      value={observacao}
                      onChangeText={setObservacao}
                      placeholder="Conte aqui algum detalhe importante"
                      multiline
                      numberOfLines={3}
                      maxLength={500}
                      textAlignVertical="top"
                    />

                    {erro ? <Text style={styles.errorText} accessibilityLiveRegion="polite">{erro}</Text> : null}

                    <TouchableOpacity
                      style={[styles.submitButton, (loading || itensCarrinho.length === 0) && styles.submitButtonDisabled]}
                      onPress={handleEnviar}
                      disabled={loading || itensCarrinho.length === 0}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: loading || itensCarrinho.length === 0 }}
                    >
                      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Registrar pedido</Text>}
                      {!loading && <Text style={styles.submitButtonArrow}>→</Text>}
                    </TouchableOpacity>
                    <Text style={styles.formFootnote}>Você pode combinar produtos diferentes em um pedido com até 20 unidades.</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.footerBrand}>
              <Image source={logoEmpadaoTai} style={styles.footerLogo} />
              <View>
                <Text style={styles.footerBrandName}>Empadão da Taí</Text>
                <Text style={styles.footerCaption}>Um carinho que vai ao forno. ♡</Text>
              </View>
            </View>
            <Text style={styles.footerText}>Feito com carinho, para compartilhar.</Text>
          </View>
        </View>
      </ScrollView>
      <Modal
        visible={fotoAmpliada}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setFotoAmpliada(false)}
      >
        <View style={styles.photoModalBackdrop}>
          <TouchableOpacity
            style={styles.photoModalClose}
            onPress={() => setFotoAmpliada(false)}
            accessibilityRole="button"
            accessibilityLabel="Fechar foto ampliada"
          >
            <Text style={styles.photoModalCloseText}>×</Text>
          </TouchableOpacity>
          <Image source={fotoProdutos} style={styles.photoModalImage} resizeMode="contain" />
        </View>
      </Modal>
    </View>
  );
}

function TrustItem({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return (
    <View style={styles.trustItem}>
      <View style={styles.trustIcon}><Text style={styles.trustIconText}>{icon}</Text></View>
      <View style={styles.trustCopy}>
        <Text style={styles.trustTitle}>{title}</Text>
        <Text style={styles.trustDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function Step({ number, title, detail, last }: { number: string; title: string; detail: string; last?: boolean }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepMarkerColumn}>
        <View style={styles.stepMarker}><Text style={styles.stepNumber}>{number}</Text></View>
        {!last && <View style={styles.stepLine} />}
      </View>
      <View style={styles.stepCopy}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function OptionGroup<T extends string>({
  label,
  values,
  selected,
  onSelect,
  wide,
  displayValue = (value: T) => value,
}: {
  label: string;
  values: T[];
  selected: T;
  onSelect: (value: T) => void;
  wide: boolean;
  displayValue?: (value: T) => string;
}) {
  return (
    <View style={styles.optionGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.optionList, wide && styles.optionListWide]}>
        {values.map((value) => {
          const isSelected = selected === value;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => onSelect(value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
            >
              <View style={[styles.optionRadio, isSelected && styles.optionRadioSelected]}>
                {isSelected ? <View style={styles.optionRadioDot} /> : null}
              </View>
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{displayValue(value)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFAF4' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  headerShell: {
    backgroundColor: '#FFFAF4',
    borderBottomWidth: 1,
    borderBottomColor: '#F1E8DC',
  },
  headerInner: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  headerInnerWide: {
    maxWidth: 1190,
    paddingHorizontal: 34,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandLogo: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFFFFF' },
  brandName: { color: '#3D2726', fontSize: 16, fontWeight: '800', letterSpacing: -0.4 },
  brandCaption: { color: '#9A746E', fontSize: 11, marginTop: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  navButton: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999 },
  navText: { color: '#745852', fontSize: 13, fontWeight: '600' },
  adminNav: { paddingVertical: 9, paddingHorizontal: 15, borderRadius: 999, borderWidth: 1, borderColor: '#E9D9C9' },
  adminNavText: { color: '#654842', fontSize: 12, fontWeight: '700' },
  page: { width: '100%', maxWidth: 1190, alignSelf: 'center' },
  hero: {
    marginTop: 24,
    backgroundColor: '#F8E7D7',
    borderRadius: 30,
    padding: 26,
    overflow: 'hidden',
    gap: 12,
  },
  heroWide: { minHeight: 372, paddingLeft: 54, paddingRight: 38, paddingVertical: 35, flexDirection: 'row', alignItems: 'center' },
  heroCopy: { flex: 1, zIndex: 1 },
  eyebrow: { alignSelf: 'flex-start', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#FFFFFFB8', marginBottom: 14 },
  eyebrowText: { color: '#875E4F', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  heroTitle: { maxWidth: 540, color: '#462A25', fontSize: 47, lineHeight: 52, fontWeight: '800', letterSpacing: -1.8 },
  heroTitleMobile: { fontSize: 35, lineHeight: 40, letterSpacing: -1.1 },
  heroDescription: { maxWidth: 470, color: '#765C53', fontSize: 15, lineHeight: 23, marginTop: 12 },
  primaryButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 18, backgroundColor: '#A74436', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14, marginTop: 21 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  primaryButtonArrow: { color: '#FFFFFF', fontSize: 18, lineHeight: 19 },
  heroNote: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 15 },
  noteDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#68876A' },
  heroNoteText: { fontSize: 11, color: '#7B6259' },
  heroArt: { height: 240, justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch', flex: 0.82, position: 'relative' },
  heroLogo: { width: 270, height: 270, zIndex: 1 },
  heroLogoMobile: { width: 200, height: 200 },
  artCircle: { position: 'absolute', width: 255, height: 255, borderRadius: 130, backgroundColor: '#F9D77E', opacity: 0.72 },
  artTag: { position: 'absolute', zIndex: 2, bottom: 2, right: 4, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#FFFFFF', shadowColor: '#5F372F', shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 },
  artTagEmoji: { fontSize: 23 },
  artTagTitle: { color: '#4F302B', fontSize: 11, fontWeight: '800' },
  artTagCaption: { color: '#92746D', fontSize: 10, marginTop: 2 },
  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingVertical: 22, marginTop: 4, borderBottomWidth: 1, borderBottomColor: '#EEE3D8' },
  trustRowMobile: { flexWrap: 'wrap', justifyContent: 'flex-start', gap: 15, paddingVertical: 19 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 180 },
  trustIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#F6E7DD', alignItems: 'center', justifyContent: 'center' },
  trustIconText: { color: '#A74436', fontSize: 20, fontWeight: '700' },
  trustCopy: { gap: 2 },
  trustTitle: { color: '#513833', fontSize: 12, fontWeight: '800' },
  trustDetail: { color: '#967B70', fontSize: 10 },
  trustDivider: { width: 1, height: 31, backgroundColor: '#E9DED3' },
  section: { paddingTop: 47, paddingBottom: 37 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 18 },
  sectionEyebrow: { color: '#B4624F', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  sectionTitle: { color: '#432C28', fontSize: 29, lineHeight: 35, fontWeight: '800', letterSpacing: -0.7, marginTop: 5 },
  sectionAside: { color: '#987E73', fontSize: 12, marginBottom: 4 },
  flavorGrid: { gap: 14 },
  flavorGridWide: { flexDirection: 'row' },
  flavorCard: { flex: 1, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0E6DC', overflow: 'hidden', flexDirection: 'row', minHeight: 190 },
  flavorCardWide: { minHeight: 213 },
  flavorIllustration: { width: 112, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7E5C7', position: 'relative' },
  flavorIllustrationAlt: { backgroundColor: '#F0E4EF' },
  flavorEmoji: { fontSize: 48 },
  flavorBadge: { position: 'absolute', left: 9, bottom: 10, backgroundColor: '#FFFFFFD9', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 4 },
  flavorBadgeText: { color: '#986449', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  flavorInfo: { flex: 1, paddingVertical: 17, paddingHorizontal: 15, justifyContent: 'center' },
  flavorName: { color: '#49332D', fontSize: 15, lineHeight: 20, fontWeight: '800' },
  flavorDescription: { color: '#927B72', fontSize: 11, lineHeight: 17, marginTop: 6 },
  flavorPrice: { color: '#8B4A3C', fontSize: 10, lineHeight: 15, fontWeight: '800', marginTop: 6 },
  flavorButton: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: 12 },
  flavorButtonText: { color: '#A74436', fontSize: 11, fontWeight: '800' },
  flavorButtonArrow: { color: '#A74436', fontSize: 14, fontWeight: '700' },
  priceNote: { color: '#9B857A', fontSize: 10, lineHeight: 15, marginTop: 12 },
  gallerySection: { paddingTop: 14, paddingBottom: 38 },
  galleryCard: { backgroundColor: '#F6E6EF', borderRadius: 24, borderWidth: 1, borderColor: '#EEDDE7', overflow: 'hidden' },
  galleryCardWide: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 24 },
  galleryPhotoWrap: { width: '80%', maxWidth: 320, aspectRatio: 1, alignSelf: 'center', backgroundColor: '#F2DDE9', overflow: 'hidden' },
  galleryPhotoWrapWide: { width: 320, height: 320, borderRadius: 17 },
  galleryPhoto: { width: '100%', height: '100%' },
  galleryCopy: { flex: 1, padding: 21 },
  galleryKicker: { color: '#A45482', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  galleryTitle: { color: '#4D2C43', fontSize: 26, lineHeight: 32, fontWeight: '800', marginTop: 7 },
  galleryDescription: { color: '#806578', fontSize: 12, lineHeight: 20, marginTop: 8, maxWidth: 340 },
  galleryButton: { flexDirection: 'row', alignItems: 'center', gap: 11, alignSelf: 'flex-start', backgroundColor: '#A74436', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12, marginTop: 16 },
  galleryButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  galleryButtonArrow: { color: '#FFFFFF', fontSize: 16 },
  photoModalBackdrop: { flex: 1, backgroundColor: '#241520F2', alignItems: 'center', justifyContent: 'center', padding: 16 },
  photoModalImage: { width: '96%', height: '88%' },
  photoModalClose: { position: 'absolute', zIndex: 2, top: 28, right: 20, width: 42, height: 42, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  photoModalCloseText: { color: '#513A34', fontSize: 28, lineHeight: 31 },
  reviewsSection: { padding: 22, marginBottom: 34, borderRadius: 24, backgroundColor: '#F4EAE1' },
  reviewsSectionMobile: { padding: 14, marginBottom: 18, borderRadius: 18 },
  reviewCount: { color: '#8D7066', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  reviewsLayout: { gap: 16 },
  reviewsLayoutMobile: { gap: 12 },
  reviewsLayoutWide: { flexDirection: 'row', alignItems: 'flex-start' },
  reviewsList: { gap: 10 },
  reviewsListWide: { flex: 1 },
  emptyReviews: { minHeight: 124, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#E9D9CD', backgroundColor: '#FFF9F4', alignItems: 'center', justifyContent: 'center' },
  emptyReviewsIcon: { color: '#B4624F', fontSize: 23, marginBottom: 6 },
  emptyReviewsTitle: { color: '#563C34', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  emptyReviewsText: { color: '#8A736A', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 4 },
  reviewCard: { padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#EFE3D9', backgroundColor: '#FFFFFF' },
  reviewCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  reviewName: { color: '#533A33', fontSize: 12, fontWeight: '800', flex: 1 },
  reviewStars: { color: '#D99B2B', fontSize: 12, letterSpacing: 1 },
  reviewComment: { color: '#78645B', fontSize: 12, lineHeight: 19, marginTop: 8 },
  reviewForm: { padding: 18, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EFE3D9' },
  reviewFormMobile: { padding: 14 },
  reviewFormWide: { flex: 1 },
  reviewFormTitle: { color: '#49332D', fontSize: 17, lineHeight: 23, fontWeight: '800' },
  reviewFormSubtitle: { color: '#8E776D', fontSize: 10, lineHeight: 16, marginTop: 4, marginBottom: 14 },
  ratingLabel: { color: '#62463F', fontSize: 11, fontWeight: '800', marginBottom: 5 },
  ratingButtons: { flexDirection: 'row', gap: 7, marginBottom: 13 },
  ratingStar: { color: '#D8C9BE', fontSize: 27, lineHeight: 32 },
  ratingStarSelected: { color: '#D99B2B' },
  commentLength: { color: '#8D776D', fontSize: 9, textAlign: 'right', marginTop: -8, marginBottom: 8 },
  reviewError: { color: '#A3312D', backgroundColor: '#FFF1EE', padding: 9, borderRadius: 9, fontSize: 10, lineHeight: 15, marginBottom: 8 },
  reviewSuccess: { color: '#256B43', backgroundColor: '#EDF8EF', padding: 9, borderRadius: 9, fontSize: 10, lineHeight: 15, marginBottom: 8 },
  reviewSubmit: { width: '100%', minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#A74436', borderRadius: 12, paddingHorizontal: 12 },
  reviewSubmitText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  orderSection: { paddingTop: 35, paddingBottom: 54, marginHorizontal: -18, paddingHorizontal: 18, backgroundColor: '#F4EAE1' },
  orderSectionMobile: { paddingTop: 22, paddingBottom: 32 },
  orderLayout: { width: '100%', maxWidth: 1122, alignSelf: 'center', gap: 24 },
  orderLayoutMobile: { gap: 12 },
  orderLayoutWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 36 },
  orderIntro: { paddingTop: 0 },
  orderIntroWide: { flex: 0.78, paddingTop: 12 },
  orderTitle: { color: '#432C28', fontSize: 33, lineHeight: 39, fontWeight: '800', letterSpacing: -1, marginTop: 8, maxWidth: 390 },
  orderTitleMobile: { fontSize: 25, lineHeight: 30, letterSpacing: -0.6, marginTop: 5, maxWidth: undefined },
  orderDescription: { color: '#80675D', fontSize: 13, lineHeight: 21, marginTop: 11, maxWidth: 420 },
  orderDescriptionMobile: { fontSize: 12, lineHeight: 18, marginTop: 6, maxWidth: undefined },
  steps: { marginTop: 24 },
  stepRow: { minHeight: 55, flexDirection: 'row', gap: 11 },
  stepMarkerColumn: { alignItems: 'center', width: 35 },
  stepMarker: { width: 31, height: 31, borderRadius: 11, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8D8CA' },
  stepNumber: { color: '#A85B49', fontSize: 9, fontWeight: '900' },
  stepLine: { width: 1, flex: 1, minHeight: 17, backgroundColor: '#DECABD' },
  stepCopy: { paddingTop: 2 },
  stepTitle: { color: '#553A33', fontSize: 12, fontWeight: '800' },
  stepDetail: { color: '#927B71', fontSize: 10, marginTop: 3 },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 23, borderWidth: 1, borderColor: '#EFE5DC', padding: 19, shadowColor: '#54392F', shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  formCardMobile: { padding: 14, borderRadius: 18 },
  formCardWide: { flex: 1 },
  formHeading: { marginBottom: 16 },
  formTitle: { color: '#49332D', fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  formSubtitle: { color: '#9A8279', fontSize: 11, marginTop: 4 },
  fieldLabel: { color: '#62463F', fontSize: 11, fontWeight: '800', marginBottom: 8 },
  optionGroup: { marginBottom: 12 },
  optionList: { gap: 7 },
  optionListWide: { flexDirection: 'row', flexWrap: 'wrap' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 11, borderWidth: 1, borderColor: '#EFE7E0', backgroundColor: '#FFFEFC', minHeight: 39 },
  optionSelected: { borderColor: '#D48D77', backgroundColor: '#FFF6F1' },
  optionRadio: { width: 15, height: 15, borderRadius: 8, borderWidth: 1.4, borderColor: '#CEBDB3', alignItems: 'center', justifyContent: 'center' },
  optionRadioSelected: { borderColor: '#A74436' },
  optionRadioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#A74436' },
  optionText: { flexShrink: 1, color: '#806A61', fontSize: 10, fontWeight: '600' },
  optionTextSelected: { color: '#713D32', fontWeight: '800' },
  quantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3, marginBottom: 13 },
  quantityHint: { color: '#A0877D', fontSize: 10, marginTop: -4 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quantityButton: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F7E9E0', alignItems: 'center', justifyContent: 'center' },
  quantityButtonDisabled: { opacity: 0.42 },
  quantityButtonText: { color: '#8E493C', fontSize: 20, lineHeight: 22, fontWeight: '600' },
  quantityValue: { minWidth: 17, textAlign: 'center', color: '#513A34', fontSize: 14, fontWeight: '800' },
  totalBox: { backgroundColor: '#FFF7F1', borderWidth: 1, borderColor: '#F2DFD2', borderRadius: 13, padding: 12, marginTop: 1, marginBottom: 14 },
  paymentHint: { color: '#80675D', backgroundColor: '#FFF7F1', borderWidth: 1, borderColor: '#F2DFD2', borderRadius: 11, padding: 11, fontSize: 10, lineHeight: 16, marginTop: -3, marginBottom: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  totalLabel: { color: '#80675D', fontSize: 11, fontWeight: '600' },
  unitPrice: { color: '#65463D', fontSize: 12, fontWeight: '800' },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: '#EED8C9', marginTop: 9, paddingTop: 9 },
  grandTotalLabel: { flex: 1, color: '#55372F', fontSize: 12, fontWeight: '800' },
  grandTotalValue: { color: '#A74436', fontSize: 19, fontWeight: '900' },
  totalHint: { color: '#92756A', fontSize: 10, lineHeight: 15, marginTop: 7 },
  addItemButton: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: '#E6C3B5', backgroundColor: '#FFF8F4', marginBottom: 14 },
  addItemButtonText: { flex: 1, color: '#8C493C', fontSize: 12, fontWeight: '800' },
  addItemButtonPrice: { color: '#A74436', fontSize: 12, fontWeight: '900' },
  cartBox: { borderWidth: 1, borderColor: '#EFE5DC', backgroundColor: '#FFFEFC', borderRadius: 14, padding: 12, marginBottom: 14 },
  cartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0E7E0' },
  cartTitle: { color: '#55372F', fontSize: 13, fontWeight: '900' },
  cartCount: { color: '#9A8279', fontSize: 10, marginTop: 2 },
  cartHeaderTotal: { color: '#A74436', fontSize: 15, fontWeight: '900' },
  cartEmpty: { color: '#927B71', fontSize: 10, lineHeight: 15, paddingVertical: 12 },
  cartItems: { gap: 8, paddingTop: 9 },
  cartItem: { backgroundColor: '#FFF8F4', borderRadius: 10, padding: 9 },
  cartItemTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cartItemInfo: { flex: 1 },
  cartItemName: { color: '#55372F', fontSize: 11, fontWeight: '800' },
  cartItemDescription: { color: '#8F786F', fontSize: 10, marginTop: 3 },
  cartItemPrice: { color: '#71453C', fontSize: 11, fontWeight: '900' },
  cartItemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 },
  cartQuantityControl: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  cartQuantityButton: { width: 27, height: 27, borderRadius: 8, backgroundColor: '#F2E1D9', alignItems: 'center', justifyContent: 'center' },
  cartQuantityButtonText: { color: '#8E493C', fontSize: 18, lineHeight: 20, fontWeight: '700' },
  cartQuantityValue: { minWidth: 16, textAlign: 'center', color: '#513A34', fontSize: 12, fontWeight: '800' },
  removeCartItem: { paddingVertical: 5, paddingHorizontal: 7 },
  removeCartItemText: { color: '#A74436', fontSize: 10, fontWeight: '800' },
  cartTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0E7E0', marginTop: 10, paddingTop: 10 },
  cartTotalLabel: { color: '#55372F', fontSize: 12, fontWeight: '800' },
  cartTotalValue: { color: '#A74436', fontSize: 17, fontWeight: '900' },
  cartFeedback: { color: '#477B50', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: -6, marginBottom: 12 },
  errorText: { color: '#A3312D', backgroundColor: '#FFF1EE', padding: 10, borderRadius: 9, fontSize: 11, lineHeight: 16, marginBottom: 9 },
  submitButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#A74436', borderRadius: 13, marginTop: 1 },
  submitButtonDisabled: { opacity: 0.65 },
  submitButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  submitButtonArrow: { color: '#FFFFFF', fontSize: 18 },
  formFootnote: { color: '#A1897F', textAlign: 'center', fontSize: 9, lineHeight: 14, marginTop: 10 },
  successBox: { alignItems: 'center', paddingVertical: 15 },
  pixPaymentBox: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FFF7F1', borderWidth: 1, borderColor: '#F2DFD2', borderRadius: 15, padding: 12, marginBottom: 16 },
  pixPaymentBoxStack: { flexDirection: 'column' },
  pixPaymentDetails: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  pixPaymentDetailsStack: { width: '100%', flex: 0, alignItems: 'center' },
  pixPaymentTitle: { color: '#55372F', fontSize: 14, fontWeight: '900', marginBottom: 7 },
  pixPaymentText: { color: '#80675D', fontSize: 11, lineHeight: 17 },
  pixKeyLabel: { color: '#62463F', fontSize: 10, fontWeight: '800', marginTop: 9 },
  pixKey: { color: '#A74436', fontSize: 19, fontWeight: '900', letterSpacing: 0.5, paddingVertical: 5, paddingHorizontal: 8, backgroundColor: '#FFFFFF', borderRadius: 8, marginTop: 4 },
  pixPaymentHint: { color: '#80675D', fontSize: 10, lineHeight: 16, textAlign: 'left', marginTop: 7 },
  pixPaymentHintCentered: { textAlign: 'center' },
  deliveryPaymentBox: { width: '100%', alignItems: 'center', backgroundColor: '#F0F7F0', borderWidth: 1, borderColor: '#D8E8D6', borderRadius: 13, padding: 12, marginBottom: 16 },
  deliveryPaymentText: { color: '#3D7051', fontSize: 11, fontWeight: '800' },
  successIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: '#E8F4EA', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  successIconText: { color: '#3D7D51', fontSize: 25, fontWeight: '700' },
  successTitle: { color: '#49332D', fontSize: 21, fontWeight: '800' },
  successBody: { color: '#89756D', fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 8, marginBottom: 18 },
  successId: { color: '#71453C', fontWeight: '800' },
  successItems: { width: '100%', gap: 5, marginTop: -6, marginBottom: 15 },
  successItemLine: { color: '#80675D', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  whatsappButton: { width: '100%', minHeight: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#258E61', borderRadius: 13, paddingHorizontal: 10 },
  whatsappIcon: { color: '#FFFFFF', fontSize: 17 },
  whatsappButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  whatsappArrow: { color: '#FFFFFF', fontSize: 15 },
  newOrderButton: { marginTop: 13, padding: 8 },
  newOrderButtonText: { color: '#A45B4B', fontSize: 11, fontWeight: '700' },
  footer: { minHeight: 94, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  footerBrand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  footerLogo: { width: 39, height: 39, borderRadius: 13, backgroundColor: '#FFFFFF' },
  footerBrandName: { color: '#573B34', fontSize: 12, fontWeight: '800' },
  footerCaption: { color: '#9B8177', fontSize: 9, marginTop: 2 },
  footerText: { color: '#A28A7F', fontSize: 10, textAlign: 'right' },
});
