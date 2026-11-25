//imports padrões
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";

import { API_URL } from "@/services/api";

//----------------------------------------------------------------------------

//import de imagens
//----------------------------------------------------------------------------

// imports de componentes customizados
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedTextInput } from "@/components/ThemedTextInput";
//----------------------------------------------------------------------------

// imports do backend
import { useAuth } from "@/components/AuthContext";
//----------------------------------------------------------------------------


// Essa tela index.jsx é a primeira que aparece e é a tela de login
const index = () => {
  // usa o expo-router pra pra navegação entre telas
  const router = useRouter();

  // acesso a função login do AuthProvider
  const { login } = useAuth();

  // variáveis dos inputs (nome e senha).
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const Login = async () => {
  // Verifica se os campos foram preenchidos
    if (!email.trim() || !senha) {
      window.alert("Preencha o email e a senha.");
      return;
    }

    setIsLoading(true);

    try {
      // Envia as credenciais para o backend
      const resposta = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          senha: senha,
        }),
      });

      // Recebe a resposta do servidor
      const dados = await resposta.json();

      // Verifica se houve erro na autenticação
      if (!resposta.ok) {
        throw new Error(dados.error || "Erro ao realizar login.");
      }

      // Armazena os tokens e atualiza o contexto de autenticação
      await login(dados.access_token, dados.refresh_token);

    } catch (erro) {
      const mensagem =
        erro instanceof Error ? erro.message : "Erro desconhecido.";

      window.alert(mensagem);

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      {/* <SafeAreaView style={styles.container}> */}
      <ThemedView style={styles.container}>
        <View style={styles.areaBanner}>
          {/* <Image style={styles.banner} source={banner} /> */}
        </View>

        <ThemedText style={styles.titulo}>Login</ThemedText>
        <ThemedText style={styles.subTitulo}>
          Insira seus dados de login para entrar
        </ThemedText>
        {/* area dos inputs de Nome e Senha */}
        <ThemedTextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <ThemedTextInput
          style={styles.input}
          placeholder="Senha"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry={true}
          autoCapitalize="none"
        />
        {/* botão de login que chama a função logar */}
        <ThemedView>
          <TouchableOpacity
            style={styles.botaoLogin}
            onPress={Login}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.botaoTexto}>
                Entrar
              </ThemedText>
            )}
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
      {/* </SafeAreaView> */}
    </TouchableWithoutFeedback>
  );
};

export default index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: "center",
    // ...({ overflowX: "hidden" } as any),
  },

  areaBanner: {
    alignItems: "center",
    marginTop: 130,
    marginBottom: 60,
  },
  banner: {
    width: 300,
    height: 120,
  },

  titulo: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: "Poppins",
  },

  subTitulo: {
    textAlign: "center",
    // fontsize: 50,
    // paddingBottom: 5,
    padding: 5,
  },

  input: {
    fontSize: 18,
    height: 50,
    width: 380,
    alignSelf: "center",
    margin: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    borderColor: "rgba(128,128,128, 0.7)",
  },

  botaoLogin: {
    backgroundColor: "#0063bf",
    alignSelf: "center",
    width: 380,
    height: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoTexto: {
    fontSize: 18,
  },

  areaBotaoLogin: {
    paddingTop: 10,
  },
});
