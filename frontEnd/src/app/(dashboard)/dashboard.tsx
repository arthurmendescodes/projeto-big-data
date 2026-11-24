import { StyleSheet, TouchableOpacity, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

import ConfirmaVoltar from "@/components/ConfirmaVoltar";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

export default function Dashboard() {
  const theme = useTheme();
  const router = useRouter();
  return (
    <ThemedView style={styles.container}>
      <View
        style={[styles.header, { backgroundColor: theme.backgroundElement }]}
      >
        <View style={styles.headerTitleRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={8}
          >
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.headerTexts}>
            <ThemedText style={styles.titulo}>Dashboard</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.subtitulo}>
          Confira gráficos e informações do seu negócio.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: "10%",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#D8DEE8",
  },
  titulo: {
    fontSize: 24,
    fontWeight: "700",
  },
  headerTexts: {
    flex: 1,
  },
  subtitulo: {
    fontSize: 14,
  },

  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
