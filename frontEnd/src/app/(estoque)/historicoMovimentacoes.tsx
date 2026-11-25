import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { CalendarDays, PackageMinus, PackagePlus, RefreshCw, HistoryIcon, } from "lucide-react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/hooks/use-theme";
import { apiFetch } from "../../services/api";

type Filtro = "todos" | "entrada" | "saida";
type Movimentacao = {
  id: number;
  product_id: number;
  event_id: number | null;
  movement_type: "entrada" | "saida";
  quantity: number | string;
  description: string | null;
  occurred_at: string;
  products: { name: string; unit: string } | null;
  events: { name: string } | null;
};
type RespostaHistorico = { movements: Movimentacao[]; page: number; has_more: boolean };

const filtros: { valor: Filtro; titulo: string }[] = [
  { valor: "todos", titulo: "Todas" },
  { valor: "entrada", titulo: "Entradas" },
  { valor: "saida", titulo: "Saídas" },
];

function formatarQuantidade(valor: number | string) {
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? numero.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
    : String(valor);
}

function formatarDataHora(valor: string) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Data não informada";
  return data.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function HistoricoMovimentacoes() {
  const theme = useTheme();
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [pagina, setPagina] = useState(1);
  const [temMais, setTemMais] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const consultaAtual = useRef(0);

  const carregar = useCallback(async () => {
    const consulta = ++consultaAtual.current;
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await apiFetch(`/stock/movements?type=${filtro}&page=${pagina}`);
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        throw new Error(typeof dados?.error === "string" ? dados.error : "Não foi possível consultar as movimentações.");
      }
      if (!dados || !Array.isArray(dados.movements) || dados.page !== pagina || typeof dados.has_more !== "boolean") {
        throw new Error("Resposta do histórico inválida.");
      }
      if (consulta !== consultaAtual.current) return;
      const resultado: RespostaHistorico = dados;
      setMovimentacoes(resultado.movements);
      setTemMais(resultado.has_more);
    } catch (e) {
      if (consulta !== consultaAtual.current) return;
      setErro(e instanceof Error ? e.message : "Erro ao consultar o histórico.");
    } finally {
      if (consulta === consultaAtual.current) setCarregando(false);
    }
  }, [filtro, pagina]);

  useFocusEffect(useCallback(() => {
    void carregar();
    return () => { consultaAtual.current += 1; };
  }, [carregar]));

  function selecionarFiltro(valor: Filtro) {
    if (valor === filtro && pagina === 1) return;
    consultaAtual.current += 1;
    setCarregando(true);
    setPagina(1);
    setFiltro(valor);
  }

  function mudarPagina(valor: number) {
    if (carregando || valor < 1 || (valor > pagina && !temMais)) return;
    consultaAtual.current += 1;
    setCarregando(true);
    setPagina(valor);
  }

  function atualizar() {
    if (pagina === 1) void carregar();
    else {
      consultaAtual.current += 1;
      setCarregando(true);
      setPagina(1);
    }
  }

  const cardTema = { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected };
  const entradas = movimentacoes.filter((item) => item.movement_type === "entrada").length;
  const saidas = movimentacoes.filter((item) => item.movement_type === "saida").length;

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.headerRow}>
          <ThemedText style={styles.titulo}>Histórico de Movimentações</ThemedText>
          <TouchableOpacity
            accessibilityRole="button" accessibilityLabel="Atualizar histórico"
            style={[styles.refresh, { backgroundColor: theme.backgroundSelected, opacity: carregando ? 0.5 : 1 }]}
            onPress={atualizar} disabled={carregando}
          >
            <RefreshCw size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
        <ThemedText style={styles.subtitulo}>Consulte as entradas e saídas do estoque da igreja.</ThemedText>
      </View>

      <View style={styles.controles}>
        <View style={styles.filtros}>
          {filtros.map(({ valor, titulo }) => (
            <TouchableOpacity key={valor} accessibilityRole="button"
              accessibilityState={{ selected: filtro === valor }}
              style={[styles.filtro, {
                backgroundColor: filtro === valor ? "#6A95C7" : theme.backgroundElement,
                borderColor: filtro === valor ? "#6A95C7" : theme.backgroundSelected,
              }]}
              onPress={() => selecionarFiltro(valor)}
            >
              <ThemedText style={[styles.filtroTexto, { color: filtro === valor ? "#FFFFFF" : theme.text }]}>{titulo}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {carregando ? (
        <View style={styles.estado}>
          <ActivityIndicator size="large" color={theme.text} />
          <ThemedText>Carregando movimentações...</ThemedText>
        </View>
      ) : erro ? (
        <View style={[styles.card, cardTema, styles.erroCard]}>
          <ThemedText>{erro}</ThemedText>
          <TouchableOpacity style={styles.btnPrincipal} onPress={() => void carregar()}>
            <ThemedText style={styles.btnTexto}>Tentar novamente</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          key={`${filtro}-${pagina}`}
          data={movimentacoes}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.resumoArea}>
              <View style={styles.resumo}>
                <View style={[styles.resumoCard, cardTema]}>
                  <ThemedText style={styles.resumoNumero}>{entradas}</ThemedText>
                  <ThemedText style={styles.descricao}>Entradas nesta página</ThemedText>
                </View>
                <View style={[styles.resumoCard, cardTema]}>
                  <ThemedText style={styles.resumoNumero}>{saidas}</ThemedText>
                  <ThemedText style={styles.descricao}>Saídas nesta página</ThemedText>
                </View>
              </View>
              <ThemedText style={[styles.descricao, { color: theme.textSecondary }]}>Mais recentes primeiro · Página {pagina}</ThemedText>
            </View>
          }
          ListEmptyComponent={
            <View style={[styles.card, cardTema, styles.estado]}>
              <ThemedText>Nenhuma movimentação encontrada.</ThemedText>
              <ThemedText style={[styles.descricao, { color: theme.textSecondary }]}>Altere o filtro ou volte à página anterior.</ThemedText>
            </View>
          }
          renderItem={({ item }) => {
            const entrada = item.movement_type === "entrada";
            const Icone = entrada ? PackagePlus : PackageMinus;
            const cor = entrada ? "#047857" : "#B91C1C";
            return (
              <View style={[styles.card, cardTema]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.areaIcone, { backgroundColor: entrada ? "#D1FAE5" : "#FEE2E2" }]}>
                    <Icone size={23} color={cor} />
                  </View>
                  <View style={styles.headerTexts}>
                    <ThemedText style={styles.nome}>{item.products?.name || `Produto #${item.product_id}`}</ThemedText>
                    <ThemedText style={[styles.descricao, { color: theme.textSecondary }]}>{entrada ? "Entrada" : "Saída"}</ThemedText>
                  </View>
                  <View style={[styles.badge, { backgroundColor: entrada ? "#D1FAE5" : "#FEE2E2" }]}>
                    <ThemedText style={[styles.quantidade, { color: cor }]}>
                      {entrada ? "+" : "−"}{formatarQuantidade(item.quantity)} {item.products?.unit || ""}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <CalendarDays size={16} color={theme.textSecondary} />
                  <ThemedText style={styles.infoTexto}>{formatarDataHora(item.occurred_at)}</ThemedText>
                </View>
                <ThemedText style={styles.infoTexto}>
                  {item.event_id != null ? `Evento: ${item.events?.name || `#${item.event_id}`}` : "Sem evento associado"}
                </ThemedText>
                {!!item.description?.trim() && (
                  <ThemedText style={[styles.descricao, { color: theme.textSecondary }]}>{item.description}</ThemedText>
                )}
              </View>
            );
          }}
          ListFooterComponent={
            <View style={styles.paginacao}>
              <TouchableOpacity accessibilityRole="button" disabled={pagina === 1}
                style={[styles.btnPagina, cardTema, { opacity: pagina === 1 ? 0.4 : 1 }]}
                onPress={() => mudarPagina(pagina - 1)}>
                <ThemedText style={styles.filtroTexto}>Anterior</ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.descricao}>Página {pagina}</ThemedText>
              <TouchableOpacity accessibilityRole="button" disabled={!temMais}
                style={[styles.btnPagina, cardTema, { opacity: temMais ? 1 : 0.4 }]}
                onPress={() => mudarPagina(pagina + 1)}>
                <ThemedText style={styles.filtroTexto}>Próxima</ThemedText>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#D8DEE8" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  titulo: { flex: 1, fontSize: 24, fontWeight: "700" },
  subtitulo: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  refresh: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  controles: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  filtros: { flexDirection: "row", gap: 8 },
  filtro: { flex: 1, borderWidth: 1, borderRadius: 12, minHeight: 42, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  filtroTexto: { fontSize: 12, fontWeight: "600" },
  lista: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, gap: 12 },
  resumoArea: { gap: 10, marginBottom: 2 },
  resumo: { flexDirection: "row", gap: 10 },
  resumoCard: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  resumoNumero: { fontSize: 22, fontWeight: "700" },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 },
  areaIcone: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerTexts: { flex: 1, minWidth: 80, gap: 3 },
  nome: { fontSize: 16, fontWeight: "600" },
  descricao: { fontSize: 12, lineHeight: 18 },
  badge: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6, maxWidth: "100%" },
  quantidade: { fontSize: 13, fontWeight: "700" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoTexto: { fontSize: 13, flexShrink: 1 },
  estado: { alignItems: "center", justifyContent: "center", padding: 20, gap: 12 },
  erroCard: { margin: 20 },
  btnPrincipal: { minHeight: 44, backgroundColor: "#6A95C7", borderRadius: 12, alignItems: "center", justifyContent: "center", padding: 10 },
  btnTexto: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  paginacao: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingVertical: 8 },
  btnPagina: { minHeight: 42, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, justifyContent: "center", alignItems: "center" },
});
