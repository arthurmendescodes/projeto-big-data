import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { CalendarDays, Clock, MapPin, RefreshCw, Search } from "lucide-react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedTextInput } from "@/components/ThemedTextInput";
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

type Filtro = "todos" | "realizado" | "cancelado";

const filtros: { valor: Filtro; titulo: string }[] = [
  { valor: "todos", titulo: "Todos" },
  { valor: "realizado", titulo: "Realizados" },
  { valor: "cancelado", titulo: "Cancelados" },
];

function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-");
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : data;
}

// Permite, por exemplo, encontrar "Ação social" digitando "acao".
function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export default function HistoricoEventos() {
  const theme = useTheme();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pesquisa, setPesquisa] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const consultaAtual = useRef(0);

  const carregarEventos = useCallback(async () => {
    const consulta = ++consultaAtual.current;
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await apiFetch("/events");
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        throw new Error(typeof dados?.error === "string"
          ? dados.error
          : "Não foi possível consultar o histórico de eventos.");
      }

      const dados: Evento[] = await resposta.json();
      if (!Array.isArray(dados)) {
        throw new Error("Resposta de eventos inválida.");
      }
      if (consulta !== consultaAtual.current) return;

      // Agendados pertencem à outra tela. A ordenação utiliza a data prevista.
      setEventos(dados
        .filter((evento) => evento.status === "realizado" || evento.status === "cancelado")
        .sort((a, b) =>
          b.event_date.localeCompare(a.event_date) ||
          (b.event_time || "").localeCompare(a.event_time || "") ||
          b.id - a.id
        ));
    } catch (e) {
      if (consulta !== consultaAtual.current) return;
      setErro(e instanceof Error ? e.message : "Erro ao consultar histórico.");
    } finally {
      if (consulta === consultaAtual.current) setCarregando(false);
    }
  }, []);

  // Atualiza sempre que a tela recebe foco; descarta respostas antigas.
  useFocusEffect(useCallback(() => {
    void carregarEventos();
    return () => { consultaAtual.current += 1; };
  }, [carregarEventos]));

  const realizados = eventos.filter((evento) => evento.status === "realizado").length;
  const cancelados = eventos.length - realizados;

  const eventosFiltrados = useMemo(() => {
    const termo = normalizar(pesquisa);
    return eventos.filter((evento) => {
      if (filtro !== "todos" && evento.status !== filtro) return false;
      const campos = [evento.name, evento.event_types?.name, evento.location, evento.description];
      return campos.some((campo) => normalizar(campo || "").includes(termo));
    });
  }, [eventos, pesquisa, filtro]);

  const cardTema = {
    backgroundColor: theme.backgroundElement,
    borderColor: theme.backgroundSelected,
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.headerRow}>
          <ThemedText style={styles.titulo}>Histórico de Eventos</ThemedText>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Atualizar histórico"
            style={[styles.refresh, { backgroundColor: theme.backgroundSelected, opacity: carregando ? 0.5 : 1 }]}
            onPress={() => void carregarEventos()}
            disabled={carregando}
          >
            <RefreshCw size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
        <ThemedText style={styles.subtitulo}>Consulte os eventos realizados e cancelados da igreja.</ThemedText>
      </View>

      {carregando ? (
        <View style={styles.estado}>
          <ActivityIndicator size="large" color={theme.text} />
          <ThemedText>Carregando histórico...</ThemedText>
        </View>
      ) : erro ? (
        <View style={[styles.card, cardTema, styles.erroCard]}>
          <ThemedText style={styles.erro}>{erro}</ThemedText>
          <TouchableOpacity style={styles.btnPrincipal} onPress={() => void carregarEventos()}>
            <ThemedText style={styles.btnTexto}>Tentar novamente</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={eventosFiltrados}
          keyExtractor={(evento) => String(evento.id)}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.controles}>
              <View style={styles.resumo}>
                <View style={[styles.resumoCard, cardTema]}>
                  <ThemedText style={styles.resumoNumero}>{realizados}</ThemedText>
                  <ThemedText style={styles.descricao}>Realizados</ThemedText>
                </View>
                <View style={[styles.resumoCard, cardTema]}>
                  <ThemedText style={styles.resumoNumero}>{cancelados}</ThemedText>
                  <ThemedText style={styles.descricao}>Cancelados</ThemedText>
                </View>
              </View>

              <View style={[styles.busca, cardTema]}>
                <Search size={19} color={theme.textSecondary} />
                <ThemedTextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Pesquisar eventos..."
                  value={pesquisa}
                  onChangeText={setPesquisa}
                  autoCorrect={false}
                  accessibilityLabel="Pesquisar eventos"
                />
              </View>

              <View style={styles.filtros}>
                {filtros.map(({ valor, titulo }) => (
                  <TouchableOpacity
                    key={valor}
                    accessibilityRole="button"
                    accessibilityState={{ selected: filtro === valor }}
                    style={[styles.filtro, {
                      borderColor: filtro === valor ? "#6A95C7" : theme.backgroundSelected,
                      backgroundColor: filtro === valor ? "#6A95C7" : theme.backgroundElement,
                    }]}
                    onPress={() => setFiltro(valor)}
                  >
                    <ThemedText style={[styles.filtroTexto, filtro === valor ? { color: "#FFFFFF" } : { color: theme.text }]}>{titulo}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              <ThemedText style={[styles.descricao, { color: theme.textSecondary }]}>
                {eventosFiltrados.length} de {eventos.length} eventos · Mais recentes pela data prevista
              </ThemedText>
            </View>
          }
          ListEmptyComponent={
            <View style={[styles.card, cardTema, styles.estado]}>
              <CalendarDays size={32} color={theme.textSecondary} />
              <ThemedText>{eventos.length === 0 ? "Nenhum evento no histórico." : "Nenhum evento encontrado."}</ThemedText>
              <ThemedText style={[styles.descricao, { textAlign: "center" }]}>
                {eventos.length === 0 ? "Eventos realizados e cancelados aparecerão aqui." : "Altere a pesquisa ou o filtro."}
              </ThemedText>
              {eventos.length > 0 && (
                <TouchableOpacity style={styles.btnPrincipal} onPress={() => { setPesquisa(""); setFiltro("todos"); }}>
                  <ThemedText style={styles.btnTexto}>Limpar filtros</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item: evento }) => (
            <View style={[styles.card, cardTema]}>
              <View style={styles.cardHeader}>
                <View style={styles.headerTexts}>
                  <ThemedText style={styles.nome}>{evento.name}</ThemedText>
                  <ThemedText style={[styles.descricao, { color: theme.textSecondary }]}>
                    {evento.event_types?.name || "Tipo não informado"}
                  </ThemedText>
                </View>
                <View style={[styles.status, { backgroundColor: evento.status === "realizado" ? "#DCFCE7" : "#FEE2E2" }]}>
                  <ThemedText style={[styles.statusTexto, { color: evento.status === "realizado" ? "#166534" : "#991B1B" }]}>
                    {evento.status === "realizado" ? "Realizado" : "Cancelado"}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.info}>
                <CalendarDays size={17} color={theme.textSecondary} />
                <ThemedText style={styles.infoTexto}>Data prevista: {formatarData(evento.event_date)}</ThemedText>
              </View>
              <View style={styles.info}>
                <Clock size={17} color={theme.textSecondary} />
                <ThemedText style={styles.infoTexto}>{evento.event_time ? evento.event_time.slice(0, 5) : "Horário não informado"}</ThemedText>
              </View>
              <View style={styles.info}>
                <MapPin size={17} color={theme.textSecondary} />
                <ThemedText style={styles.infoTexto}>{evento.location?.trim() || "Endereço não informado"}</ThemedText>
              </View>
              {!!evento.description?.trim() && (
                <ThemedText style={[styles.descricao, { color: theme.textSecondary }]}>{evento.description}</ThemedText>
              )}
            </View>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#D8DEE8" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  titulo: { fontSize: 24, fontWeight: "700", flex: 1 },
  subtitulo: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  refresh: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  lista: { padding: 20, paddingBottom: 24, gap: 14 },
  controles: { gap: 14 },
  resumo: { flexDirection: "row", gap: 10 },
  resumoCard: { flex: 1, padding: 14, borderWidth: 1, borderRadius: 14, gap: 5 },
  resumoNumero: { fontSize: 24, fontWeight: "700", lineHeight: 30 },
  busca: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 44, gap: 8 },
  input: { flex: 1, minWidth: 0, minHeight: 44, fontSize: 13, paddingVertical: 8 },
  filtros: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filtro: { flexGrow: 1, minHeight: 40, borderRadius: 12, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 8, alignItems: "center", justifyContent: "center" },
  filtroTexto: { fontSize: 12, fontWeight: "600" },
  card: { padding: 16, borderWidth: 1, borderRadius: 18, gap: 10, elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  headerTexts: { flex: 1, gap: 4 },
  nome: { fontSize: 16, fontWeight: "600" },
  descricao: { fontSize: 13, lineHeight: 19 },
  status: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  statusTexto: { fontSize: 11, fontWeight: "600" },
  info: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoTexto: { flex: 1, fontSize: 13, lineHeight: 19 },
  estado: { alignItems: "center", gap: 10, paddingVertical: 24, paddingHorizontal: 16 },
  erroCard: { margin: 20 },
  erro: { color: "#DC2626", fontSize: 13, textAlign: "center" },
  btnPrincipal: { minHeight: 42, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: "#6A95C7", alignItems: "center", justifyContent: "center" },
  btnTexto: { fontSize: 12, color: "#FFFFFF", fontWeight: "600", textAlign: "center" },
});
