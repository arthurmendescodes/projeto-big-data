import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";

import { useState, useEffect, useRef } from "react";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { useTheme } from "@/hooks/use-theme";

import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@expo/ui/community/datetime-picker";

import { apiFetch } from "../../services/api";

type TipoEvento = {
  id: number;
  name: string;
};

export default function AddEvento() {
  const theme = useTheme();

  const [tipoEvento, setTipoEvento] = useState("");
  const [nomeEvento, setNomeEvento] = useState("");
  const [date, setDate] = useState(new Date());
  const [horario, setHorario] = useState("");
  const [local, setLocal] = useState("");
  const [obs, setObs] = useState("");
  const [show, setShow] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const envioEmAndamento = useRef(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [tiposEventos, setTiposEventos] = useState<TipoEvento[]>([]);
  const [carregandoTipos, setCarregandoTipos] = useState(true);
  const [erroTipos, setErroTipos] = useState<string | null>(null);

  useEffect(() => {
    async function carregarTiposEventos() {
      try {
        setCarregandoTipos(true);
        setErroTipos(null);

        const resposta = await apiFetch("/event-types");

        if (!resposta.ok) {
          throw new Error("Não foi possível consultar os tipos de eventos.");
        }

        const dados = await resposta.json();

        setTiposEventos(dados);

      } catch (erro) {
        setErroTipos(
          erro instanceof Error
            ? erro.message
            : "Erro ao carregar tipos de eventos."
        );

      } finally {
        setCarregandoTipos(false);
      }
    }

    carregarTiposEventos();
  }, []);

  const showDatepicker = () => {
    setShow(true);
  };

  // Preserva a data local selecionada, sem conversão para UTC.
  function formatarData(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
  }

  async function agendarEvento() {
    if (envioEmAndamento.current) return;

    setErroSalvar(null);
    setSucesso(null);

    if (!nomeEvento.trim()) {
      setErroSalvar("Informe o nome do evento.");
      return;
    }

    const tipoId = Number(tipoEvento);

    if (
      !Number.isSafeInteger(tipoId) ||
      tipoId <= 0 ||
      !tiposEventos.some((tipo) => tipo.id === tipoId)
    ) {
      setErroSalvar("Selecione o tipo de evento.");
      return;
    }

    if (Number.isNaN(date.getTime())) {
      setErroSalvar("Selecione uma data válida.");
      return;
    }

    const endereco = local.trim();
    const hora = horario.trim();

    if (!endereco || endereco.length > 300) {
      setErroSalvar("Informe o endereço do evento (até 300 caracteres).");
      return;
    }

    if (!hora) {
      setErroSalvar("Informe o horário previsto de realização do evento.");
      return;
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
      setErroSalvar("Informe um horário válido no formato HH:MM.");
      return;
    }

    envioEmAndamento.current = true;
    setSalvando(true);
    setShow(false);

    try {
      const resposta = await apiFetch("/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: nomeEvento.trim(),
          event_type_id: tipoId,
          event_date: formatarData(date),
          event_time: hora,
          location: endereco,
          description: obs.trim() || null,
        }),
      });

      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);

        throw new Error(
          typeof dados?.error === "string"
            ? dados.error
            : "Não foi possível agendar o evento."
        );
      }

      setSucesso("Evento agendado com sucesso!");
      setNomeEvento("");
      setTipoEvento("");
      setObs("");
      setDate(new Date());
      setHorario("");
      setLocal("");
    } catch (erro) {
      setErroSalvar(
        erro instanceof Error
          ? erro.message
          : "Erro ao agendar evento."
      );
    } finally {
      envioEmAndamento.current = false;
      setSalvando(false);
    }
  }

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
            <ThemedText style={styles.titulo}>Agendar Evento</ThemedText>
          </View>

          <ThemedText style={styles.subTitulo}>
            Preencha os dados para agendar um evento no sistema.
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
              style={[
                styles.picker,
                {
                  backgroundColor: theme.background,
                  color: theme.text,
                },
              ]}
              selectedValue={tipoEvento}
              onValueChange={(value) => setTipoEvento(value)}
              enabled={!salvando && !carregandoTipos && !erroTipos}
            >
              <Picker.Item
                label={
                  carregandoTipos
                    ? "Carregando tipos..."
                    : "Selecione o tipo de evento"
                }
                value=""
              />

              {tiposEventos.map((tipo) => (
                <Picker.Item
                  key={tipo.id}
                  label={tipo.name}
                  value={String(tipo.id)}
                />
              ))}
            </Picker>
          </View>

          {erroTipos && (
            <ThemedText style={styles.erroMensagem}>{erroTipos}</ThemedText>
          )}

          {!carregandoTipos && !erroTipos && tiposEventos.length === 0 && (
            <ThemedText style={styles.erroMensagem}>
              Nenhum tipo de evento cadastrado.
            </ThemedText>
          )}

          <ThemedText style={styles.categoria}>
            Nome do evento
          </ThemedText>

          <ThemedTextInput
            style={[
              styles.input,
              {
                borderColor: theme.backgroundSelected,
                backgroundColor: theme.background,
              },
            ]}
            placeholder="Nome do evento..."
            value={nomeEvento}
            onChangeText={setNomeEvento}
            editable={!salvando}
          />

          <ThemedText style={styles.categoria}>Data prevista de realização</ThemedText>

          <TouchableOpacity
            style={[
              styles.dateButton,
              {
                borderColor: theme.backgroundSelected,
                backgroundColor: theme.background,
              },
            ]}
            onPress={showDatepicker}
            disabled={salvando}
          >
            <ThemedText style={styles.dateText}>
              {date.toLocaleDateString("pt-BR")}
            </ThemedText>
          </TouchableOpacity>

          {show && (
            <DateTimePicker
              value={date}
              mode="date"
              onValueChange={(selectedDate) => {
                const novaData = new Date(selectedDate.nativeEvent.timestamp);
                if (!Number.isNaN(novaData.getTime())) {
                  setDate(novaData);
                }
                setShow(false);
              }}
              onDismiss={() => setShow(false)}
            />
          )}

          <ThemedText style={styles.categoria}>Horário previsto de realização (obrigatório)</ThemedText>

          <ThemedTextInput
            style={[
              styles.input,
              {
                borderColor: theme.backgroundSelected,
                backgroundColor: theme.background,
              },
            ]}
            placeholder="HH:MM (ex.: 19:30)"
            value={horario}
            onChangeText={setHorario}
            maxLength={5}
            editable={!salvando}
          />

          <ThemedText style={styles.categoria}>Local do evento</ThemedText>

          <ThemedTextInput
            style={[
              styles.input,
              {
                borderColor: theme.backgroundSelected,
                backgroundColor: theme.background,
                minHeight: 76,
              },
            ]}
            placeholder="Rua ..., Bairro ..., Cidade ..., Número ..."
            value={local}
            onChangeText={setLocal}
            maxLength={300}
            editable={!salvando}
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
            editable={!salvando}
            multiline
          />
        </View>

        {/* Salvar */}
        <TouchableOpacity
          style={[
            styles.btnSalvar,
            {
              opacity:
                salvando || carregandoTipos || !!erroTipos || tiposEventos.length === 0
                  ? 0.5
                  : 1,
            },
          ]}
          onPress={agendarEvento}
          disabled={
            salvando || carregandoTipos || !!erroTipos || tiposEventos.length === 0
          }
        >
          <ThemedText style={styles.btnSalvarTexto}>
            {salvando ? "Agendando..." : "Agendar evento"}
          </ThemedText>
        </TouchableOpacity>

        {erroSalvar && (
          <ThemedText style={styles.erroMensagem}>{erroSalvar}</ThemedText>
        )}

        {sucesso && (
          <ThemedText style={styles.sucessoMensagem}>{sucesso}</ThemedText>
        )}

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
    fontSize: 24,
    fontWeight: "700",
  },

  subTitulo: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
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

  dateButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
  },

  dateText: {
    fontSize: 12,
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

  erroMensagem: {
    color: "#DC2626",
    textAlign: "center",
    marginHorizontal: 20,
    marginTop: 12,
    fontSize: 13,
  },

  sucessoMensagem: {
    color: "#059669",
    textAlign: "center",
    marginHorizontal: 20,
    marginTop: 12,
    fontSize: 13,
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
