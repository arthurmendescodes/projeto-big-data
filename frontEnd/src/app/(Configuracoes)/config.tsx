import {
  Platform,
  StyleSheet,
  Button,
  Pressable,
  TouchableOpacity,
  Switch,
  ScrollView,
  View,
} from "react-native";
import {
  Package,
  CalendarDays,
  Wallet,
  LayoutDashboard,
  Settings,
  ChevronRight,
  Calendars,
  CalendarPlus,
} from "lucide-react-native";

import { useTheme } from "@/hooks/use-theme";

import { useAppTheme } from "@/components/ThemeContext";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function Configuracoes() {
  const { themeMode, changeTheme } = useAppTheme();

  const theme = useTheme();
  // <ThemedView style={styles.container}>
  //   <ThemedText style={styles.botaoTexto}>Mudar tema</ThemedText>
  //   <Switch
  //     value={themeMode === "light" ? true : false}
  //     onValueChange={() =>
  //       changeTheme(themeMode === "light" ? "dark" : "light")
  //     }
  //   ></Switch>
  //   <ThemedText>
  //     {themeMode === "light" ? "Modo Claro " : "Modo Escuro"}
  //   </ThemedText>
  // </ThemedView>

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View
          style={[styles.header, { backgroundColor: theme.backgroundElement }]}
        >
          <View style={styles.headerTexts}>
            <ThemedText style={styles.titulo}>Configurações</ThemedText>
          </View>

          <ThemedText style={styles.subtitulo}>Personalize seu App!</ThemedText>
        </View>

        <View style={styles.lista}>
          <ThemedView
            style={[
              styles.botao,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
              },
            ]}
          >
            <View
              style={[
                styles.areaIcone,
                { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <Switch
                value={themeMode === "light" ? true : false}
                onValueChange={() =>
                  changeTheme(themeMode === "light" ? "dark" : "light")
                }
              ></Switch>
            </View>

            <View style={styles.textos}>
              <ThemedText style={styles.opcao}>Mudar Tema</ThemedText>

              <ThemedText style={styles.descricao}>
                {themeMode === "light" ? "Modo Claro " : "Modo Escuro"}
              </ThemedText>
            </View>
          </ThemedView>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#D8DEE8",
  },

  headerTexts: {
    flex: 1,
    padding: 2,
  },

  titulo: {
    fontSize: 26,
    fontWeight: "bold",
  },
  subtitulo: {
    fontSize: 15,
  },
  lista: {
    padding: 20,
    gap: 14,
  },

  botao: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderRadius: 16,
    gap: 14,
  },
  areaIcone: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textos: {
    flex: 1,
    gap: 4,
  },
  opcao: {
    fontSize: 16,
    fontWeight: "600",
  },
  descricao: {
    fontSize: 13,
  },
});
