import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { useTheme } from "@/hooks/use-theme";
import { apiFetch } from "@/services/api";

type Tipo = "receita" | "despesa";
type Categoria = { id: number; name: string };
type Aba = "novo" | "historico";
type Filtros = { tipo: "todos" | Tipo; categoria: string; inicio: string; fim: string };
type Lancamento = { id: number; category_id: number | null; event_id: number | null; entry_type: Tipo; amount: number | string; description: string | null; occurred_at: string; category_name: string | null; event_name: string | null };
type Historico = { entries: Lancamento[]; page: number; has_more: boolean; total_count: number; income: number | string; expenses: number | string; balance: number | string };
type Payload = { category_id: number; entry_type: Tipo; amount: number; description: string | null };
const VAZIO: Filtros = { tipo: "todos", categoria: "", inicio: "", fim: "" };
const CORES = { receita: "#0D9868", despesa: "#DC5252", azul: "#6A95C7" };
const moeda = (v: number | string) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const erroTexto = (e: unknown, fallback: string) => e instanceof Error ? e.message : fallback;

function emCentavos(valor: string): number | null {
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(valor.trim())) return null;
  const [i, d = ""] = valor.trim().replace(",", ".").split(".");
  const n = Number(i) * 100 + Number(d.padEnd(2, "0"));
  return Number.isSafeInteger(n) && n > 0 && n <= 999999999999 ? n : null;
}

// Vazio = sem limite. Formato de entrada brasileiro, convertido para ISO.
function dataISO(valor: string): string | null {
  const s = valor.trim();
  if (!s) return "";
  const m = /^(\d{2})\/(\d{2})\/([1-9]\d{3})$/.exec(s);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(iso + "T00:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : null;
}
function dataHora(valor: string) {
  const d = new Date(valor);
  return Number.isFinite(d.getTime()) ? d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }) : "Data indisponível";
}

