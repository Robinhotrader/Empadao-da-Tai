import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import {
  criarPedidoEmpada,
  tamanhos,
  combos,
  sabores,
  TamanhoEmpada,
  ComboEmpada,
  SaborEmpada,
  loginAdmin,
} from '../src/services/firebase';
import logoEmpadaoTai from '../assets/logo-empadao-tai.png';
import { Linking, Platform,  } from 'react-native';


export default function HomeScreen() {
  const router = useRouter();
  
  

  // Estados do pedido do cliente
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [sabor, setSabor] = useState<SaborEmpada>(sabores[0]);
  const [tamanho, setTamanho] = useState<TamanhoEmpada>(tamanhos[0]);
  const [combo, setCombo] = useState<ComboEmpada>(combos[0]);
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados do login admin
  const [adminEmail, setAdminEmail] = useState('');
  const [adminSenha, setAdminSenha] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Mensagem de sucesso visível na tela
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const enviarPedidoWhatsApp = () => {
  const numero = '5547999068147'; // número da Taí
  const mensagem = encodeURIComponent(
    `Olá Taí! Pedido confirmado:\n
    Nome: ${nome}\n
    Telefone: ${telefone}\n
    Sabor: ${sabor}\n
    Tamanho: ${tamanho}\n
    Combo: ${combo}\n
    Observação: ${observacao || 'Nenhuma'}`
  );
  const url = `https://wa.me/${numero}?text=${mensagem}`;

  if (Platform.OS === 'web') {
    // Abre WhatsApp Web no navegador
    window.open(url, '_blank');
  } else {
    // Abre o app WhatsApp no celular
    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    });
  }
};



  const handleEnviar = async () => {
    if (!nome || !telefone) {
      Alert.alert('Atenção', 'Preencha nome e telefone');
      return;
    }

    setLoading(true);
    const res = await criarPedidoEmpada({
      nome,
      telefone,
      sabor,
      tamanho,
      combo,
      observacao,
    });
    console.log('Resposta criarPedidoEmpada:', res);
    setLoading(false);

    if (res.success) {
      // Alert para app nativo
      Alert.alert(
        'Pedido confirmado',
        'Seu pedido foi confirmado com sucesso. Obrigado por escolher o Empadão da Taí!'
      );
      setMensagemSucesso('Seu pedido foi confirmado com sucesso. Obrigado!');

      // mensagem visível na tela (web e mobile)
      setMensagemSucesso('Seu pedido foi confirmado com sucesso. Obrigado!');

      // limpa todos os campos do formulário
      setNome('');
      setTelefone('');
      setObservacao('');
      setSabor(sabores[0]);
      setTamanho(tamanhos[0]);
      setCombo(combos[0]);
    } else {
      Alert.alert('Erro', res.error ?? 'Não foi possível registrar o pedido');
    }
  };

  const handleAdminLogin = async () => {
    if (!adminEmail || !adminSenha) {
      Alert.alert('Atenção', 'Preencha usuário e senha do administrador');
      return;
    }

    setAdminLoading(true);
    const res = await loginAdmin(adminEmail, adminSenha);
    setAdminLoading(false);

    if (res.success) {
      router.replace('/admin');
    } else {
      Alert.alert('Erro ao entrar', res.error ?? 'Verifique usuário e senha');
    }
  };

  return (
    <View style={styles.screen}>
      {/* “degradê” simples: topo colorido, fundo claro */}
      <View style={styles.topBackground} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Image source={logoEmpadaoTai} style={styles.logo} />
          <View>
            <Text style={styles.titulo}>Empadão da Tai</Text>
            <Text style={styles.subtitulo}>Sabor caseiro, feito com carinho</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monte seu pedido</Text>
          <Text style={styles.cardSubtitle}>
            Preencha os dados para reservar seu empadão
          </Text>

          <Input
            label="Nome"
            value={nome}
            onChangeText={setNome}
            placeholder="Seu nome completo"
          />

          <Input
            label="Telefone"
            value={telefone}
            onChangeText={setTelefone}
            placeholder="(xx) 9 9999-9999"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Sabor</Text>
          <View style={styles.column}>
            {sabores.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, sabor === s && styles.chipSelected]}
                onPress={() => setSabor(s)}
              >
                <Text
                  style={[
                    styles.chipText,
                    sabor === s && styles.chipTextSelected,
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Tamanho</Text>
          <View style={styles.column}>
            {tamanhos.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, tamanho === t && styles.chipSelected]}
                onPress={() => setTamanho(t)}
              >
                <Text
                  style={[
                    styles.chipText,
                    tamanho === t && styles.chipTextSelected,
                  ]}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Combo</Text>
          <View style={styles.column}>
            {combos.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, combo === c && styles.chipSelected]}
                onPress={() => setCombo(c)}
              >
                  <Text
                    style={[
                      styles.chipText,
                      combo === c && styles.chipTextSelected,
                    ]}
                  >
                    {c}
                  </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Observações (opcional)"
            value={observacao}
            onChangeText={setObservacao}
            placeholder="Ex: sem cebola, entregar às 19h..."
          />

          <Button
            title={loading ? 'Enviando...' : 'Enviar pedido'}
            onPress={handleEnviar}
            color="#F97373" // rosa suave
            disabled={loading}
          />

          {mensagemSucesso ? (
            <Text style={styles.sucesso}>{mensagemSucesso}</Text>
          ) : null}

          <Text style={styles.info}>
            Seu pedido será enviado para a área administrativa para organização
            da produção e entrega.
          </Text>
        </View>

        {/* Área de login administrativa (compacta e suave) */}
        <View style={styles.adminCard}>
          <Text style={styles.adminTitle}>Área administrativa</Text>
          <Text style={styles.adminSubtitle}>
            Acesso restrito ao Empadão da Taí
          </Text>

          <Input
            label="Usuário"
            value={adminEmail}
            onChangeText={setAdminEmail}
            placeholder="Usuário do administrador"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Senha"
            value={adminSenha}
            onChangeText={setAdminSenha}
            placeholder="Senha do administrador"
            secureTextEntry
          />

          <Button
            title={adminLoading ? 'Entrando...' : 'Entrar na área restrita'}
            onPress={handleAdminLogin}
            color="#A5B4FC" // lilás suave
            disabled={adminLoading}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FEFCE8', // amarelo bem clarinho
  },
  topBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: '#F9A8D4', // rosa pastel
  },
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  titulo: { fontSize: 24, color: '#1F2933', fontWeight: '700' },
  subtitulo: { fontSize: 13, color: '#4B5563', marginTop: 4 },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2933',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
    marginTop: 16,
  },
  row: { flexDirection: 'row', marginBottom: 4 },
  column: {
    flexDirection: 'column',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    backgroundColor: '#F9FAFB',
  },
  chipSelected: {
    backgroundColor: '#FDE68A', // amarelo pastel
    borderColor: '#F59E0B',
  },
  chipText: { fontSize: 13, color: '#4B5563' },
  chipTextSelected: { color: '#92400E', fontWeight: '600' },
  sucesso: {
    marginTop: 10,
    fontSize: 13,
    color: '#15803D',
    fontWeight: '600',
  },
  info: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 12,
  },
  adminCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F3F4FF', // lilás bem claro
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  adminTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3730A3',
    marginBottom: 2,
  },
  adminSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
});