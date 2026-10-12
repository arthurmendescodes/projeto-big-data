import { StyleSheet, TouchableOpacity, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import {
  Package,
  CalendarDays,
  Wallet,
  LayoutDashboard,
  Settings,
  ChevronRight,
} from "lucide-react-native";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

export default function MenuPrincipal() {
  const router = useRouter();
  const theme = useTheme();

  const opcoes = [
    {
      titulo: "Estoque",
      descricao: "Consulte os itens disponíveis",
      Icone: Package,
      rota: "/estoque",
    },
    {
      titulo: "Eventos",
      descricao: "Gerencie eventos",
      Icone: CalendarDays,
      rota: "/eventos",
    },
    {
      titulo: "Financeiro",
      descricao: "Acompanhe receitas e despesas",
      Icone: Wallet,
      rota: "/financeiro",
    },
    {
      titulo: "Dashboard",
      descricao: "Visualize os indicadores",
      Icone: LayoutDashboard,
      rota: "/dashboard",
    },
    {
      titulo: "Configurações",
      descricao: "Personalize o aplicativo",
      Icone: Settings,
      rota: "/config",
    },
  ] as const;

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
            <ThemedText style={styles.titulo}>Menu Principal</ThemedText>
          </View>

          <ThemedText style={styles.subtitulo}>
            O que você deseja acessar?
          </ThemedText>
        </View>

        <View style={styles.lista}>
          {opcoes.map(({ titulo, descricao, Icone, rota }) => (
            <TouchableOpacity
              key={titulo}
              style={[
                styles.botao,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
              onPress={() => router.push(rota)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.areaIcone,
                  { backgroundColor: theme.backgroundSelected },
                ]}
              >
                <Icone size={24} color={theme.text} />
              </View>

              <View style={styles.textos}>
                <ThemedText style={styles.nome}>{titulo}</ThemedText>

                <ThemedText style={styles.descricao}>{descricao}</ThemedText>
              </View>

              <ChevronRight size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          ))}
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
  nome: {
    fontSize: 16,
    fontWeight: "600",
  },
  descricao: {
    fontSize: 13,
  },
});
