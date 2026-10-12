import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
} from "react-native";

import { useState } from "react";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { useTheme } from "@/hooks/use-theme";

import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@expo/ui/community/datetime-picker";
import { Color } from "expo-router";

export default function AddEvento() {
  const theme = useTheme();

  const [tipoEvento, setTipoEvento] = useState("");
  const [local, setLocal] = useState("");
  const [date, setDate] = useState(new Date());
  const [obs, setObs] = useState("");
  const [mode, setMode] = useState<"date" | "time">("date");
  const [show, setShow] = useState(false);

  const showDatepicker = () => {
    setMode("date");
    setShow(true);
  };

  const showTimepicker = () => {
    setMode("time");
    setShow(true);
  };

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* header */}
        <View
          style={[styles.header, { backgroundColor: theme.backgroundElement }]}
        >
          <View style={styles.headerTexts}>
            <ThemedText style={styles.titulo}>Registrar Evento</ThemedText>
          </View>

          <ThemedText style={styles.subTitulo}>
            Preencha os dados do evento para registrar no sistema.
          </ThemedText>
        </View>

        {/* form */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
            },
          ]}
        >
          <ThemedText style={styles.categoria}>Tipo de evento</ThemedText>

          <View
            style={[
              styles.pickerContainer,
              { borderColor: theme.backgroundSelected },
            ]}
          >
            <Picker
              style={[styles.picker, { backgroundColor: theme.background }]}
              selectedValue={tipoEvento}
              onValueChange={(value) => setTipoEvento(value)}
            >
              <Picker.Item
                style={{ backgroundColor: theme.background, color: theme.text }}
                label="Missa"
                value="missa"
              />
              <Picker.Item label="Procissão" value="procissao" />
              <Picker.Item label="Festa" value="festa" />
              <Picker.Item label="Leilão" value="leilao" />
              <Picker.Item label="Bingo" value="bingo" />
              <Picker.Item label="Outro" value="outro" />
            </Picker>
          </View>

          <ThemedText style={styles.categoria}>Local</ThemedText>
          <ThemedTextInput
            style={[
              styles.input,
              {
                borderColor: theme.backgroundSelected,
                backgroundColor: theme.background,
              },
            ]}
            placeholder="Local..."
            value={local}
          ></ThemedTextInput>

          <ThemedText style={styles.categoria}>Data</ThemedText>

          <TouchableOpacity
            style={[
              styles.dateButton,
              {
                borderColor: theme.backgroundSelected,
                backgroundColor: theme.background,
              },
            ]}
            onPress={showDatepicker}
          >
            {/* <ThemedText style={styles.dateIcon}>▦</ThemedText> */}
            <ThemedText style={styles.dateText}>
              {date.toLocaleDateString("pt-BR")}
            </ThemedText>
          </TouchableOpacity>

          <ThemedText style={styles.categoria}>Horário</ThemedText>

          <TouchableOpacity
            style={[
              styles.dateButton,
              {
                borderColor: theme.backgroundSelected,
                backgroundColor: theme.background,
              },
            ]}
            onPress={showTimepicker}
          >
            <ThemedText style={styles.dateText}>
              {date.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </ThemedText>
          </TouchableOpacity>

          {show && (
            <DateTimePicker
              value={date}
              mode={mode}
              onValueChange={(selectedDate) => {
                setDate(new Date(selectedDate.nativeEvent.timestamp));
                setShow(false);
              }}
              onDismiss={() => setShow(false)}
            />
          )}

          {/* Baixas */}
          <ThemedText style={styles.categoria}>Baixas</ThemedText>
          <ThemedTextInput
            style={[
              styles.input,
              {
                borderColor: theme.backgroundSelected,
                backgroundColor: theme.background,
              },
            ]}
            placeholder="Baixas..."
            value={obs}
            onChangeText={setObs}
            multiline
          />

          {/* Entradas */}
          <ThemedText style={styles.categoria}>Entradas</ThemedText>
          <ThemedTextInput
            style={[
              styles.input,
              {
                borderColor: theme.backgroundSelected,
                backgroundColor: theme.background,
              },
            ]}
            placeholder="Entradas..."
            value={obs}
            onChangeText={setObs}
            multiline
          />

          {/* Observações */}
          <ThemedText style={styles.categoria}>Observações</ThemedText>

          <ThemedTextInput
            style={[
              styles.input,
              {
                borderColor: theme.backgroundSelected,
                backgroundColor: theme.background,
              },
            ]}
            placeholder="Observações..."
            value={obs}
            onChangeText={setObs}
            multiline
          />
        </View>

        {/* Salvar */}
        <TouchableOpacity
          style={styles.btnSalvar}
          onPress={() => {
            // fução pra salvar o evento
          }}
        >
          <ThemedText style={styles.btnSalvarTexto}>Salvar evento</ThemedText>
        </TouchableOpacity>

        <ThemedText style={styles.footer}>
          Revise os dados antes de salvar para manter o controle da igreja
          atualizado.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    // paddingBottom: "10%",
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

  badgeSaida: {
    backgroundColor: "#FEF2F2",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  textSaida: {
    color: "#DC2626",
    fontSize: 9,
  },

  badgeEntrada: {
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  textEntrada: {
    color: "#059669",
    fontSize: 9,
  },

  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
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
    backgroundColor: "#6A95C7",
    alignItems: "center",
    justifyContent: "center",
  },

  btnSalvarTexto: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },

  footer: {
    marginHorizontal: 28,
    marginTop: 10,
    textAlign: "center",
    color: "#8190A8",
    fontSize: 10,
    lineHeight: 15,
  },
});