function Botao({ label, onPress, disabled = false, secundario = false }: {
  label: string; onPress: () => void; disabled?: boolean; secundario?: boolean;
}) {
  const theme = useTheme();
  return <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} activeOpacity={0.7}
    style={[styles.botao, { backgroundColor: secundario ? theme.background : CORES.azul, borderColor: secundario ? theme.backgroundSelected : CORES.azul, opacity: disabled ? 0.45 : 1 }]}>
    <ThemedText style={[styles.botaoTexto, { color: secundario ? theme.text : "#FFFFFF" }]}>{label}</ThemedText>
  </TouchableOpacity>;
}
function Opcoes<T extends string>({ itens, valor, onChange, disabled = false }: {
  itens: { valor: T; label: string }[]; valor: T; onChange: (v: T) => void; disabled?: boolean;
}) {
  const theme = useTheme();
  return <View style={styles.opcoes}>{itens.map(item => <TouchableOpacity key={item.valor} accessibilityRole="button" accessibilityState={{ selected: valor === item.valor, disabled }} disabled={disabled} onPress={() => onChange(item.valor)}
    style={[styles.opcao, { backgroundColor: valor === item.valor ? CORES.azul : theme.background, borderColor: valor === item.valor ? CORES.azul : theme.backgroundSelected, opacity: disabled ? 0.6 : 1 }]}>
    <ThemedText style={[styles.opcaoTexto, { color: valor === item.valor ? "#FFFFFF" : theme.text }]}>{item.label}</ThemedText>
  </TouchableOpacity>)}</View>;
}
function SeletorCategoria({ categorias, valor, onChange, vazio, disabled = false }: { categorias: Categoria[]; valor: string; onChange: (v: string) => void; vazio: string; disabled?: boolean }) {
  const theme = useTheme();
  return <View style={[styles.pickerBox, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
    <Picker selectedValue={valor} enabled={!disabled} onValueChange={v => onChange(String(v))} style={[styles.picker, { color: theme.text, backgroundColor: theme.background }]}>
      <Picker.Item label={vazio} value="" />
      {categorias.map(c => <Picker.Item key={c.id} label={c.name} value={String(c.id)} />)}
    </Picker>
  </View>;
}
function Linha({ label, valor, cor }: { label: string; valor: number | string; cor: string }) {
  return <View style={styles.linha}><ThemedText style={styles.rotulo}>{label}</ThemedText><ThemedText style={[styles.valor, { color: cor }]}>{moeda(valor)}</ThemedText></View>;
}

function NovoLancamento({ categorias, pronto, salvando, setSalvando, irHistorico }: { categorias: Categoria[]; pronto: boolean; salvando: boolean; setSalvando: (v: boolean) => void; irHistorico: () => void }) {
  const theme = useTheme();
  const [tipo, setTipo] = useState<Tipo>("receita");
  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [confirmacao, setConfirmacao] = useState<Payload | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [incerto, setIncerto] = useState(false);
  const enviando = useRef(false);
  const bloqueado = salvando || !!confirmacao || incerto;
  const card = [styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }];
  const campo = { backgroundColor: theme.background, borderColor: theme.backgroundSelected };
  const selecionada = categorias.find(c => String(c.id) === categoria);
  function preparar() {
    if (enviando.current || bloqueado || !pronto) return;
    setErro(null); setSucesso(null);
    const centavos = emCentavos(valor);
    if (!selecionada) { setErro("Selecione uma categoria."); return; }
    if (centavos === null) { setErro("Informe um valor positivo, com até duas casas decimais e sem separador de milhares."); return; }
    setConfirmacao({ category_id: selecionada.id, entry_type: tipo, amount: centavos / 100, description: descricao.trim() || null });
  }
  async function registrar() {
    if (!confirmacao || enviando.current || !pronto) return;
    enviando.current = true; setSalvando(true); setErro(null); setSucesso(null);
    const payload = confirmacao;
    let resultadoIncerto = true;
    try {
      const resposta = await apiFetch("/financial/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        resultadoIncerto = resposta.status >= 500;
        throw new Error(typeof dados?.error === "string" ? dados.error : "Não foi possível registrar o lançamento.");
      }
      if (!dados || !Number.isSafeInteger(Number(dados.id)) || Number(dados.id) <= 0) throw new Error("Resposta de confirmação inválida.");
      resultadoIncerto = false;
      setSucesso(`${payload.entry_type === "receita" ? "Receita" : "Despesa"} de ${moeda(payload.amount)} registrada com sucesso.`);
      setCategoria(""); setValor(""); setDescricao("");
    } catch (e) {
      if (resultadoIncerto) {
        setIncerto(true);
        setErro("Não foi possível confirmar o resultado. Consulte o histórico antes de registrar novamente, para evitar duplicidade.");
      } else setErro(erroTexto(e, "Erro ao registrar lançamento."));
    } finally {
      setConfirmacao(null); enviando.current = false; setSalvando(false);
    }
  }
  return <>
    <View style={card}>
      <ThemedText style={styles.secao}>Novo lançamento independente</ThemedText>
      <ThemedText style={[styles.nota, { color: theme.textSecondary }]}>Para doações, compras, contas e outros valores não vinculados a eventos. A data e o responsável são registrados automaticamente.</ThemedText>
      <ThemedText style={styles.rotulo}>Tipo de lançamento</ThemedText>
      <Opcoes<Tipo> itens={[{ valor: "receita", label: "Receita" }, { valor: "despesa", label: "Despesa" }]} valor={tipo} onChange={setTipo} disabled={bloqueado} />
      <ThemedText style={styles.rotulo}>Categoria</ThemedText>
      <SeletorCategoria categorias={categorias} valor={categoria} onChange={setCategoria} vazio="Selecione uma categoria" disabled={bloqueado || !pronto} />
      <ThemedText style={styles.rotulo}>Valor (R$)</ThemedText>
      <ThemedTextInput style={[styles.input, campo]} placeholder="Ex.: 150,50" keyboardType="decimal-pad" value={valor} onChangeText={setValor} editable={!bloqueado} />
      <ThemedText style={styles.rotulo}>Descrição (opcional)</ThemedText>
      <ThemedTextInput style={[styles.input, styles.multiline, campo]} placeholder="Ex.: pagamento da conta de energia" value={descricao} onChangeText={setDescricao} editable={!bloqueado} maxLength={500} multiline />
      {erro && <ThemedText style={styles.erro}>{erro}</ThemedText>}
      {sucesso && <ThemedText style={styles.sucesso}>{sucesso}</ThemedText>}
      {!confirmacao && !incerto && <Botao label="Revisar lançamento" onPress={preparar} disabled={!pronto || categorias.length === 0 || salvando} />}
      {incerto && <Botao label="Consultar histórico antes de repetir" onPress={irHistorico} />}
    </View>
    {confirmacao && <View style={card}>
      <ThemedText style={styles.secao}>Confirmar lançamento?</ThemedText>
      <ThemedText>{confirmacao.entry_type === "receita" ? "Receita" : "Despesa"} • {selecionada?.name ?? "Categoria"}</ThemedText>
      <ThemedText style={[styles.total, { color: CORES[confirmacao.entry_type] }]}>{moeda(confirmacao.amount)}</ThemedText>
      {!!confirmacao.description && <ThemedText>{confirmacao.description}</ThemedText>}
      <ThemedText style={[styles.nota, { color: theme.textSecondary }]}>Este valor será incluído no balanço geral, sem associação a um evento.</ThemedText>
      <Botao label={salvando ? "Registrando..." : "Confirmar lançamento"} onPress={() => void registrar()} disabled={salvando || !pronto} />
      <Botao label="Voltar e revisar" onPress={() => setConfirmacao(null)} secundario disabled={salvando} />
    </View>}
    <ThemedText style={[styles.nota, { color: theme.textSecondary }]}>Uma compra de estoque deve ser registrada no financeiro apenas uma vez. O registro financeiro não altera as quantidades em estoque.</ThemedText>
  </>;
}

function ListaHistorico({ categorias, pronto }: { categorias: Categoria[]; pronto: boolean }) {
  const theme = useTheme();
  const [rascunho, setRascunho] = useState<Filtros>({ ...VAZIO });
  const [filtros, setFiltros] = useState<Filtros>({ ...VAZIO });
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<Historico | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [erroFiltro, setErroFiltro] = useState<string | null>(null);
  const consulta = useRef(0);
  const card = [styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }];
  const campo = { backgroundColor: theme.background, borderColor: theme.backgroundSelected };
  const carregar = useCallback(async () => {
    const id = ++consulta.current;
    setCarregando(true); setErro(null);
    try {
      const parametros = [`page=${pagina}`, `type=${filtros.tipo}`];
      if (filtros.categoria) parametros.push(`category_id=${encodeURIComponent(filtros.categoria)}`);
      if (filtros.inicio) parametros.push(`from=${encodeURIComponent(filtros.inicio)}`);
      if (filtros.fim) parametros.push(`to=${encodeURIComponent(filtros.fim)}`);
      const resposta = await apiFetch(`/financial/entries?${parametros.join("&")}`);
      const json = await resposta.json().catch(() => null);
      if (!resposta.ok) throw new Error(typeof json?.error === "string" ? json.error : "Não foi possível consultar o histórico.");
      if (!json || !Array.isArray(json.entries) || json.page !== pagina || typeof json.has_more !== "boolean" || ![json.total_count, json.income, json.expenses, json.balance].every(v => v != null && Number.isFinite(Number(v)))) throw new Error("Resposta do histórico inválida.");
      if (id === consulta.current) setDados(json as Historico);
    } catch (e) { if (id === consulta.current) setErro(erroTexto(e, "Erro ao consultar histórico.")); }
    finally { if (id === consulta.current) setCarregando(false); }
  }, [filtros, pagina]);
  useFocusEffect(useCallback(() => { void carregar(); return () => { consulta.current += 1; }; }, [carregar]));
  function aplicar() {
    const inicio = dataISO(rascunho.inicio), fim = dataISO(rascunho.fim);
    if (inicio === null || fim === null) { setErroFiltro("Informe datas válidas no formato DD/MM/AAAA."); return; }
    if (inicio && fim && inicio > fim) { setErroFiltro("A data inicial não pode ser posterior à final."); return; }
    setErroFiltro(null); setCarregando(true); setDados(null); setPagina(1);
    setFiltros({ ...rascunho, inicio, fim });
  }
  function limpar() {
    setErroFiltro(null); setRascunho({ ...VAZIO }); setDados(null); setCarregando(true); setPagina(1); setFiltros({ ...VAZIO });
  }
  function mudarPagina(p: number) { setCarregando(true); setDados(null); setPagina(p); }
  return <>
    <View style={card}>
      <ThemedText style={styles.secao}>Filtros do histórico</ThemedText>
      <Opcoes<Filtros["tipo"]> itens={[{ valor: "todos", label: "Todos" }, { valor: "receita", label: "Receitas" }, { valor: "despesa", label: "Despesas" }]} valor={rascunho.tipo} onChange={v => setRascunho(r => ({ ...r, tipo: v }))} />
      <ThemedText style={styles.rotulo}>Categoria</ThemedText>
      <SeletorCategoria categorias={categorias} valor={rascunho.categoria} onChange={v => setRascunho(r => ({ ...r, categoria: v }))} vazio="Todas as categorias" disabled={!pronto} />
      <ThemedText style={styles.rotulo}>Data inicial (opcional)</ThemedText>
      <ThemedTextInput style={[styles.input, campo]} placeholder="DD/MM/AAAA" value={rascunho.inicio} onChangeText={v => setRascunho(r => ({ ...r, inicio: v }))} maxLength={10} />
      <ThemedText style={styles.rotulo}>Data final (opcional)</ThemedText>
      <ThemedTextInput style={[styles.input, campo]} placeholder="DD/MM/AAAA" value={rascunho.fim} onChangeText={v => setRascunho(r => ({ ...r, fim: v }))} maxLength={10} />
      {erroFiltro && <ThemedText style={styles.erro}>{erroFiltro}</ThemedText>}
      <Botao label="Aplicar filtros" onPress={aplicar} disabled={carregando} />
      <Botao label="Limpar filtros" onPress={limpar} secundario disabled={carregando} />
      <ThemedText style={[styles.nota, { color: theme.textSecondary }]}>Datas inclusivas, no horário de Brasília. Pressione Aplicar para atualizar os resultados.</ThemedText>
    </View>
    {carregando ? <ActivityIndicator size="large" color={theme.text} /> : erro ? <View style={card}><ThemedText style={styles.erro}>{erro}</ThemedText><Botao label="Tentar novamente" onPress={() => void carregar()} /></View> : dados && <>
      <View style={card}>
        <ThemedText style={styles.secao}>Totais dos filtros aplicados</ThemedText>
        <ThemedText style={[styles.nota, { color: theme.textSecondary }]}>{dados.total_count} lançamento(s) • todas as páginas</ThemedText>
        <Linha label="Receitas" valor={dados.income} cor={CORES.receita} />
        <Linha label="Despesas" valor={dados.expenses} cor={CORES.despesa} />
        <Linha label="Saldo dos registros filtrados" valor={dados.balance} cor={Number(dados.balance) < 0 ? CORES.despesa : CORES.receita} />
        <Botao label="Atualizar histórico" onPress={() => void carregar()} secundario />
      </View>
      {dados.entries.length === 0 && <View style={card}><ThemedText>Nenhum lançamento encontrado nesta página.</ThemedText></View>}
      {dados.entries.map(e => <View key={e.id} style={card}>
        <View style={styles.linha}>
          <ThemedText style={styles.secao}>{e.category_name ?? "Sem categoria"}</ThemedText>
          <ThemedText style={[styles.valor, { color: CORES[e.entry_type] }]}>{e.entry_type === "receita" ? "+" : "−"}{moeda(e.amount)}</ThemedText>
        </View>
        <ThemedText style={[styles.nota, { color: theme.textSecondary }]}>{e.entry_type === "receita" ? "Receita" : "Despesa"} • {dataHora(e.occurred_at)}</ThemedText>
        <ThemedText style={styles.rotulo}>{e.event_id == null ? "Lançamento independente" : `Evento: ${e.event_name ?? `#${e.event_id}`}`}</ThemedText>
        {!!e.description && <ThemedText>{e.description}</ThemedText>}
      </View>)}
      <View style={styles.opcoes}>
        <View style={styles.flex}><Botao label="Anterior" onPress={() => mudarPagina(pagina - 1)} disabled={pagina <= 1} secundario /></View>
        <View style={styles.flex}><Botao label="Próxima" onPress={() => mudarPagina(pagina + 1)} disabled={!dados.has_more} secundario /></View>
      </View>
      <ThemedText style={[styles.nota, { textAlign: "center", color: theme.textSecondary }]}>Página {pagina} • até 50 lançamentos por página</ThemedText>
    </>}
  </>;
}

export default function LancamentosFinanceiros() {
  const theme = useTheme();
  const [aba, setAba] = useState<Aba>("novo");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const consulta = useRef(0);
  const carregar = useCallback(async () => {
    const id = ++consulta.current;
    setCarregando(true); setErro(null);
    try {
      const resposta = await apiFetch("/financial-categories");
      const json = await resposta.json().catch(() => null);
      if (!resposta.ok || !Array.isArray(json)) throw new Error(typeof json?.error === "string" ? json.error : "Não foi possível consultar as categorias.");
      if (!json.every(c => c && Number.isSafeInteger(Number(c.id)) && Number(c.id) > 0 && typeof c.name === "string")) throw new Error("Categorias financeiras inválidas.");
      if (id === consulta.current) setCategorias(json.map(c => ({ id: Number(c.id), name: c.name })));
    } catch (e) { if (id === consulta.current) setErro(erroTexto(e, "Erro ao consultar categorias.")); }
    finally { if (id === consulta.current) setCarregando(false); }
  }, []);
  useFocusEffect(useCallback(() => { void carregar(); return () => { consulta.current += 1; }; }, [carregar]));
  const pronto = !carregando && !erro;
  return <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
    <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.backgroundSelected }]}>
      <ThemedText style={styles.titulo}>Lançamentos financeiros</ThemedText>
      <ThemedText style={[styles.nota, { color: theme.textSecondary }]}>Registre e consulte receitas e despesas.</ThemedText>
      <Opcoes<Aba> itens={[{ valor: "novo", label: "Novo lançamento" }, { valor: "historico", label: "Histórico" }]} valor={aba} onChange={setAba} disabled={salvando} />
    </View>
    <ScrollView key={aba} contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {carregando && <ActivityIndicator size="small" color={theme.text} />}
      {erro && <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}><ThemedText style={styles.erro}>{erro}</ThemedText><Botao label="Recarregar categorias" onPress={() => void carregar()} /></View>}
      {pronto && categorias.length === 0 && <ThemedText style={styles.nota}>Nenhuma categoria financeira cadastrada.</ThemedText>}
      {aba === "novo" ? <NovoLancamento categorias={categorias} pronto={pronto} salvando={salvando} setSalvando={setSalvando} irHistorico={() => setAba("historico")} /> : <ListaHistorico categorias={categorias} pronto={pronto} />}
    </ScrollView>
  </ThemedView>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  titulo: { fontSize: 24, fontWeight: "700", lineHeight: 30 },
  conteudo: { padding: 20, paddingBottom: 30, gap: 14 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  secao: { fontSize: 16, fontWeight: "700", flexShrink: 1 },
  rotulo: { fontSize: 13, fontWeight: "500", flexShrink: 1 },
  nota: { fontSize: 12, lineHeight: 18 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  multiline: { minHeight: 84, textAlignVertical: "top" },
  pickerBox: { minHeight: 44, borderWidth: 1, borderRadius: 12, justifyContent: "center", overflow: "hidden" },
  picker: { width: "100%", height: 54 },
  botao: { minHeight: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", padding: 10 },
  botaoTexto: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  opcoes: { flexDirection: "row", gap: 6 },
  opcao: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", padding: 8 },
  opcaoTexto: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  linha: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  valor: { fontSize: 14, fontWeight: "700" },
  total: { fontSize: 25, fontWeight: "700", lineHeight: 34 },
  erro: { color: "#DC2626", fontSize: 13 },
  sucesso: { color: "#0D9868", fontSize: 13 },
  flex: { flex: 1 },
});
