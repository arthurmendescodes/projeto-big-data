import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { CalendarDays, Clock, MapPin, RefreshCw } from "lucide-react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/hooks/use-theme";
import { apiFetch } from "../../services/api";

type Evento = {
  id: number;
  name: string;
  event_type_id: number | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  description: string | null;
  status: "agendado" | "realizado" | "cancelado";
  event_types: { name: string } | null;
};

// Uma data SQL (DATE) não precisa ser convertida para UTC.
function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-");
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : data;
}

function formatarHorario(horario: string | null) {
  return horario ? horario.slice(0, 5) : "Não informado";
}

async function mensagemErro(resposta: Response, padrao: string) {
  const dados = await resposta.json().catch(() => null);
  return typeof dados?.error === "string" ? dados.error : padrao;
}

export default function EventosAgendados() {
  const theme = useTheme();
  const router = useRouter();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroConsulta, setErroConsulta] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null);
  const [cancelandoId, setCancelandoId] = useState<number | null>(null);
  const cancelamentoEmAndamento = useRef(false);
  const consultaAtual = useRef(0);

  const carregarEventos = useCallback(async () => {
    const consulta = ++consultaAtual.current;
    setCarregando(true);
    setErroConsulta(null);

    try {
      const resposta = await apiFetch("/events");
      if (!resposta.ok) {
        throw new Error(await mensagemErro(resposta, "Não foi possível consultar os eventos."));
      }
      const dados: Evento[] = await resposta.json();
      if (!Array.isArray(dados)) {
        throw new Error("Resposta de eventos inválida.");
      }

      // Ignora respostas antigas, caso uma consulta mais nova tenha começado.
      if (consulta !== consultaAtual.current) return;
      setEventos(
        dados.filter((evento) => evento.status === "agendado").sort((a, b) =>
          a.event_date.localeCompare(b.event_date) ||
          (a.event_time || "99:99").localeCompare(b.event_time || "99:99") ||
          a.id - b.id
        )
      );
    } catch (erro) {
      if (consulta !== consultaAtual.current) return;
      setErroConsulta(erro instanceof Error ? erro.message : "Erro ao consultar eventos.");
    } finally {
      if (consulta === consultaAtual.current) setCarregando(false);
    }
  }, []);

  // Atualiza ao entrar na tela e ao retornar de outra tela.
  useFocusEffect(
    useCallback(() => {
      void carregarEventos();
      return () => { consultaAtual.current += 1; };
    }, [carregarEventos])
  );

  async function cancelarEvento(id: number) {
    if (cancelamentoEmAndamento.current) return;
    cancelamentoEmAndamento.current = true;
    setCancelandoId(id);
    setErroAcao(null);
    setSucesso(null);

    try {
      const resposta = await apiFetch(`/events/${id}/cancel`, { method: "PATCH" });
      if (!resposta.ok) {
        const mensagem = await mensagemErro(resposta, "Não foi possível cancelar o evento.");
        if (resposta.status === 409 || resposta.status === 404) {
          setConfirmandoId(null);
          await carregarEventos();
        }
        throw new Error(mensagem);
      }
      setConfirmandoId(null);
      setEventos((anteriores) => anteriores.filter((evento) => evento.id !== id));
      setSucesso("Evento cancelado com sucesso!");
      await carregarEventos();
    } catch (erro) {
      setErroAcao(erro instanceof Error ? erro.message : "Erro ao cancelar evento.");
    } finally {
      setCancelandoId(null);
      cancelamentoEmAndamento.current = false;
    }
  }

  const ocupado = cancelandoId !== null;
  const cardTema = {
    backgroundColor: theme.backgroundElement,
    borderColor: theme.backgroundSelected,
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.headerRow}>
            <ThemedText style={styles.titulo}>Eventos Agendados</ThemedText>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Atualizar eventos"
              style={[styles.refresh, { backgroundColor: theme.backgroundSelected, opacity: ocupado || carregando ? 0.5 : 1 }]}
              onPress={() => { setConfirmandoId(null); void carregarEventos(); }}
              disabled={ocupado || carregando}
            >
              <RefreshCw size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ThemedText style={styles.subtitulo}>Consulte e gerencie os eventos da igreja.</ThemedText>
        </View>

        <View style={styles.lista}>
          {sucesso && <ThemedText style={styles.sucesso}>{sucesso}</ThemedText>}
          {erroAcao && <ThemedText style={styles.erro}>{erroAcao}</ThemedText>}
          {carregando ? (
            <View style={styles.estado}>
              <ActivityIndicator size="large" color={theme.text} />
              <ThemedText>Carregando eventos...</ThemedText>
            </View>
          ) : erroConsulta ? (
            <View style={[styles.card, cardTema]}>
              <ThemedText style={styles.erro}>{erroConsulta}</ThemedText>
              <TouchableOpacity style={styles.btnPrincipal} onPress={() => void carregarEventos()} disabled={ocupado}>
                <ThemedText style={styles.btnTexto}>Tentar novamente</ThemedText>
              </TouchableOpacity>
            </View>
          ) : eventos.length === 0 ? (
            <View style={[styles.card, cardTema, styles.estado]}>
              <CalendarDays size={32} color={theme.textSecondary} />
              <ThemedText>Nenhum evento agendado.</ThemedText>
              <ThemedText style={styles.descricao}>Os novos agendamentos aparecerão aqui.</ThemedText>
            </View>
          ) : (
            <>
              <ThemedText style={styles.descricao}>{eventos.length} {eventos.length === 1 ? "evento agendado" : "eventos agendados"}</ThemedText>
              {eventos.map((evento) => (
                <View key={evento.id} style={[styles.card, cardTema]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerTexts}>
                      <ThemedText style={styles.nome}>{evento.name}</ThemedText>
                      <ThemedText style={[styles.descricao, { color: theme.textSecondary }]}>
                        {evento.event_types?.name || "Tipo não informado"}
                      </ThemedText>
                    </View>
                    <View style={[styles.status, { backgroundColor: theme.backgroundSelected }]}>
                      <ThemedText style={styles.statusTexto}>Agendado</ThemedText>
                    </View>
                  </View>

                  <View style={styles.info}>
                    <CalendarDays size={17} color={theme.textSecondary} />
                    <ThemedText style={styles.infoTexto}>{formatarData(evento.event_date)}</ThemedText>
                  </View>
                  <View style={styles.info}>
                    <Clock size={17} color={theme.textSecondary} />
                    <ThemedText style={styles.infoTexto}>{formatarHorario(evento.event_time)}</ThemedText>
                  </View>
                  <View style={styles.info}>
                    <MapPin size={17} color={theme.textSecondary} />
                    <ThemedText style={styles.infoTexto}>{evento.location?.trim() || "Endereço não informado"}</ThemedText>
                  </View>
                  {!!evento.description?.trim() && (
                    <ThemedText style={[styles.descricao, { color: theme.textSecondary }]}>{evento.description}</ThemedText>
                  )}

                  {confirmandoId === evento.id ? (
                    <View style={[styles.confirmacao, { borderColor: theme.backgroundSelected }]}>
                      <ThemedText style={styles.nome}>Cancelar este evento?</ThemedText>
                      <ThemedText style={styles.descricao}>O evento permanecerá no histórico e não será considerado na previsão de consumo.</ThemedText>
                      <View style={styles.acoes}>
                        <TouchableOpacity style={[styles.btnSecundario, { borderColor: theme.backgroundSelected }]} onPress={() => setConfirmandoId(null)} disabled={ocupado}>
                          <ThemedText style={styles.acaoTexto}>Voltar</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btnPerigo, { opacity: ocupado ? 0.6 : 1 }]} onPress={() => void cancelarEvento(evento.id)} disabled={ocupado}>
                          <ThemedText style={styles.btnTexto}>{cancelandoId === evento.id ? "Cancelando..." : "Confirmar"}</ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.acoes}>
                      <TouchableOpacity
                        style={[styles.btnPrincipal, styles.flex, { opacity: ocupado ? 0.5 : 1 }]}
                        disabled={ocupado}
                        onPress={() => router.push({ pathname: "/realizarEvento", params: { id: String(evento.id) } })}
                      >
                        <ThemedText style={styles.btnTexto}>Realizar</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.btnSecundario, { borderColor: theme.backgroundSelected, opacity: ocupado ? 0.5 : 1 }]}
                        onPress={() => { setErroAcao(null); setSucesso(null); setConfirmandoId(evento.id); }}
                        disabled={ocupado}
                      >
                        <ThemedText style={styles.cancelarTexto}>Cancelar</ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  header: { paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#D8DEE8" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  titulo: { fontSize: 24, fontWeight: "700", flex: 1 },
  subtitulo: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  refresh: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  lista: { padding: 20, gap: 14 },
  card: { padding: 16, borderWidth: 1, borderRadius: 18, gap: 10, elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  headerTexts: { flex: 1, gap: 4 },
  nome: { fontSize: 16, fontWeight: "600" },
  descricao: { fontSize: 13, lineHeight: 19 },
  status: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  statusTexto: { fontSize: 11, fontWeight: "600" },
  info: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoTexto: { flex: 1, fontSize: 13, lineHeight: 19 },
  estado: { alignItems: "center", gap: 10, paddingVertical: 24 },
  acoes: { flexDirection: "row", gap: 8, marginTop: 6 },
  flex: { flex: 1 },
  btnPrincipal: { minHeight: 42, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: "#6A95C7", alignItems: "center", justifyContent: "center" },
  btnPerigo: { flex: 1, minHeight: 42, padding: 8, borderRadius: 12, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center" },
  btnSecundario: { flex: 1, minHeight: 42, padding: 8, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnTexto: { fontSize: 12, color: "#FFFFFF", fontWeight: "600", textAlign: "center" },
  acaoTexto: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  cancelarTexto: { fontSize: 12, color: "#DC2626", fontWeight: "600" },
  confirmacao: { borderTopWidth: 1, paddingTop: 12, gap: 8 },
  erro: { color: "#DC2626", fontSize: 13, textAlign: "center" },
  sucesso: { color: "#059669", fontSize: 13, textAlign: "center" },
});
