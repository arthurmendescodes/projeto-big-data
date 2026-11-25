import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { useTheme } from "@/hooks/use-theme";
import { apiFetch } from "@/services/api";

type Aba = "geral" | "consumo" | "compras" | "financeiro";
type Qualidade = "sem_eventos" | "incompleta" | "pouca_amostra" | "historico_disponivel";
type Historico = "sem_historico" | "pouca_amostra" | "historico_disponivel";
type Situacao = "insuficiente" | "abaixo_reserva" | "indeterminado" | "suficiente";
type Periodo = { as_of: string; start_date: string; end_date: string; timezone: string };
const CONTAGENS = ["scheduled_before_month", "scheduled_next_month", "events_without_history", "next_month_events_without_history", "events_with_small_sample", "overdue_scheduled_events"] as const;
const ESTOQUE_RESUMO = [...CONTAGENS, "products_below_minimum_now", "products_with_known_shortage", "products_with_known_purchase"] as const;
const FIN_RESUMO = [...CONTAGENS, "next_month_events_with_small_sample", "current_balance", "known_income_before_month", "known_expenses_before_month", "known_balance_before_month", "known_income_next_month", "known_expenses_next_month", "known_balance_next_month"] as const;
const FIN_NULOS = ["predicted_income_next_month", "predicted_expenses_next_month", "predicted_balance_next_month", "projected_balance_events_only"] as const;
type Numeros<K extends string> = Record<K, number>;
type Nulos<K extends string> = Record<K, number | null>;
type TipoEvento = {
  event_type_id: number; event_type_name: string; historical_events: number;
  scheduled_before_month: number; scheduled_next_month: number;
};
type TipoAgenda = TipoEvento & { history_status: Historico };
type MediaConsumo = TipoEvento & { average_consumption: number | null };
type Produto = {
  product_id: number; product_name: string; unit: string;
  current_stock: number; minimum_stock: number;
  known_consumption_before_month: number; known_consumption_next_month: number;
  predicted_consumption_next_month: number | null; projected_stock_end: number | null;
  minimum_purchase_known: number; recommended_purchase: number | null;
  forecast_quality: Qualidade; stock_status: Situacao;
  consumption_by_event_type: MediaConsumo[];
};
const FIN_TIPO_NULOS = ["average_income", "average_expenses", "predicted_income_before_month", "predicted_expenses_before_month", "predicted_income_next_month", "predicted_expenses_next_month", "predicted_balance_next_month"] as const;
type TipoFinanceiro = TipoAgenda & Nulos<typeof FIN_TIPO_NULOS[number]>;
type Estoque = { period: Periodo; summary: Numeros<typeof ESTOQUE_RESUMO[number]>; event_types: TipoAgenda[]; products: Produto[] };
type Financeiro = { period: Periodo; summary: Numeros<typeof FIN_RESUMO[number]> & Nulos<typeof FIN_NULOS[number]> & { forecast_quality: Qualidade }; event_types: TipoFinanceiro[] };
type Dados = { estoque: Estoque; financeiro: Financeiro };

