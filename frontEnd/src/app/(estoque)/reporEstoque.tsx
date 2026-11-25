import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { PackagePlus, RefreshCw } from "lucide-react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { useTheme } from "@/hooks/use-theme";
import { apiFetch } from "../../services/api";

type Produto = {
  product_id: number;
  product_name: string;
  unit: string;
  current_quantity: number | string;
};

type Entrada = { product_id: number; quantity: number; description: string | null };
const LIMITE_CENTESIMOS = 9999999999; // NUMERIC(10,2)

// Aceita ponto ou vírgula decimal, sem separador de milhares.
function quantidadeEmCentesimos(texto: string): number | null {
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(texto.trim())) return null;
  const [inteiro, decimal = ""] = texto.trim().replace(",", ".").split(".");
  const total = Number(inteiro) * 100 + Number(decimal.padEnd(2, "0"));
  return Number.isSafeInteger(total) && total > 0 && total <= LIMITE_CENTESIMOS ? total : null;
}

function formatarQuantidade(valor: number) {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export default function ReporEstoque() {
  const theme = useTheme();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [descricao, setDescricao] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erroConsulta, setErroConsulta] = useState<string | null>(null);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<Entrada | null>(null);
  const envioEmAndamento = useRef(false);
  const consultaAtual = useRef(0);

  const carregarProdutos = useCallback(async () => {
    if (envioEmAndamento.current) return;
    const consulta = ++consultaAtual.current;
    setCarregando(true);
    setErroConsulta(null);
    setConfirmacao(null);
    try {
      const resposta = await apiFetch("/stock");
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok || !Array.isArray(dados)) {
        throw new Error(typeof dados?.error === "string" ? dados.error : "Não foi possível consultar o estoque.");
      }
      if (consulta !== consultaAtual.current) return;
      const lista = (dados as Produto[]).filter((item) =>
        item && Number.isSafeInteger(item.product_id) && item.product_id > 0 &&
        typeof item.product_name === "string" && typeof item.unit === "string" &&
        item.current_quantity != null && Number.isFinite(Number(item.current_quantity))
      );
      setProdutos(lista);
      setProdutoId((atual) => lista.some((item) => String(item.product_id) === atual) ? atual : "");
    } catch (erro) {
      if (consulta !== consultaAtual.current) return;
      setErroConsulta(erro instanceof Error ? erro.message : "Erro ao consultar o estoque.");
    } finally {
      if (consulta === consultaAtual.current) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarProdutos();
    return () => { consultaAtual.current += 1; };
  }, [carregarProdutos]);

  const produto = produtos.find((item) => String(item.product_id) === produtoId);
  const centesimos = quantidadeEmCentesimos(quantidade);
  const estoqueAtual = produto ? Number(produto.current_quantity) : null;
  const estoquePrevisto = estoqueAtual !== null && centesimos !== null
    ? (Math.round(estoqueAtual * 100) + centesimos) / 100 : null;
  const bloqueado = salvando || confirmacao !== null;
  const campoTema = { backgroundColor: theme.background, borderColor: theme.backgroundSelected };
  const cardTema = { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected };

  function limparMensagens() {
    setErroSalvar(null);
    setSucesso(null);
  }

  function prepararEntrada() {
    if (envioEmAndamento.current || carregando || erroConsulta || confirmacao) return;
    limparMensagens();
    if (!produto) {
      setErroSalvar("Selecione um produto.");
      return;
    }
    if (centesimos === null) {
      setErroSalvar("Informe uma quantidade positiva de até 99.999.999,99, com no máximo duas casas decimais.");
      return;
    }
    setConfirmacao({ product_id: produto.product_id, quantity: centesimos / 100, description: descricao.trim() || null });
  }

  async function registrarEntrada() {
    if (!confirmacao || envioEmAndamento.current || carregando || erroConsulta) return;
    const payload = confirmacao;
    envioEmAndamento.current = true;
    setSalvando(true);
    setErroSalvar(null);
    setSucesso(null);
    try {
      const resposta = await apiFetch("/stock/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        if (resposta.status >= 500) {
          throw new Error("Não foi possível confirmar a entrada. Confira o estoque antes de tentar novamente.");
        }
        throw new Error(typeof dados?.error === "string" ? dados.error : "Não foi possível registrar a entrada.");
      }
      if (!dados || dados.current_stock == null || !Number.isFinite(Number(dados.current_stock))) {
        throw new Error("A API respondeu com sucesso, mas não confirmou o saldo. Confira o estoque antes de repetir a entrada.");
      }
      const novoEstoque = Number(dados.current_stock);
      setProdutos((lista) => lista.map((item) => item.product_id === payload.product_id
        ? { ...item, current_quantity: novoEstoque } : item));
      setQuantidade("");
      setDescricao("");
      setSucesso(`Entrada registrada com sucesso! Estoque após o registro: ${formatarQuantidade(novoEstoque)} ${produto?.unit ?? ""}.`);
    } catch (erro) {
      setErroSalvar(erro instanceof Error ? `${erro.message}` : "Não foi possível confirmar a entrada. Confira o estoque antes de repetir.");
    } finally {
      setConfirmacao(null);
      setSalvando(false);
      envioEmAndamento.current = false;
    }
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.headerTop}>
            <ThemedText style={styles.titulo}>Reposição de Estoque</ThemedText>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Atualizar estoque" disabled={carregando || bloqueado} onPress={() => void carregarProdutos()} style={[styles.refresh, campoTema, { opacity: carregando || bloqueado ? 0.5 : 1 }]}>
              <RefreshCw size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ThemedText style={styles.subTitulo}>Registre a entrada de produtos no estoque da igreja.</ThemedText>
        </View>

        {carregando ? (
          <View style={styles.estado}><ActivityIndicator color={theme.text} /><ThemedText>Carregando produtos...</ThemedText></View>
        ) : erroConsulta ? (
          <View style={styles.estado}>
            <ThemedText style={styles.erro}>{erroConsulta}</ThemedText>
            <TouchableOpacity style={[styles.botao, styles.botaoSecundario, campoTema]} onPress={() => void carregarProdutos()}><ThemedText>Tentar novamente</ThemedText></TouchableOpacity>
          </View>
        ) : produtos.length === 0 ? (
          <View style={styles.estado}><ThemedText>Nenhum produto ativo encontrado. Cadastre um produto antes de registrar entradas.</ThemedText></View>
        ) : (
          <>
            <View style={[styles.card, cardTema]}>
              <ThemedText style={styles.categoria}>Produto</ThemedText>
              <View style={[styles.pickerContainer, campoTema]}>
                <Picker selectedValue={produtoId} onValueChange={(valor) => { setProdutoId(String(valor)); limparMensagens(); }} enabled={!bloqueado} style={[styles.picker, { backgroundColor: theme.background, color: theme.text }]}>
                  <Picker.Item label="Selecione um produto" value="" />
                  {produtos.map((item) => <Picker.Item key={item.product_id} label={`${item.product_name} (${item.unit})`} value={String(item.product_id)} />)}
                </Picker>
              </View>
              <ThemedText style={styles.categoria}>Quantidade recebida{produto ? ` (${produto.unit})` : ""}</ThemedText>
              <ThemedTextInput style={[styles.input, campoTema]} placeholder="Ex.: 10,50" keyboardType="decimal-pad" value={quantidade} editable={!bloqueado} onChangeText={(valor) => { setQuantidade(valor); limparMensagens(); }} />
              <ThemedText style={styles.ajuda}>Use até duas casas decimais, sem separador de milhares.</ThemedText>
              <ThemedText style={styles.categoria}>Observações (opcional)</ThemedText>
              <ThemedTextInput style={[styles.input, styles.observacoes, campoTema]} placeholder="Ex.: doação ou compra de produtos" value={descricao} editable={!bloqueado} onChangeText={(valor) => { setDescricao(valor); limparMensagens(); }} multiline />
            </View>
            {produto && (
              <View style={[styles.card, cardTema]}>
                <View style={styles.headerTop}><ThemedText style={styles.resumoTitulo}>Resumo da reposição</ThemedText><PackagePlus size={20} color={theme.text} /></View>
                <View style={styles.resumoLinha}><ThemedText>Estoque atual</ThemedText><ThemedText style={styles.valor}>{formatarQuantidade(estoqueAtual!)} {produto.unit}</ThemedText></View>
                <View style={styles.resumoLinha}><ThemedText>Estoque previsto</ThemedText><ThemedText style={styles.valor}>{estoquePrevisto === null ? "—" : `${formatarQuantidade(estoquePrevisto)} ${produto.unit}`}</ThemedText></View>
                <ThemedText style={styles.ajuda}>A quantidade final será confirmada pelo banco de dados.</ThemedText>
              </View>
            )}
            {confirmacao ? (
              <View style={[styles.card, cardTema]}>
                <ThemedText style={styles.resumoTitulo}>Confirmar entrada?</ThemedText>
                <ThemedText>Registrar {formatarQuantidade(confirmacao.quantity)} {produto?.unit} de {produto?.product_name} no estoque.</ThemedText>
                <View style={styles.acoes}>
                  <TouchableOpacity disabled={salvando} onPress={() => setConfirmacao(null)} style={[styles.botao, styles.botaoSecundario, campoTema, styles.flex]}><ThemedText>Revisar</ThemedText></TouchableOpacity>
                  <TouchableOpacity disabled={salvando} onPress={() => void registrarEntrada()} style={[styles.botao, styles.flex, { opacity: salvando ? 0.5 : 1 }]}><ThemedText style={styles.botaoTexto}>{salvando ? "Registrando..." : "Confirmar"}</ThemedText></TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity disabled={salvando} style={[styles.botao, styles.botaoPrincipal, { opacity: salvando ? 0.5 : 1 }]} onPress={prepararEntrada}><ThemedText style={styles.botaoTexto}>Registrar entrada</ThemedText></TouchableOpacity>
            )}
          </>
        )}
        {erroSalvar && <ThemedText style={[styles.mensagem, styles.erro]}>{erroSalvar}</ThemedText>}
        {sucesso && <ThemedText style={[styles.mensagem, styles.sucesso]}>{sucesso}</ThemedText>}
        <ThemedText style={styles.footer}>Esta operação registra apenas a entrada física dos produtos, sem gerar lançamento financeiro.</ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  header: { paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#D8DEE8" },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  titulo: { fontSize: 24, fontWeight: "700", flex: 1 },
  subTitulo: { fontSize: 12, lineHeight: 18, marginTop: 12 },
  refresh: { borderWidth: 1, borderRadius: 10, padding: 9 },
  card: { marginHorizontal: 20, marginTop: 20, padding: 16, borderWidth: 1, borderRadius: 18, gap: 10, elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  categoria: { fontSize: 12, fontWeight: "500", marginTop: 4 },
  pickerContainer: { minHeight: 48, borderWidth: 1, borderRadius: 12, justifyContent: "center", overflow: "hidden" },
  picker: { height: 54, width: "100%" },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  observacoes: { minHeight: 76, textAlignVertical: "top" },
  ajuda: { fontSize: 11, opacity: 0.75 },
  resumoTitulo: { fontSize: 15, fontWeight: "600" },
  resumoLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  valor: { fontWeight: "700", flexShrink: 1, textAlign: "right" },
  botao: { minHeight: 46, borderRadius: 13, backgroundColor: "#6A95C7", alignItems: "center", justifyContent: "center", padding: 10 },
  botaoPrincipal: { marginHorizontal: 20, marginTop: 16 },
  botaoSecundario: { borderWidth: 1 },
  botaoTexto: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  acoes: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
  estado: { padding: 24, alignItems: "center", gap: 12 },
  mensagem: { textAlign: "center", marginHorizontal: 20, marginTop: 12, fontSize: 13 },
  erro: { color: "#DC2626" },
  sucesso: { color: "#059669" },
  footer: { marginHorizontal: 28, marginTop: 14, textAlign: "center", fontSize: 11, lineHeight: 16, opacity: 0.75 },
});
