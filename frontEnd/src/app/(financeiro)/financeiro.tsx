import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { RefreshCw } from "lucide-react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { apiFetch } from "@/services/api";

type Aba = "geral" | "ranking" | "despesas";
type Ordem = "balance" | "expenses" | "income";
type Resumo = {
  total_income: number;
  total_expenses: number;
  balance: number;
  month_income: number;
  month_expenses: number;
  month_balance: number;
  month_reference: string;
};
type TipoEvento = {
  event_type_id: number;
  event_type_name: string;
  event_count: number;
  income: number;
  expenses: number;
  balance: number;
  average_expense: number;
};
type Categoria = {
  category_id: number | null;
  category_name: string;
  expenses: number;
  entry_count: number;
  percentage: number;
};
type Dashboard = { summary: Resumo; event_types: TipoEvento[]; expense_categories: Categoria[] };

const ABAS: { valor: Aba; label: string }[] = [
  { valor: "geral", label: "Visão geral" },
  { valor: "ranking", label: "Ranking" },
  { valor: "despesas", label: "Despesas" },
];
const ORDENS: { valor: Ordem; label: string }[] = [
  { valor: "balance", label: "Maior saldo" },
  { valor: "expenses", label: "Maior gasto" },
  { valor: "income", label: "Maior receita" },
];
const CORES = { receita: "#0D9868", despesa: "#DC5252", saldo: "#578BC6", negativo: "#A855A6" };
const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const percentual = (valor: number) => `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const pct = (valor: number): `${number}%` => `${Math.min(100, Math.max(0, valor))}%`;
const corSaldo = (valor: number) => valor < 0 ? CORES.negativo : CORES.receita;
const rotuloSaldo = (valor: number) => valor > 0 ? "Superávit" : valor < 0 ? "Déficit" : "Saldo neutro";

function formatarMes(valor: string) {
  const [ano, mes] = valor.split("-").map(Number);
  if (!ano || !mes || mes > 12) return valor;
  return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

// Converte valores numéricos que a API eventualmente retorne como string.
function numero(valor: unknown): number {
  if ((typeof valor !== "number" && typeof valor !== "string") || (typeof valor === "string" && !valor.trim())) {
    throw new Error("Resposta financeira inválida.");
  }
  const n = Number(valor);
  if (!Number.isFinite(n)) throw new Error("Valor financeiro inválido.");
  return n;
}
function objeto(valor: unknown): Record<string, unknown> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new Error("Resposta financeira inválida.");
  return valor as Record<string, unknown>;
}
function texto(valor: unknown): string {
  if (typeof valor !== "string") throw new Error("Resposta financeira inválida.");
  return valor;
}
function interpretarDashboard(valor: unknown): Dashboard {
  const d = objeto(valor);
  const s = objeto(d.summary);
  if (!Array.isArray(d.event_types) || !Array.isArray(d.expense_categories)) throw new Error("Resposta financeira inválida.");
  return {
    summary: {
      total_income: numero(s.total_income), total_expenses: numero(s.total_expenses),
      balance: numero(s.balance), month_income: numero(s.month_income),
      month_expenses: numero(s.month_expenses), month_balance: numero(s.month_balance),
      month_reference: texto(s.month_reference),
    },
    event_types: d.event_types.map((valor: unknown) => {
      const t = objeto(valor);
      return { event_type_id: numero(t.event_type_id), event_type_name: texto(t.event_type_name),
        event_count: numero(t.event_count), income: numero(t.income), expenses: numero(t.expenses),
        balance: numero(t.balance), average_expense: numero(t.average_expense) };
    }),
    expense_categories: d.expense_categories.map((valor: unknown) => {
      const c = objeto(valor);
      return { category_id: c.category_id === null ? null : numero(c.category_id), category_name: texto(c.category_name),
        expenses: numero(c.expenses), entry_count: numero(c.entry_count), percentage: numero(c.percentage) };
    }),
  };
}

// As barras são Views comuns, sem biblioteca de gráficos.
// Todos os tipos compartilham a mesma escala e a mesma posição do zero.
function Barra({ label, valor, cor, minimo = 0, maximo }: {
  label: string; valor: number; cor: string; minimo?: number; maximo: number;
}) {
  const theme = useTheme();
  const amplitude = maximo - minimo || 1;
  const zero = (-minimo / amplitude) * 100;
  const posicao = ((valor - minimo) / amplitude) * 100;
  return (
    <View style={styles.barraGrupo}>
      <View style={styles.linhaValor}>
        <View style={styles.rotuloBarra}>
          <View style={[styles.ponto, { backgroundColor: cor }]} />
          <ThemedText style={styles.rotulo}>{label}</ThemedText>
        </View>
        <ThemedText style={styles.valorBarra}>{moeda(valor)}</ThemedText>
      </View>
      <View style={[styles.trilho, { backgroundColor: theme.backgroundSelected }]}>
        {valor !== 0 && <View style={[styles.preenchimento, { backgroundColor: cor, left: pct(Math.min(zero, posicao)), width: pct(Math.abs(posicao - zero)) }]} />}
        {minimo < 0 && <View style={[styles.eixoZero, { left: pct(zero), backgroundColor: theme.textSecondary }]} />}
      </View>
    </View>
  );
}

function Linha({ label, valor, cor }: { label: string; valor: number; cor?: string }) {
  return (
    <View style={styles.linhaValor}>
      <ThemedText style={styles.rotuloLinha}>{label}</ThemedText>
      <ThemedText style={[styles.valorLinha, cor ? { color: cor } : undefined]}>{moeda(valor)}</ThemedText>
    </View>
  );
}

export default function Financeiro() {
  const router = useRouter();
  const theme = useTheme();
  const [aba, setAba] = useState<Aba>("geral");
  const [ordem, setOrdem] = useState<Ordem>("balance");
  const [dados, setDados] = useState<Dashboard | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const consultaAtual = useRef(0);

  const carregar = useCallback(async () => {
    const id = ++consultaAtual.current;
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await apiFetch("/financial/dashboard");
      const json = await resposta.json().catch(() => null);
      if (!resposta.ok) throw new Error(typeof json?.error === "string" ? json.error : "Não foi possível consultar o financeiro.");
      const resultado = interpretarDashboard(json);
      if (consultaAtual.current === id) setDados(resultado);
    } catch (e) {
      if (consultaAtual.current === id) setErro(e instanceof Error ? e.message : "Erro ao consultar o financeiro.");
    } finally {
      if (consultaAtual.current === id) setCarregando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void carregar();
    return () => { consultaAtual.current += 1; };
  }, [carregar]));

  const card = [styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }];
  const categorias = [...(dados?.expense_categories ?? [])].sort((a, b) => b.expenses - a.expenses || a.category_name.localeCompare(b.category_name));
  const ranking = [...(dados?.event_types ?? [])].sort((a, b) => b[ordem] - a[ordem] || a.event_type_name.localeCompare(b.event_type_name));
  const maiorCategoria = categorias[0];
  // A escala é global: não é recalculada por tipo ou por barra.
  const escala = ranking.reduce((acc, t) => ({ min: Math.min(acc.min, t.balance), max: Math.max(acc.max, t.income, t.expenses, t.balance) }), { min: 0, max: 0 });
  const maximo = escala.max === escala.min ? 1 : escala.max;
  const totalEventos = ranking.reduce((total, t) => total + t.event_count, 0);
  const resumo = dados?.summary;

  function mudarAba(valor: Aba) {
    setAba(valor);
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.backgroundSelected }]}>
        <View style={styles.headerLinha}>
          <View style={styles.headerTexto}>
            <ThemedText style={styles.titulo}>Financeiro</ThemedText>
            <ThemedText style={[styles.subtitulo, { color: theme.textSecondary }]}>Acompanhe os recursos da igreja.</ThemedText>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Atualizar financeiro" onPress={() => void carregar()} disabled={carregando} style={[styles.atualizar, { borderColor: theme.backgroundSelected, opacity: carregando ? 0.5 : 1 }]}>
            <RefreshCw size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.abas}>
          {ABAS.map(item => (
            <TouchableOpacity key={item.valor} accessibilityRole="button" accessibilityState={{ selected: aba === item.valor }} onPress={() => mudarAba(item.valor)} style={[styles.aba, { backgroundColor: aba === item.valor ? "#6A95C7" : theme.background, borderColor: aba === item.valor ? "#6A95C7" : theme.backgroundSelected }]}>
              <ThemedText style={[styles.abaTexto, { color: aba === item.valor ? "#FFFFFF" : theme.text }]}>{item.label}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity accessibilityRole="button" style={styles.botao} onPress={() => router.push("/lancamentosFinanceiros")}>
          <ThemedText style={styles.botaoTexto}>Lançamentos financeiros</ThemedText>
        </TouchableOpacity>
      </View>
      <ScrollView key={aba} contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
        {carregando ? (
          <View style={styles.estado}><ActivityIndicator size="large" color={theme.text} /><ThemedText>Consultando dados financeiros...</ThemedText></View>
        ) : erro ? (
          <View style={card}>
            <ThemedText style={styles.secao}>Não foi possível carregar</ThemedText>
            <ThemedText style={styles.erro}>{erro}</ThemedText>
            <TouchableOpacity accessibilityRole="button" style={styles.botao} onPress={() => void carregar()}><ThemedText style={styles.botaoTexto}>Tentar novamente</ThemedText></TouchableOpacity>
          </View>
        ) : resumo && dados ? (
          <>
            {aba === "geral" && (
              <>
                <View style={card}>
                  <ThemedText style={styles.secao}>Balanço atual</ThemedText>
                  <ThemedText style={[styles.saldoGrande, { color: corSaldo(resumo.balance) }]}>{moeda(resumo.balance)}</ThemedText>
                  <ThemedText style={[styles.pequeno, { color: theme.textSecondary }]}>{rotuloSaldo(resumo.balance)} acumulado • todos os lançamentos</ThemedText>
                  <View style={[styles.divisor, { backgroundColor: theme.backgroundSelected }]} />
                  <Linha label="Receitas totais" valor={resumo.total_income} cor={CORES.receita} />
                  <Linha label="Despesas totais" valor={resumo.total_expenses} cor={CORES.despesa} />
                  <ThemedText style={[styles.nota, { color: theme.textSecondary }]}>Saldo dos registros do sistema, não necessariamente o saldo bancário.</ThemedText>
                </View>
                <View style={card}>
                  <ThemedText style={styles.secao}>Movimentações do mês</ThemedText>
                  <ThemedText style={[styles.pequeno, { color: theme.textSecondary }]}>{formatarMes(resumo.month_reference)}</ThemedText>
                  <Linha label="Receitas" valor={resumo.month_income} cor={CORES.receita} />
                  <Linha label="Despesas" valor={resumo.month_expenses} cor={CORES.despesa} />
                  <View style={[styles.divisor, { backgroundColor: theme.backgroundSelected }]} />
                  <Linha label="Resultado do mês" valor={resumo.month_balance} cor={corSaldo(resumo.month_balance)} />
                  <ThemedText style={[styles.nota, { color: theme.textSecondary }]}>Mês do registro financeiro (horário de Brasília).</ThemedText>
                </View>
                <View style={card}>
                  <ThemedText style={styles.secao}>Principal categoria de gastos</ThemedText>
                  {maiorCategoria ? <>
                    <ThemedText style={styles.destaque}>{maiorCategoria.category_name}</ThemedText>
                    <Linha label="Total gasto" valor={maiorCategoria.expenses} cor={CORES.despesa} />
                    <ThemedText style={styles.pequeno}>{percentual(maiorCategoria.percentage)} das despesas registradas.</ThemedText>
                    <TouchableOpacity accessibilityRole="button" style={styles.botao} onPress={() => mudarAba("despesas")}><ThemedText style={styles.botaoTexto}>Ver análise de despesas</ThemedText></TouchableOpacity>
                  </> : <ThemedText>Nenhuma despesa registrada.</ThemedText>}
                </View>
                <View style={card}>
                  <ThemedText style={styles.secao}>Eventos realizados</ThemedText>
                  <ThemedText style={styles.destaque}>{totalEventos}</ThemedText>
                  <ThemedText style={[styles.pequeno, { color: theme.textSecondary }]}>Inclui eventos sem movimentações financeiras.</ThemedText>
                  <TouchableOpacity accessibilityRole="button" style={styles.botao} onPress={() => mudarAba("ranking")}><ThemedText style={styles.botaoTexto}>Ver ranking de eventos</ThemedText></TouchableOpacity>
                </View>
              </>
            )}
            {aba === "ranking" && (
              <>
                <View style={card}>
                  <ThemedText style={styles.secao}>Resultado por tipo de evento</ThemedText>
                  <ThemedText style={[styles.pequeno, { color: theme.textSecondary }]}>Histórico completo • somente eventos realizados</ThemedText>
                  <View style={styles.abas}>
                    {ORDENS.map(item => <TouchableOpacity key={item.valor} accessibilityRole="button" accessibilityState={{ selected: ordem === item.valor }} style={[styles.aba, { backgroundColor: ordem === item.valor ? "#6A95C7" : theme.background, borderColor: theme.backgroundSelected }]} onPress={() => setOrdem(item.valor)}><ThemedText style={[styles.abaTexto, { color: ordem === item.valor ? "#FFFFFF" : theme.text }]}>{item.label}</ThemedText></TouchableOpacity>)}
                  </View>
                  <ThemedText style={[styles.nota, { color: theme.textSecondary }]}>As barras usam a mesma escala em reais. Despesas são exibidas como valores positivos; saldos negativos avançam para a esquerda do zero.</ThemedText>
                </View>
                {ranking.length === 0 ? <View style={card}><ThemedText>Nenhum evento realizado encontrado.</ThemedText></View> : ranking.map((tipo, i) => (
                  <View key={tipo.event_type_id} style={card}>
                    <ThemedText style={styles.secao}>{i + 1}. {tipo.event_type_name}</ThemedText>
                    <ThemedText style={[styles.pequeno, { color: theme.textSecondary }]}>{tipo.event_count} {tipo.event_count === 1 ? "evento realizado" : "eventos realizados"}</ThemedText>
                    <Barra label="Receitas" valor={tipo.income} cor={CORES.receita} minimo={escala.min} maximo={maximo} />
                    <Barra label="Despesas" valor={tipo.expenses} cor={CORES.despesa} minimo={escala.min} maximo={maximo} />
                    <Barra label="Saldo" valor={tipo.balance} cor={tipo.balance < 0 ? CORES.negativo : CORES.saldo} minimo={escala.min} maximo={maximo} />
                    <View style={[styles.divisor, { backgroundColor: theme.backgroundSelected }]} />
                    <Linha label="Gasto médio por evento" valor={tipo.average_expense} />
                    <ThemedText style={[styles.pequeno, { color: corSaldo(tipo.balance) }]}>{rotuloSaldo(tipo.balance)}</ThemedText>
                  </View>
                ))}
              </>
            )}
            {aba === "despesas" && (
              <>
                <View style={card}>
                  <ThemedText style={styles.secao}>Despesas por categoria</ThemedText>
                  <ThemedText style={[styles.saldoGrande, { color: CORES.despesa }]}>{moeda(resumo.total_expenses)}</ThemedText>
                  <ThemedText style={[styles.pequeno, { color: theme.textSecondary }]}>Total acumulado • eventos e lançamentos independentes</ThemedText>
                </View>
                {categorias.length === 0 ? <View style={card}><ThemedText>Nenhuma despesa registrada.</ThemedText></View> : categorias.map((categoria, i) => (
                  <View key={categoria.category_id ?? "sem-categoria"} style={card}>
                    <ThemedText style={styles.secao}>{i + 1}. {categoria.category_name}</ThemedText>
                    <View style={styles.linhaValor}>
                      <ThemedText style={styles.valorLinha}>{moeda(categoria.expenses)}</ThemedText>
                      <ThemedText style={[styles.valorLinha, { color: CORES.despesa }]}>{percentual(categoria.percentage)}</ThemedText>
                    </View>
                    <View style={[styles.trilho, { backgroundColor: theme.backgroundSelected }]}><View style={[styles.preenchimento, { left: 0, width: pct(categoria.percentage), backgroundColor: CORES.despesa }]} /></View>
                    <ThemedText style={[styles.pequeno, { color: theme.textSecondary }]}>{categoria.entry_count} {categoria.entry_count === 1 ? "lançamento" : "lançamentos"}</ThemedText>
                  </View>
                ))}
                <ThemedText style={[styles.nota, { color: theme.textSecondary }]}>As barras representam a participação de cada categoria no total de despesas. Percentuais podem sofrer arredondamento.</ThemedText>
              </>
            )}
          </>
        ) : <View style={card}><ThemedText>Nenhum dado disponível.</ThemedText></View>}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 14 },
  headerLinha: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTexto: { flex: 1 },
  titulo: { fontSize: 24, fontWeight: "700" },
  subtitulo: { fontSize: 12, lineHeight: 18, marginTop: 6 },
  atualizar: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 12 },
  abas: { flexDirection: "row", gap: 6 },
  aba: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 4, paddingVertical: 8, alignItems: "center", justifyContent: "center" },
  abaTexto: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  conteudo: { padding: 20, paddingBottom: 30, gap: 14 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  secao: { fontSize: 16, fontWeight: "700" },
  saldoGrande: { fontSize: 27, fontWeight: "700", lineHeight: 36 },
  destaque: { fontSize: 21, fontWeight: "700", lineHeight: 29 },
  pequeno: { fontSize: 12, lineHeight: 18 },
  nota: { fontSize: 11, lineHeight: 16 },
  linhaValor: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rotuloLinha: { fontSize: 13, flexShrink: 1 },
  valorLinha: { fontSize: 14, fontWeight: "600" },
  divisor: { height: StyleSheet.hairlineWidth },
  botao: { minHeight: 44, backgroundColor: "#6A95C7", alignItems: "center", justifyContent: "center", borderRadius: 12, padding: 10 },
  botaoTexto: { color: "#FFFFFF", fontSize: 13, fontWeight: "600", textAlign: "center" },
  estado: { paddingVertical: 40, gap: 12, alignItems: "center" },
  erro: { color: "#DC2626", fontSize: 13 },
  barraGrupo: { gap: 5 },
  rotuloBarra: { flexDirection: "row", alignItems: "center", gap: 6 },
  ponto: { width: 9, height: 9, borderRadius: 3 },
  rotulo: { fontSize: 12 },
  valorBarra: { fontSize: 12, fontWeight: "600" },
  trilho: { height: 15, borderRadius: 4, overflow: "hidden", position: "relative" },
  preenchimento: { position: "absolute", top: 0, bottom: 0 },
  eixoZero: { position: "absolute", top: 0, bottom: 0, width: 1 },
});
