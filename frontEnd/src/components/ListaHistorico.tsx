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

export const DADOSTESTE = [
  {
    id: "1",
    tipoEvento: "Missa",
    local: " Igreja Matriz",
    data: "12/10/2026",
    hora: "20:00",
  },
  {
    id: "2",
    tipoEvento: "Leilão",
    local: " Igreja Matriz",
    data: "9/10/2026",
    hora: "15:00",
  },
  {
    id: "3",
    tipoEvento: "Missa",
    local: " Igrejinha",
    data: "10/10/2026",
    hora: "17:00",
  },
  {
    id: "4",
    tipoEvento: "Missa",
    local: " Igreja Matriz",
    data: "15/10/2026",
    hora: "20:00",
  },
];

export default function ListaHistorico({
  item,
}: {
  item: (typeof DADOSTESTE)[number];
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
        <ThemedText style={styles.tipoEvento}>{item.tipoEvento}</ThemedText>
        <ThemedText style={styles.metaDados}>
          {item.local} · {item.data} · {item.hora}
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
