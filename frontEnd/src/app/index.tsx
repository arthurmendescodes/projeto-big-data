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

//----------------------------------------------------------------------------

//import de imagens
//----------------------------------------------------------------------------

// imports de componentes customizados
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedTextInput } from "@/components/ThemedTextInput";
//----------------------------------------------------------------------------

// Essa tela index.jsx é a primeira que aparece e é a tela de login
const index = () => {
  // usa o expo-router pra pra navegação entre telas
  const router = useRouter();

  // variáveis dos inputs (nome e senha).
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const Login = async () => {
    router.push("/home");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <ThemedView>
          {/* banner da ControlUP no meio */}
          <View style={styles.areaBanner}>
            {/* <Image style={styles.banner} source={banner} /> */}
          </View>

          <View>
            <ThemedText style={styles.titulo}>Login</ThemedText>
            <ThemedTextInput style={styles.subTitulo}>
              Insira seus dados de login para entrar
            </ThemedTextInput>
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
            <View style={{ paddingTop: 10 }}>
              <TouchableOpacity style={styles.botaoLogin} onPress={Login}>
                <TouchableOpacity>
                  <ThemedText style={styles.botaoTexto}>Entrar</ThemedText>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          </View>
        </ThemedView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: "center",
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
    paddingBottom: 5,
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
