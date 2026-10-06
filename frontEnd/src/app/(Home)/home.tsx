import {
  Platform,
  StyleSheet,
  Button,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { router } from "expo-router";

export default function Home() {
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.areaBotoes}>
        <TouchableOpacity
          style={styles.botaoLogin}
          onPress={() => router.push("/estoque")}
        >
          <ThemedText style={styles.botaoTexto}>TELA DO ESTOQUE</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.botaoLogin}
          onPress={() => router.push("/eventos")}
        >
          <ThemedText style={styles.botaoTexto}>TELA DE EVENTOS</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.botaoLogin}
          onPress={() => router.push("/financeiro")}
        >
          <ThemedText style={styles.botaoTexto}>TELA DO FINANCEIRO</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.botaoLogin}
          onPress={() => router.push("/config")}
        >
          <ThemedText style={styles.botaoTexto}>TELA DO DASHBOARD</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.botaoLogin}
          onPress={() => router.push("/dashboard")}
        >
          <ThemedText style={styles.botaoTexto}>
            TELA DE CONFIGURAÇÕES
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: "space-evenly",
  },
  areaBotoes: {
    flex: 1,
    gap: 10,
  },

  botaoLogin: {
    backgroundColor: "#0063bf",
    alignSelf: "center",
    width: "80%",
    height: 100,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoTexto: {
    fontSize: 18,
  },
});