const ABAS: { valor: Aba; label: string }[] = [
  { valor: "geral", label: "Visão geral" }, { valor: "consumo", label: "Consumo" },
  { valor: "compras", label: "Compras" }, { valor: "financeiro", label: "Financeiro" },
];
const CORES = { azul: "#6A95C7", verde: "#0D9868", vermelho: "#DC5252", laranja: "#B7791F", cinza: "#8190A8" };
const QUALIDADE: Record<Qualidade, string> = {
  sem_eventos: "Sem eventos no período", incompleta: "Previsão incompleta",
  pouca_amostra: "Pouca amostra histórica", historico_disponivel: "Histórico disponível",
};
const HISTORICO: Record<Historico, string> = { sem_historico: "Sem histórico", pouca_amostra: "Pouca amostra", historico_disponivel: "Histórico disponível" };
const SITUACAO: Record<Situacao, string> = { insuficiente: "Estoque insuficiente na estimativa", abaixo_reserva: "Reserva comprometida na estimativa", indeterminado: "Situação indeterminada", suficiente: "Estoque suficiente na estimativa" };
const PRIORIDADE: Record<Situacao, number> = { insuficiente: 0, abaixo_reserva: 1, indeterminado: 2, suficiente: 3 };
const corSituacao = (s: Situacao) => s === "insuficiente" ? CORES.vermelho : s === "abaixo_reserva" ? CORES.laranja : s === "indeterminado" ? CORES.cinza : CORES.verde;
const corSaldo = (v: number | null) => v === null ? undefined : v < 0 ? CORES.vermelho : v > 0 ? CORES.verde : undefined;
const num = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
const qtd = (v: number | null, unidade: string) => v === null ? "Indeterminada" : `${num(v)} ${unidade}`;
const moeda = (v: number | null) => v === null ? "Indeterminado" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number): `${number}%` => `${Math.min(100, Math.max(0, v))}%`;
const normalizar = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const dataBR = (v: string) => v.split("-").reverse().join("/");
function mesBR(v: string) {
  const [ano, mes] = v.split("-").map(Number);
  return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

// Validamos o contrato real das duas RPCs; null não é convertido em zero.
function obj(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Resposta do SAD inválida.");
  return v as Record<string, unknown>;
}
function numero(v: unknown): number {
  if ((typeof v !== "number" && typeof v !== "string") || (typeof v === "string" && !v.trim()) || !Number.isFinite(Number(v))) throw new Error("Valor numérico do SAD inválido.");
  return Number(v);
}
function nulo(v: unknown): number | null { return v === null ? null : numero(v); }
function texto(v: unknown): string { if (typeof v !== "string") throw new Error("Texto do SAD inválido."); return v; }
function lista(v: unknown): unknown[] { if (!Array.isArray(v)) throw new Error("Lista do SAD inválida."); return v; }
function numericos<K extends string>(o: Record<string, unknown>, chaves: readonly K[]): Numeros<K> {
  const r = {} as Numeros<K>;
  for (const k of chaves) r[k] = numero(o[k]);
  return r;
}
function nullable<K extends string>(o: Record<string, unknown>, chaves: readonly K[]): Nulos<K> {
  const r = {} as Nulos<K>;
  for (const k of chaves) r[k] = nulo(o[k]);
  return r;
}
function enumValor<K extends string>(v: unknown, opcoes: Record<K, string>): K {
  if (typeof v !== "string" || !Object.prototype.hasOwnProperty.call(opcoes, v)) throw new Error("Classificação do SAD inválida.");
  return v as K;
}
function periodo(v: unknown): Periodo {
  const p = obj(v);
  const r = { as_of: texto(p.as_of), start_date: texto(p.start_date), end_date: texto(p.end_date), timezone: texto(p.timezone) };
  if (![r.as_of, r.start_date, r.end_date].every(d => /^\d{4}-\d{2}-\d{2}$/.test(d))) throw new Error("Período do SAD inválido.");
  return r;
}
function tipoBase(t: Record<string, unknown>): TipoEvento {
  return { ...numericos(t, ["event_type_id", "historical_events", "scheduled_before_month", "scheduled_next_month"] as const), event_type_name: texto(t.event_type_name) };
}
function tipoAgenda(t: Record<string, unknown>): TipoAgenda { return { ...tipoBase(t), history_status: enumValor(t.history_status, HISTORICO) }; }
function interpretarEstoque(v: unknown): Estoque {
  const d = obj(v);
  return {
    period: periodo(d.period), summary: numericos(obj(d.summary), ESTOQUE_RESUMO),
    event_types: lista(d.event_types).map(v => tipoAgenda(obj(v))),
    products: lista(d.products).map(v => {
      const p = obj(v);
      return {
        ...numericos(p, ["product_id", "current_stock", "minimum_stock", "known_consumption_before_month", "known_consumption_next_month", "minimum_purchase_known"] as const),
        ...nullable(p, ["predicted_consumption_next_month", "projected_stock_end", "recommended_purchase"] as const),
        product_name: texto(p.product_name), unit: texto(p.unit),
        stock_status: enumValor(p.stock_status, SITUACAO), forecast_quality: enumValor(p.forecast_quality, QUALIDADE),
        consumption_by_event_type: lista(p.consumption_by_event_type).map(v => { const t = obj(v); return { ...tipoBase(t), average_consumption: nulo(t.average_consumption) }; }),
      };
    }),
  };
}
function interpretarFinanceiro(v: unknown): Financeiro {
  const d = obj(v); const s = obj(d.summary);
  return { period: periodo(d.period), summary: { ...numericos(s, FIN_RESUMO), ...nullable(s, FIN_NULOS), forecast_quality: enumValor(s.forecast_quality, QUALIDADE) },
    event_types: lista(d.event_types).map(v => { const t = obj(v); return { ...tipoAgenda(t), ...nullable(t, FIN_TIPO_NULOS) }; }) };
}
async function consultar(rota: string): Promise<unknown> {
  const r = await apiFetch(rota);
  const json = await r.json().catch(() => null);
  if (!r.ok) throw new Error(typeof json?.error === "string" ? json.error : `Não foi possível consultar ${rota}.`);
  return json;
}

function Card({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>{children}</View>;
}
function Nota({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <ThemedText style={[styles.nota, { color: theme.textSecondary }]}>{children}</ThemedText>;
}
function Linha({ label, valor, cor }: { label: string; valor: string; cor?: string }) {
  return <View style={styles.linha}><ThemedText style={styles.rotulo}>{label}</ThemedText><ThemedText style={[styles.valor, cor ? { color: cor } : undefined]}>{valor}</ThemedText></View>;
}
function Botao({ label, onPress }: { label: string; onPress: () => void }) {
  return <TouchableOpacity accessibilityRole="button" style={styles.botao} onPress={onPress} activeOpacity={0.7}><ThemedText style={styles.botaoTexto}>{label}</ThemedText></TouchableOpacity>;
}
function Barra({ label, valor, formatar, maximo, cor }: { label: string; valor: number | null; formatar: (v: number | null) => string; maximo: number; cor: string }) {
  const theme = useTheme();
  return <View style={styles.barraGrupo}>
    <Linha label={label} valor={formatar(valor)} />
    {valor !== null && valor >= 0 && <View style={[styles.trilho, { backgroundColor: theme.backgroundSelected }]}><View style={[styles.preenchimento, { width: pct(valor / Math.max(maximo, 0.0001) * 100), backgroundColor: cor }]} /></View>}
  </View>;
}
function Indicador({ label, valor, cor }: { label: string; valor: string; cor?: string }) {
  const theme = useTheme();
  return <View style={[styles.indicador, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
    <Nota>{label}</Nota><ThemedText style={[styles.destaque, cor ? { color: cor } : undefined]}>{valor}</ThemedText>
  </View>;
}
function QualidadeTipo({ t }: { t: TipoAgenda }) {
  return <Nota>{t.historical_events} evento(s) realizado(s) no histórico · {HISTORICO[t.history_status]}</Nota>;
}
function ProdutoConsumo({ p }: { p: Produto }) {
  const theme = useTheme();
  const [aberto, setAberto] = useState(false);
  const maximo = Math.max(p.current_stock, p.known_consumption_before_month, p.known_consumption_next_month, p.minimum_stock, 0.0001);
  const formatar = (v: number | null) => qtd(v, p.unit);
  return <Card>
    <ThemedText style={styles.secao}>{p.product_name}</ThemedText>
    <ThemedText style={[styles.valor, { color: corSituacao(p.stock_status) }]}>{SITUACAO[p.stock_status]}</ThemedText>
    <Nota>{QUALIDADE[p.forecast_quality]}</Nota>
    <Barra label="Estoque atual" valor={p.current_stock} formatar={formatar} maximo={maximo} cor={CORES.azul} />
    <Barra label="Consumo estimado até o fim deste mês (parte conhecida)" valor={p.known_consumption_before_month} formatar={formatar} maximo={maximo} cor={CORES.laranja} />
    <Barra label={p.predicted_consumption_next_month === null ? "Próximo mês (estimativa parcial)" : "Consumo previsto no próximo mês"} valor={p.known_consumption_next_month} formatar={formatar} maximo={maximo} cor={CORES.laranja} />
    {p.predicted_consumption_next_month === null && <Nota>Consumo total do próximo mês indeterminado.</Nota>}
    <Linha label="Reserva mínima" valor={formatar(p.minimum_stock)} />
    <Linha label="Estoque final projetado (sem reposição)" valor={formatar(p.projected_stock_end)} cor={p.projected_stock_end !== null && p.projected_stock_end < 0 ? CORES.vermelho : undefined} />
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: aberto }} style={[styles.expansao, { borderColor: theme.backgroundSelected }]} onPress={() => setAberto(a => !a)}>
      <ThemedText style={styles.valor}>{aberto ? "Ocultar médias por evento" : "Ver médias por evento"}</ThemedText>{aberto ? <ChevronUp size={18} color={theme.text} /> : <ChevronDown size={18} color={theme.text} />}
    </TouchableOpacity>
    {aberto && (p.consumption_by_event_type.length === 0 ? <Nota>Nenhum tipo de evento agendado no horizonte.</Nota> : p.consumption_by_event_type.map(t => <View key={t.event_type_id} style={[styles.detalhe, { borderColor: theme.backgroundSelected }]}>
      <ThemedText style={styles.valor}>{t.event_type_name}</ThemedText>
      <Linha label="Média por evento" valor={formatar(t.average_consumption)} />
      <Nota>{t.historical_events} amostra(s) · {t.scheduled_before_month} restante(s) neste mês · {t.scheduled_next_month} no próximo mês</Nota>
      {t.historical_events < 3 && <Nota>{t.historical_events === 0 ? "Sem histórico; não significa consumo zero." : "Pouca amostra: estimativa sujeita a variação."}</Nota>}
    </View>))}
  </Card>;
}
function ProdutoCompra({ p }: { p: Produto }) {
  const parcial = p.recommended_purchase === null;
  return <Card>
    <ThemedText style={styles.secao}>{p.product_name}</ThemedText>
    <ThemedText style={[styles.valor, { color: corSituacao(p.stock_status) }]}>{SITUACAO[p.stock_status]}</ThemedText>
    <Nota>{parcial ? "Reposição estimada para a demanda conhecida" : "Reposição recomendada"}</Nota>
    <ThemedText style={[styles.grande, { color: corSituacao(p.stock_status) }]}>{qtd(parcial ? p.minimum_purchase_known : p.recommended_purchase, p.unit)}</ThemedText>
    {parcial && <Nota>Recomendação total indeterminada; revise os eventos sem histórico antes de comprar.</Nota>}
    <Linha label="Estoque atual" valor={qtd(p.current_stock, p.unit)} />
    <Linha label="Consumo estimado até o fim deste mês (parte conhecida)" valor={qtd(p.known_consumption_before_month, p.unit)} />
    <Linha label="Próximo mês (parte conhecida)" valor={qtd(p.known_consumption_next_month, p.unit)} />
    <Linha label="Reserva mínima" valor={qtd(p.minimum_stock, p.unit)} />
    <Nota>{QUALIDADE[p.forecast_quality]}</Nota>
  </Card>;
}

export default function Dashboard() {
  const theme = useTheme();
  const [aba, setAba] = useState<Aba>("geral");
  const [dados, setDados] = useState<Dados | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [somenteAlertas, setSomenteAlertas] = useState(false);
  const consultaAtual = useRef(0);

  const carregar = useCallback(async () => {
    const id = ++consultaAtual.current;
    setCarregando(true); setErro(null);
    try {
      const [e, f] = await Promise.all([consultar("/sad/stock-forecast"), consultar("/sad/financial-forecast")]);
      const estoque = interpretarEstoque(e); const financeiro = interpretarFinanceiro(f);
      if (estoque.period.as_of !== financeiro.period.as_of || estoque.period.start_date !== financeiro.period.start_date || estoque.period.end_date !== financeiro.period.end_date) throw new Error("Os períodos das previsões não coincidem. Atualize novamente.");
      if (consultaAtual.current === id) setDados({ estoque, financeiro });
    } catch (e) {
      if (consultaAtual.current === id) { setDados(null); setErro(e instanceof Error ? e.message : "Erro ao consultar o SAD."); }
    } finally { if (consultaAtual.current === id) setCarregando(false); }
  }, []);
  useFocusEffect(useCallback(() => { void carregar(); return () => { consultaAtual.current += 1; }; }, [carregar]));

  function mudarAba(v: Aba) { setAba(v); setBusca(""); setSomenteAlertas(false); }
  const estoque = dados?.estoque; const financeiro = dados?.financeiro;
  const es = estoque?.summary; const fs = financeiro?.summary;
  const produtos = [...(estoque?.products ?? [])].sort((a, b) => PRIORIDADE[a.stock_status] - PRIORIDADE[b.stock_status] || a.product_name.localeCompare(b.product_name));
  const compras = produtos.filter(p => p.minimum_purchase_known > 0);
  const indeterminados = produtos.filter(p => p.recommended_purchase === null && p.minimum_purchase_known === 0);
  const alertas = produtos.filter(p => p.minimum_purchase_known > 0);
  const pesquisa = normalizar(busca);
  const filtrar = (p: Produto) => normalizar(p.product_name).includes(pesquisa);
  const consumoVisivel = produtos.filter(p => filtrar(p) && (!somenteAlertas || p.stock_status !== "suficiente" || p.forecast_quality === "incompleta" || p.forecast_quality === "pouca_amostra"));
  const tiposFinanceiros = (financeiro?.event_types ?? []).filter(t => t.scheduled_next_month > 0).sort((a,b) => (b.predicted_expenses_next_month ?? -1) - (a.predicted_expenses_next_month ?? -1) || a.event_type_name.localeCompare(b.event_type_name));
  const escalaFinanceira = tiposFinanceiros.reduce((m,t) => Math.max(m,t.predicted_income_next_month ?? 0,t.predicted_expenses_next_month ?? 0), 0.01);

  return <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
    <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.backgroundSelected }]}>
      <View style={styles.headerLinha}>
        <View style={styles.headerTexto}><ThemedText style={styles.titulo}>Apoio à Decisão</ThemedText><Nota>Planejamento de estoque e recursos financeiros.</Nota></View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Atualizar previsões" disabled={carregando} onPress={() => void carregar()} style={[styles.atualizar, { borderColor: theme.backgroundSelected, opacity: carregando ? 0.5 : 1 }]}><RefreshCw size={20} color={theme.text} /></TouchableOpacity>
      </View>
      <View style={styles.abas}>{ABAS.map(a => <TouchableOpacity key={a.valor} accessibilityRole="button" accessibilityState={{ selected: aba === a.valor }} onPress={() => mudarAba(a.valor)} style={[styles.aba, { backgroundColor: aba === a.valor ? CORES.azul : theme.background, borderColor: aba === a.valor ? CORES.azul : theme.backgroundSelected }]}><ThemedText style={[styles.abaTexto, { color: aba === a.valor ? "#FFFFFF" : theme.text }]}>{a.label}</ThemedText></TouchableOpacity>)}</View>
    </View>
    <ScrollView key={aba} contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {carregando ? <View style={styles.estado}><ActivityIndicator size="large" color={theme.text} /><ThemedText>Calculando previsões...</ThemedText></View> : erro ? <Card><ThemedText style={styles.secao}>Não foi possível carregar o SAD</ThemedText><ThemedText style={{ color: CORES.vermelho }}>{erro}</ThemedText><Botao label="Tentar novamente" onPress={() => void carregar()} /></Card> : estoque && financeiro && es && fs ? <>
        <Card><ThemedText style={styles.secao}>Previsão para {mesBR(estoque.period.start_date)}</ThemedText><Nota>{dataBR(estoque.period.start_date)} a {dataBR(estoque.period.end_date)} · Referência: {dataBR(estoque.period.as_of)}</Nota><Nota>Estoque e saldo projetados consideram também os eventos restantes deste mês.</Nota></Card>
        {es.events_without_history > 0 && <Card><ThemedText style={[styles.secao, { color: CORES.laranja }]}>Previsões incompletas</ThemedText><ThemedText>{es.events_without_history} evento(s) até o fim do próximo mês sem histórico do tipo, sendo {es.next_month_events_without_history} no próximo mês. Valores parciais não representam a demanda total.</ThemedText></Card>}
        {aba === "geral" && <>
          <Card><Nota>Balanço atual registrado</Nota><ThemedText style={[styles.grande, { color: corSaldo(fs.current_balance) }]}>{moeda(fs.current_balance)}</ThemedText><Nota>Receitas menos despesas de todos os lançamentos.</Nota></Card>
          <View style={styles.grid}>
            <Indicador label="Eventos no próximo mês" valor={num(es.scheduled_next_month)} />
            <Indicador label="Eventos restantes neste mês" valor={num(es.scheduled_before_month)} />
            <Indicador label="Produtos abaixo do mínimo hoje" valor={num(es.products_below_minimum_now)} cor={es.products_below_minimum_now > 0 ? CORES.laranja : undefined} />
            <Indicador label="Falta estimada (parte conhecida)" valor={num(es.products_with_known_shortage)} cor={es.products_with_known_shortage > 0 ? CORES.vermelho : undefined} />
            <Indicador label="Produtos com reposição estimada" valor={num(es.products_with_known_purchase)} cor={es.products_with_known_purchase > 0 ? CORES.laranja : undefined} />
            <Indicador label="Resultado previsto dos eventos do próximo mês" valor={moeda(fs.predicted_balance_next_month)} cor={corSaldo(fs.predicted_balance_next_month)} />
          </View>
          <Card><ThemedText style={styles.secao}>Alertas prioritários</ThemedText>
            {es.overdue_scheduled_events > 0 && <ThemedText style={{ color: CORES.laranja }}>{es.overdue_scheduled_events} evento(s) agendado(s) com data anterior a hoje. Regularize-os; não entram na previsão.</ThemedText>}
            {es.events_with_small_sample > 0 && <Nota>{es.events_with_small_sample} evento(s) previstos com apenas 1 ou 2 amostras históricas do tipo.</Nota>}
            {fs.predicted_balance_next_month !== null && fs.predicted_balance_next_month < 0 && <ThemedText style={{ color: CORES.vermelho }}>Déficit previsto nos eventos do próximo mês: {moeda(-fs.predicted_balance_next_month)}.</ThemedText>}
            {fs.projected_balance_events_only !== null && fs.projected_balance_events_only < 0 && <ThemedText style={{ color: CORES.vermelho }}>Saldo projetado negativo, considerando apenas eventos futuros.</ThemedText>}
            {fs.projected_balance_events_only === null && <Nota>Saldo final indeterminado devido à falta de histórico.</Nota>}
            {alertas.slice(0, 3).map(p => <View key={p.product_id} style={[styles.detalhe, { borderColor: theme.backgroundSelected }]}><Linha label={p.product_name} valor={qtd(p.minimum_purchase_known, p.unit)} cor={corSituacao(p.stock_status)} /><Nota>{SITUACAO[p.stock_status]} · {p.recommended_purchase === null ? "Reposição parcial estimada" : "Reposição recomendada"}</Nota></View>)}
            {alertas.length === 0 && <Nota>Nenhuma reposição indicada pela demanda conhecida. {es.events_without_history > 0 ? "Ainda há demanda indeterminada." : "Estimativas não garantem disponibilidade futura."}</Nota>}
            <Botao label="Ver recomendações de compra" onPress={() => mudarAba("compras")} />
          </Card>
          <Card><ThemedText style={styles.secao}>Agenda utilizada na previsão</ThemedText>{estoque.event_types.length === 0 ? <Nota>Nenhum evento agendado no horizonte.</Nota> : estoque.event_types.map(t => <View key={t.event_type_id} style={[styles.detalhe, { borderColor: theme.backgroundSelected }]}><ThemedText style={styles.valor}>{t.event_type_name}</ThemedText><Linha label="Restantes neste mês" valor={num(t.scheduled_before_month)} /><Linha label="Próximo mês" valor={num(t.scheduled_next_month)} /><QualidadeTipo t={t} /></View>)}</Card>
        </>}
        {aba === "consumo" && <>
          <Card><ThemedText style={styles.secao}>Consumo por produto</ThemedText><Nota>As barras usam uma escala por produto; unidades diferentes não são comparadas entre si.</Nota>
            <ThemedTextInput style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.background }]} placeholder="Pesquisar produto..." value={busca} onChangeText={setBusca} />
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: somenteAlertas }} onPress={() => setSomenteAlertas(v => !v)} style={[styles.filtro, { borderColor: theme.backgroundSelected, backgroundColor: somenteAlertas ? CORES.azul : theme.background }]}><ThemedText style={[styles.abaTexto, { color: somenteAlertas ? "#FFFFFF" : theme.text }]}>{somenteAlertas ? "Mostrando somente alertas" : "Mostrar somente alertas"}</ThemedText></TouchableOpacity>
            <Nota>{consumoVisivel.length} de {produtos.length} produto(s)</Nota>
          </Card>
          {consumoVisivel.length === 0 ? <Card><Nota>Nenhum produto encontrado.</Nota></Card> : consumoVisivel.map(p => <ProdutoConsumo key={p.product_id} p={p} />)}
        </>}
        {aba === "compras" && <>
          <Card><ThemedText style={styles.secao}>Lista de reposição recomendada</ThemedText><Nota>Considera a demanda estimada desde hoje até o fim do próximo mês, mais a reserva mínima, descontando o estoque atual.</Nota><ThemedTextInput style={[styles.input, { borderColor: theme.backgroundSelected, backgroundColor: theme.background }]} placeholder="Pesquisar produto..." value={busca} onChangeText={setBusca} /><Nota>{compras.filter(filtrar).length} de {compras.length} produto(s) com reposição estimada positiva.</Nota></Card>
          {compras.filter(filtrar).length === 0 ? <Card><Nota>Nenhuma reposição positiva encontrada para esta pesquisa.</Nota></Card> : compras.filter(filtrar).map(p => <ProdutoCompra key={p.product_id} p={p} />)}
          {indeterminados.filter(filtrar).length > 0 && <Card><ThemedText style={styles.secao}>Demanda a verificar</ThemedText><Nota>Estes produtos não apresentam reposição positiva na parte conhecida, mas a recomendação completa é indeterminada.</Nota>{indeterminados.filter(filtrar).map(p => <Linha key={p.product_id} label={p.product_name} valor="Indeterminada" />)}</Card>}
          <Nota>As recomendações não efetuam compras nem alteram o estoque. Ajuste quantidades às embalagens e unidades inteiras quando necessário.</Nota>
        </>}
        {aba === "financeiro" && <>
          <Card><ThemedText style={styles.secao}>Resultado previsto do próximo mês</ThemedText><Nota>{QUALIDADE[fs.forecast_quality]} · somente eventos agendados</Nota>
            {fs.scheduled_next_month === 0 && <Nota>Nenhum evento agendado para o próximo mês.</Nota>}
            <Barra label={fs.predicted_income_next_month === null ? "Receita estimada (parte conhecida)" : "Receita prevista"} valor={fs.known_income_next_month} formatar={moeda} maximo={Math.max(fs.known_income_next_month, fs.known_expenses_next_month, 0.01)} cor={CORES.verde} />
            <Barra label={fs.predicted_expenses_next_month === null ? "Despesa estimada (parte conhecida)" : "Despesa prevista"} valor={fs.known_expenses_next_month} formatar={moeda} maximo={Math.max(fs.known_income_next_month, fs.known_expenses_next_month, 0.01)} cor={CORES.vermelho} />
            <Nota>{fs.predicted_balance_next_month === null ? "Resultado parcial dos eventos com histórico" : "Saldo estimado dos eventos"}</Nota><ThemedText style={[styles.grande, { color: corSaldo(fs.predicted_balance_next_month ?? fs.known_balance_next_month) }]}>{moeda(fs.predicted_balance_next_month ?? fs.known_balance_next_month)}</ThemedText>
            {fs.predicted_balance_next_month === null && <Nota>Resultado total indeterminado: o saldo parcial não é limite mínimo nem máximo do saldo real.</Nota>}
          </Card>
          <Card><ThemedText style={styles.secao}>Projeção do balanço</ThemedText><Linha label="Balanço atual registrado" valor={moeda(fs.current_balance)} />
            <Linha label="Resultado estimado dos eventos restantes deste mês (parte conhecida)" valor={moeda(fs.known_balance_before_month)} cor={corSaldo(fs.known_balance_before_month)} />
            <Linha label="Resultado do próximo mês (parte conhecida)" valor={moeda(fs.known_balance_next_month)} cor={corSaldo(fs.known_balance_next_month)} />
            <Nota>Saldo projetado até {dataBR(financeiro.period.end_date)}</Nota><ThemedText style={[styles.grande, { color: corSaldo(fs.projected_balance_events_only) }]}>{moeda(fs.projected_balance_events_only)}</ThemedText>
            <Nota>Somente eventos futuros: não inclui contas, compras, doações espontâneas ou outros lançamentos independentes futuros. Não representa uma projeção completa do caixa.</Nota>
          </Card>
          <Card><ThemedText style={styles.secao}>Previsão por tipo de evento</ThemedText><Nota>Próximo mês · ordenado pela maior despesa estimada. Barras com a mesma escala em reais.</Nota>{fs.next_month_events_with_small_sample > 0 && <Nota>{fs.next_month_events_with_small_sample} evento(s) com pouca amostra histórica.</Nota>}</Card>
          {tiposFinanceiros.length === 0 ? <Card><Nota>Nenhum evento previsto para o próximo mês.</Nota></Card> : tiposFinanceiros.map(t => <Card key={t.event_type_id}><ThemedText style={styles.secao}>{t.event_type_name}</ThemedText><Nota>{t.scheduled_next_month} evento(s) previsto(s)</Nota><QualidadeTipo t={t} />
            <Linha label="Receita média por evento" valor={moeda(t.average_income)} /><Linha label="Despesa média por evento" valor={moeda(t.average_expenses)} />
            <Barra label="Receita prevista" valor={t.predicted_income_next_month} formatar={moeda} maximo={escalaFinanceira} cor={CORES.verde} /><Barra label="Despesa prevista" valor={t.predicted_expenses_next_month} formatar={moeda} maximo={escalaFinanceira} cor={CORES.vermelho} />
            <Linha label="Saldo previsto" valor={moeda(t.predicted_balance_next_month)} cor={corSaldo(t.predicted_balance_next_month)} />
          </Card>)}
        </>}
        <Nota>Modelo: média histórica por tipo de evento, incluindo eventos realizados sem consumo ou movimentação financeira. Três ou mais amostras indicam histórico disponível, não garantia de precisão.</Nota>
      </> : <Card><Nota>Nenhum dado disponível.</Nota></Card>}
    </ScrollView>
  </ThemedView>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  headerLinha: { flexDirection: "row", alignItems: "center", gap: 10 }, headerTexto: { flex: 1, gap: 4 }, titulo: { fontSize: 24, fontWeight: "700", lineHeight: 32 },
  atualizar: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  abas: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, aba: { flexGrow: 1, flexBasis: "45%", minHeight: 40, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", padding: 6 }, abaTexto: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  conteudo: { padding: 16, paddingBottom: 32, gap: 12 }, card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, indicador: { flexGrow: 1, flexBasis: "45%", borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  secao: { fontSize: 16, fontWeight: "700", lineHeight: 22 }, destaque: { fontSize: 19, fontWeight: "700", lineHeight: 26 }, grande: { fontSize: 26, fontWeight: "700", lineHeight: 34 },
  nota: { fontSize: 12, lineHeight: 18 }, linha: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }, rotulo: { fontSize: 13, flexShrink: 1, lineHeight: 19 }, valor: { fontSize: 13, fontWeight: "600", flexShrink: 1, lineHeight: 19 },
  botao: { minHeight: 44, backgroundColor: CORES.azul, borderRadius: 12, alignItems: "center", justifyContent: "center", padding: 10 }, botaoTexto: { color: "#FFFFFF", fontSize: 13, fontWeight: "600", textAlign: "center" },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 }, filtro: { minHeight: 42, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", padding: 8 },
  barraGrupo: { gap: 5 }, trilho: { height: 14, borderRadius: 4, overflow: "hidden" }, preenchimento: { height: "100%", borderRadius: 4 },
  expansao: { minHeight: 42, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, gap: 8 }, detalhe: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 6 }, estado: { paddingVertical: 40, alignItems: "center", gap: 12 },
});
