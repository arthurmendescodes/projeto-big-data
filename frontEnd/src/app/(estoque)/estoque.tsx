import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";

import { useState } from "react";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import ListaEstoque from "@/components/ListaEstoque";
import { DADOSESTOQUE } from "@/components/ListaEstoque";
import { useTheme } from "@/hooks/use-theme";

import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@expo/ui/community/datetime-picker";
import { Color } from "expo-router";

export default function Estoque() {
  const theme = useTheme();

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
            <ThemedText style={styles.titulo}>Estoque</ThemedText>
          </View>

          <ThemedText style={styles.subTitulo}>
            Cheque os itens do estoque.
          </ThemedText>
        </View>

        <View>
          <ThemedTextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
              },
            ]}
            placeholder="Procurar item..."
          />
        </View>
        {/* lista de ESTOQUE */}
        <View>
          {DADOSESTOQUE.map((item) => (
            <ListaEstoque key={item.id} item={item} />
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

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTexts: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 6,
    color: "#64748B",
  },

  titulo: {
    fontSize: 24,
    fontWeight: "700",
  },

  subTitulo: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
    // color: "#7B8AA4",
  },

  badge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 10,
  },

  badgeText: {
    color: "#2563EB",
    fontSize: 10,
  },

  card: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderWidth: 1,
    borderRadius: 18,
    gap: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  categoria: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4,
    marginBottom: 0,
  },

  pickerContainer: {
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: "center",
    overflow: "hidden",
  },

  picker: {
    height: 60,
    width: "100%",
  },
  pickerItem: {},

  dateButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
  },

  dateIcon: {
    fontSize: 19,
    color: "#64748B",
  },

  dateText: {
    fontSize: 12,
  },

  listBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },

  listRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  itemText: {
    fontSize: 11,
    flexShrink: 1,
  },

  rowDivider: {
    height: StyleSheet.hairlineWidth,
  },

  textEntrada: {
    color: "#059669",
    fontSize: 9,
  },

  input: {
    alignItems: "center",
    margin: 10,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    textAlignVertical: "top",
  },

  resumo: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },

  resumoTitulo: {
    color: "#1D4ED8",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 7,
  },

  resumoTexto: {
    color: "#4169A9",
    fontSize: 11,
    lineHeight: 16,
  },

  btnSalvar: {
    marginHorizontal: 20,
    marginTop: 16,
    height: 46,
    borderRadius: 13,
    backgroundColor: "#2860ED",
    alignItems: "center",
    justifyContent: "center",
  },

  rodape: {
    marginHorizontal: 28,
    marginTop: 10,
    textAlign: "center",
    color: "#8190A8",
    fontSize: 10,
    lineHeight: 15,
  },

  // TESTE FLATLIST

  itemContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderWidth: 1,
    borderRadius: 18,
    gap: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  textoContainer: {
    flex: 1,
  },
  tipoEvento: {
    fontSize: 18,
    fontWeight: "bold",
  },
  metaDados: {
    fontSize: 14,
  },
});
