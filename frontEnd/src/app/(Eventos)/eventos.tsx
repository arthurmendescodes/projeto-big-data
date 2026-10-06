import {
  Platform,
  StyleSheet,
  Button,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function estoque() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText>TELA DE EVENTOS</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
