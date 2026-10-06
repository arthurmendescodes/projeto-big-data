// essa vai ser a tela de configurações como mudar tema.

import {
  Platform,
  StyleSheet,
  Button,
  Pressable,
  TouchableOpacity,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function Configuracoes() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText>TELA DE CONFIGURACOES</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
