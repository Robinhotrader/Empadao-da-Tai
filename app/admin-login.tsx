import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { loginAdmin, onAdminAuthChange } from '../src/services/firebase';
import logoEmpadaoTai from '../assets/logo-empadao-tai.png';

const AdminLoginScreen: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAdminAuthChange((user) => {
      if (user) router.replace('/admin');
    });
    return unsub;
  }, [router]);

  const handleLogin = async () => {
    if (!email || !senha) {
      Alert.alert('Atenção', 'Preencha email e senha');
      return;
    }

    setLoading(true);
    const res = await loginAdmin(email, senha);
    setLoading(false);

    if (res.success) {
      router.replace('/admin');
    } else {
      Alert.alert('Erro ao entrar', res.error ?? 'Verifique email e senha');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.card}>
        <Image source={logoEmpadaoTai} style={styles.logo} accessibilityLabel="Logo Empadão da Taí" />
        <Text style={styles.kicker}>ACESSO RESTRITO</Text>
        <Text style={styles.titulo}>Bem-vinda, Taí</Text>
        <Text style={styles.subtitulo}>Entre para acompanhar os pedidos do Empadão da Taí.</Text>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="Seu email de acesso"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <Input
          label="Senha"
          value={senha}
          onChangeText={setSenha}
          placeholder="Sua senha"
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        <Button
          title={loading ? 'Entrando...' : 'Entrar no painel'}
          onPress={handleLogin}
          color="#A74436"
          disabled={loading}
        />

        <Text style={styles.info}>Use o email e a senha cadastrados no Firebase.</Text>

        <Button
          title="Voltar para o site"
          onPress={() => router.replace('/')}
          color="#8C7065"
        />
      </View>
    </KeyboardAvoidingView>
  );
};

export default AdminLoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFAF4', justifyContent: 'center', paddingHorizontal: 20 },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 25,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0E6DC',
  },
  logo: { width: 76, height: 76, borderRadius: 23, alignSelf: 'center', marginBottom: 13 },
  kicker: { color: '#B4624F', textAlign: 'center', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  titulo: { fontSize: 25, fontWeight: '800', color: '#432C28', marginTop: 5, textAlign: 'center' },
  subtitulo: { fontSize: 12, lineHeight: 19, color: '#8E776D', marginTop: 5, marginBottom: 20, textAlign: 'center' },
  info: { fontSize: 10, color: '#9B8479', marginTop: 9, marginBottom: 7, textAlign: 'center' },
});
