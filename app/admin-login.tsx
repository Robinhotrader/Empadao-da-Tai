import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { loginAdmin, onAdminAuthChange } from '../src/services/firebase';

const AdminLoginScreen: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('admin@empadastai.com'); // ajuste para o email que você criou no Firebase
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Se já estiver logado, manda direto para o painel
    const unsub = onAdminAuthChange((user) => {
      if (user) {
        router.replace('/admin');
      }
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
        <Text style={styles.titulo}>Área administrativa</Text>
        <Text style={styles.subtitulo}>Empadas Taí</Text>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="admin@empadastai.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Senha"
          value={senha}
          onChangeText={setSenha}
          placeholder="Senha do administrador"
          secureTextEntry
        />

        <Button
          title={loading ? 'Entrando...' : 'Entrar'}
          onPress={handleLogin}
          color="#D97706"
          disabled={loading}
        />

        <Text style={styles.info}>
          Apenas a dona do negócio deve acessar esta área.
        </Text>

        <Button
          title="Voltar para pedidos"
          onPress={() => router.replace('/')}
          color="#6B7280"
        />
      </View>
    </KeyboardAvoidingView>
  );
};

export default AdminLoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  info: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 8,
  },
});