import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";

import { JSX, useState } from "react";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { useTheme } from "@/hooks/use-theme";

import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@expo/ui/community/datetime-picker";
import { Color } from "expo-router";

export const DADOSESTOQUE = [
  {
    id: 1,
    nome: "Vinho",
    quantidade: 10,
  },
  {
    id: 2,
    nome: "Hóstia",
    quantidade: 500,
  },
  {
    id: 3,
    nome: "Vela",
    quantidade: 20,
  },
];

export default function ListaEstoque({
  item,
}: {
  item: (typeof DADOSESTOQUE)[number];
}): JSX.Element {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.itemContainer,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
    >
      <View style={styles.textoContainer}>
        <ThemedText style={styles.tipoEvento}>{item.nome}</ThemedText>
        <ThemedText style={styles.metaDados}>
          ID: {item.id} · Quantidade: {item.quantidade}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  itemContainer: {
    // backgroundColor: "red",
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
