import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { CalendarDays, CheckCircle, Clock, MapPin, Plus, RefreshCw, Trash2 } from "lucide-react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { useTheme } from "@/hooks/use-theme";
import { apiFetch } from "../../services/api";

type Evento = {
  id: number;
  name: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  description: string | null;
  status: "agendado" | "realizado" | "cancelado";
  event_types: { name: string } | null;
};

type Produto = { product_id: number; product_name: string; unit: string; current_quantity: number | string };
type Categoria = { id: number; name: string };
type LinhaProduto = { chave: number; produtoId: string; quantidade: string };
type LinhaFinanceira = { chave: number; categoriaId: string; tipo: "receita" | "despesa"; valor: string; descricao: string };
type Consumo = { product_id: number; quantity: number };
type Lancamento = { category_id: number; entry_type: "receita" | "despesa"; amount: number; description: string | null };
type Payload = { consumed_products: Consumo[]; financial_entries: Lancamento[] };

// Aceita vírgula ou ponto decimal, sem separador de milhares.
// Trabalha com inteiros de centésimos para evitar erros na soma.
function centesimos(texto: string): number | null {
  const valor = texto.trim();
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(valor)) return null;
  const [inteiro, decimal = ""] = valor.replace(",", ".").split(".");
  const total = Number(inteiro) * 100 + Number(decimal.padEnd(2, "0"));
  return Number.isSafeInteger(total) && total > 0 ? total : null;
}

const formatoMoeda = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatoQuantidade = (quantidade: number) => quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-");
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : data;
}

async function consultar<T>(rota: string): Promise<T[]> {
  const resposta = await apiFetch(rota);
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new Error(typeof dados?.error === "string" ? dados.error : `Não foi possível consultar ${rota}.`);
  }
  if (!Array.isArray(dados)) throw new Error(`Resposta inválida de ${rota}.`);
  return dados as T[];
}

export default function RealizarEvento() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const eventoId = typeof id === "string" && /^\d+$/.test(id) ? Number(id) : NaN;
  const idValido = Number.isSafeInteger(eventoId) && eventoId > 0;

  const [evento, setEvento] = useState<Evento | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [consumos, setConsumos] = useState<LinhaProduto[]>([]);
  const [financeiro, setFinanceiro] = useState<LinhaFinanceira[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erroConsulta, setErroConsulta] = useState<string | null>(null);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<Payload | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const proximaChave = useRef(0);
  const envioEmAndamento = useRef(false);
  const consultaAtual = useRef(0);

  const carregarDados = useCallback(async () => {
    const consulta = ++consultaAtual.current;
    setCarregando(true);
    setErroConsulta(null);
    setConfirmacao(null);
    try {
      if (!idValido) throw new Error("ID do evento inválido.");
      const [eventos, estoque, listaCategorias] = await Promise.all([
        consultar<Evento>("/events"),
        consultar<Produto>("/stock"),
        consultar<Categoria>("/financial-categories"),
      ]);
      if (consulta !== consultaAtual.current) return;
      const encontrado = eventos.find((item) => item.id === eventoId);
      if (!encontrado) throw new Error("Evento não encontrado.");
      if (encontrado.status !== "agendado") throw new Error("Somente eventos agendados podem ser realizados.");
      setEvento(encontrado);
      setProdutos(estoque.filter((produto) => Number.isFinite(Number(produto.current_quantity))));
      setCategorias(listaCategorias);
    } catch (erro) {
      if (consulta !== consultaAtual.current) return;
      setErroConsulta(erro instanceof Error ? erro.message : "Erro ao carregar os dados.");
    } finally {
      if (consulta === consultaAtual.current) setCarregando(false);
    }
  }, [eventoId, idValido]);

  useEffect(() => {
    setEvento(null);
    setConsumos([]);
    setFinanceiro([]);
    setErroFormulario(null);
    setSucesso(false);
    void carregarDados();
    return () => { consultaAtual.current += 1; };
  }, [carregarDados]);

  const bloqueado = salvando || confirmacao !== null;
  const cardTema = { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected };
  const campoTema = { backgroundColor: theme.background, borderColor: theme.backgroundSelected };

  function editarProduto(chave: number, alteracao: Partial<LinhaProduto>) {
    setConsumos((lista) => lista.map((linha) => linha.chave === chave ? { ...linha, ...alteracao } : linha));
    setErroFormulario(null);
  }

  function editarFinanceiro(chave: number, alteracao: Partial<LinhaFinanceira>) {
    setFinanceiro((lista) => lista.map((linha) => linha.chave === chave ? { ...linha, ...alteracao } : linha));
    setErroFormulario(null);
  }

  function adicionarProduto() {
    const chave = ++proximaChave.current;
    setConsumos((lista) => [...lista, { chave, produtoId: "", quantidade: "" }]);
    setErroFormulario(null);
  }

  function adicionarFinanceiro(tipo: LinhaFinanceira["tipo"]) {
    const chave = ++proximaChave.current;
    setFinanceiro((lista) => [...lista, { chave, categoriaId: "", tipo, valor: "", descricao: "" }]);
    setErroFormulario(null);
  }

  function prepararRealizacao() {
    if (envioEmAndamento.current || carregando || erroConsulta || !evento) return;
    setErroFormulario(null);
    try {
      // Agrupa em centésimos antes de validar o estoque total solicitado.
      const agrupados = new Map<number, number>();
      for (const [indice, linha] of consumos.entries()) {
        const produto = produtos.find((item) => String(item.product_id) === linha.produtoId);
        if (!produto) throw new Error(`Selecione o produto na baixa ${indice + 1}.`);
        const quantidade = centesimos(linha.quantidade);
        if (quantidade === null) throw new Error(`Informe uma quantidade positiva, com até duas casas decimais, para ${produto.product_name}.`);
        const total = (agrupados.get(produto.product_id) ?? 0) + quantidade;
        if (!Number.isSafeInteger(total) || total > 9999999999) throw new Error(`Quantidade acima do limite para ${produto.product_name}.`);
        if (total > Math.round(Number(produto.current_quantity) * 100)) {
          throw new Error(`Estoque insuficiente para ${produto.product_name}. Disponível: ${formatoQuantidade(Number(produto.current_quantity))} ${produto.unit}.`);
        }
        agrupados.set(produto.product_id, total);
      }
      const consumed_products = Array.from(agrupados, ([product_id, quantidade]) => ({ product_id, quantity: quantidade / 100 }));

      const financial_entries: Lancamento[] = financeiro.map((linha, indice) => {
        const categoria = categorias.find((item) => String(item.id) === linha.categoriaId);
        if (!categoria) throw new Error(`Selecione a categoria da movimentação financeira ${indice + 1}.`);
        const valor = centesimos(linha.valor);
        if (valor === null || valor > 999999999999) throw new Error(`Informe um valor positivo válido, com até duas casas decimais, na movimentação financeira ${indice + 1}.`);
        return { category_id: categoria.id, entry_type: linha.tipo, amount: valor / 100, description: linha.descricao.trim() || null };
      });
      // Arrays vazios são válidos. A confirmação deixa explícita a finalização.
      setConfirmacao({ consumed_products, financial_entries });
    } catch (erro) {
      setErroFormulario(erro instanceof Error ? erro.message : "Verifique os dados informados.");
    }
  }

  async function realizarEvento() {
    if (!confirmacao || envioEmAndamento.current || !evento || sucesso) return;
    envioEmAndamento.current = true;
    setSalvando(true);
    setErroFormulario(null);
    try {
      const resposta = await apiFetch(`/events/${evento.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(confirmacao),
      });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        throw new Error(typeof dados?.error === "string" ? dados.error : "Não foi possível realizar o evento.");
      }
      setSucesso(true);
      setConfirmacao(null);
    } catch (erro) {
      setErroFormulario(erro instanceof Error ? erro.message : "Erro ao realizar o evento.");
      setConfirmacao(null);
    } finally {
      envioEmAndamento.current = false;
      setSalvando(false);
    }
  }

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace("/eventosAgendados");
  }

  const totais = financeiro.reduce((total, linha) => {
    const valor = centesimos(linha.valor);
    if (valor !== null && valor <= 999999999999) total[linha.tipo] += valor;
    return total;
  }, { receita: 0, despesa: 0 });
  const saldo = totais.receita - totais.despesa;

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.header, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.headerRow}>
            <ThemedText style={styles.titulo}>Realizar Evento</ThemedText>
            {!sucesso && (
              <TouchableOpacity accessibilityLabel="Atualizar dados" style={[styles.iconButton, { backgroundColor: theme.backgroundSelected, opacity: carregando || bloqueado ? 0.5 : 1 }]} disabled={carregando || bloqueado} onPress={() => void carregarDados()}>
                <RefreshCw size={20} color={theme.text} />
              </TouchableOpacity>
            )}
          </View>
          <ThemedText style={styles.descricao}>Registre o consumo, as receitas e as despesas do evento.</ThemedText>
        </View>

        {carregando ? (
          <View style={styles.estado}><ActivityIndicator size="large" color={theme.text} /><ThemedText>Carregando dados...</ThemedText></View>
        ) : erroConsulta || !evento ? (
          <View style={[styles.card, cardTema]}>
            <ThemedText style={styles.erro}>{erroConsulta || "Evento não encontrado."}</ThemedText>
            <TouchableOpacity style={styles.btnPrincipal} onPress={() => void carregarDados()}><ThemedText style={styles.btnTexto}>Tentar novamente</ThemedText></TouchableOpacity>
            <TouchableOpacity style={[styles.btnSecundario, campoTema]} onPress={voltar}><ThemedText>Voltar</ThemedText></TouchableOpacity>
          </View>
        ) : sucesso ? (
          <View style={[styles.card, cardTema, styles.estado]}>
            <CheckCircle size={42} color={theme.text} />
            <ThemedText style={styles.nome}>Evento realizado com sucesso!</ThemedText>
            <ThemedText style={styles.descricao}>O estoque, as movimentações financeiras e o status do evento foram atualizados.</ThemedText>
            <TouchableOpacity style={[styles.btnPrincipal, { alignSelf: "stretch" }]} onPress={voltar}><ThemedText style={styles.btnTexto}>Voltar aos eventos agendados</ThemedText></TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[styles.card, cardTema]}>
              <ThemedText style={styles.nome}>{evento.name}</ThemedText>
              <ThemedText style={[styles.descricao, { color: theme.textSecondary }]}>{evento.event_types?.name || "Tipo não informado"}</ThemedText>
              <View style={styles.info}><CalendarDays size={17} color={theme.textSecondary} /><ThemedText style={styles.infoTexto}>{formatarData(evento.event_date)}</ThemedText></View>
              <View style={styles.info}><Clock size={17} color={theme.textSecondary} /><ThemedText style={styles.infoTexto}>{evento.event_time?.slice(0, 5) || "Não informado"}</ThemedText></View>
              <View style={styles.info}><MapPin size={17} color={theme.textSecondary} /><ThemedText style={styles.infoTexto}>{evento.location || "Endereço não informado"}</ThemedText></View>
              {!!evento.description && <ThemedText style={styles.descricao}>{evento.description}</ThemedText>}
            </View>

            <View style={[styles.card, cardTema]}>
              <ThemedText style={styles.nome}>Produtos consumidos</ThemedText>
              <ThemedText style={styles.descricao}>Informe apenas o que foi efetivamente utilizado. Se não houve consumo, deixe a lista vazia.</ThemedText>
              {consumos.length === 0 && <ThemedText style={[styles.descricao, { color: theme.textSecondary }]}>Nenhum produto adicionado.</ThemedText>}
              {consumos.map((linha, indice) => {
                const produto = produtos.find((item) => String(item.product_id) === linha.produtoId);
                return (
                  <View key={linha.chave} style={[styles.linha, { borderColor: theme.backgroundSelected }]}>
                    <View style={styles.headerRow}>
                      <ThemedText style={styles.nomeLinha}>Baixa {indice + 1}</ThemedText>
                      <TouchableOpacity accessibilityLabel={`Remover baixa ${indice + 1}`} disabled={bloqueado} style={{ opacity: bloqueado ? 0.4 : 1 }} onPress={() => { setConsumos((lista) => lista.filter((item) => item.chave !== linha.chave)); setErroFormulario(null); }}><Trash2 size={20} color={theme.textSecondary} /></TouchableOpacity>
                    </View>
                    <ThemedText style={styles.categoria}>Produto</ThemedText>
                    <View style={[styles.pickerContainer, campoTema]}>
                      <Picker style={[styles.picker, { backgroundColor: theme.background, color: theme.text }]} enabled={!bloqueado} selectedValue={linha.produtoId} onValueChange={(valor) => editarProduto(linha.chave, { produtoId: String(valor) })}>
                        <Picker.Item label="Selecione o produto" value="" />
                        {produtos.map((item) => <Picker.Item key={item.product_id} label={`${item.product_name} (${formatoQuantidade(Number(item.current_quantity))} ${item.unit})`} value={String(item.product_id)} />)}
                      </Picker>
                    </View>
                    {produto && <ThemedText style={styles.descricao}>Disponível: {formatoQuantidade(Number(produto.current_quantity))} {produto.unit}</ThemedText>}
                    <ThemedText style={styles.categoria}>Quantidade consumida{produto ? ` (${produto.unit})` : ""}</ThemedText>
                    <ThemedTextInput style={[styles.input, campoTema]} placeholder="Ex.: 1,50" keyboardType="decimal-pad" value={linha.quantidade} onChangeText={(valor) => editarProduto(linha.chave, { quantidade: valor })} editable={!bloqueado} />
                  </View>
                );
              })}
              <TouchableOpacity disabled={bloqueado || produtos.length === 0} style={[styles.btnSecundario, campoTema, { opacity: bloqueado || produtos.length === 0 ? 0.5 : 1 }]} onPress={adicionarProduto}>
                <Plus size={18} color={theme.text} /><ThemedText style={styles.nomeLinha}>Adicionar produto</ThemedText>
              </TouchableOpacity>
              {produtos.length === 0 && <ThemedText style={styles.descricao}>Não há produtos disponíveis para selecionar.</ThemedText>}
            </View>

            <View style={[styles.card, cardTema]}>
              <ThemedText style={styles.nome}>Receitas e despesas</ThemedText>
              <ThemedText style={styles.descricao}>Registre as doações e despesas efetivas. Não registre novamente uma compra que já foi contabilizada.</ThemedText>
              {financeiro.length === 0 && <ThemedText style={[styles.descricao, { color: theme.textSecondary }]}>Nenhuma movimentação adicionada.</ThemedText>}
              {financeiro.map((linha, indice) => (
                <View key={linha.chave} style={[styles.linha, { borderColor: theme.backgroundSelected }]}>
                  <View style={styles.headerRow}>
                    <ThemedText style={styles.nomeLinha}>{linha.tipo === "receita" ? "Receita" : "Despesa"} {indice + 1}</ThemedText>
                    <TouchableOpacity accessibilityLabel={`Remover movimentação ${indice + 1}`} disabled={bloqueado} style={{ opacity: bloqueado ? 0.4 : 1 }} onPress={() => { setFinanceiro((lista) => lista.filter((item) => item.chave !== linha.chave)); setErroFormulario(null); }}><Trash2 size={20} color={theme.textSecondary} /></TouchableOpacity>
                  </View>
                  <ThemedText style={styles.categoria}>Categoria</ThemedText>
                  <View style={[styles.pickerContainer, campoTema]}>
                    <Picker style={[styles.picker, { backgroundColor: theme.background, color: theme.text }]} selectedValue={linha.categoriaId} enabled={!bloqueado} onValueChange={(valor) => editarFinanceiro(linha.chave, { categoriaId: String(valor) })}>
                      <Picker.Item label="Selecione a categoria" value="" />
                      {categorias.map((categoria) => <Picker.Item key={categoria.id} label={categoria.name} value={String(categoria.id)} />)}
                    </Picker>
                  </View>
                  <ThemedText style={styles.categoria}>Valor (R$)</ThemedText>
                  <ThemedTextInput style={[styles.input, campoTema]} placeholder="Ex.: 100,00" keyboardType="decimal-pad" value={linha.valor} onChangeText={(valor) => editarFinanceiro(linha.chave, { valor })} editable={!bloqueado} />
                  <ThemedText style={styles.categoria}>Descrição (opcional)</ThemedText>
                  <ThemedTextInput style={[styles.input, campoTema]} placeholder="Ex.: Doações ou serviço de limpeza" value={linha.descricao} onChangeText={(valor) => editarFinanceiro(linha.chave, { descricao: valor })} editable={!bloqueado} multiline />
                </View>
              ))}
              <View style={styles.acoes}>
                <TouchableOpacity disabled={bloqueado || categorias.length === 0} style={[styles.btnSecundario, styles.flex, campoTema, { opacity: bloqueado || categorias.length === 0 ? 0.5 : 1 }]} onPress={() => adicionarFinanceiro("receita")}><Plus size={16} color={theme.text} /><ThemedText style={styles.nomeLinha}>Receita</ThemedText></TouchableOpacity>
                <TouchableOpacity disabled={bloqueado || categorias.length === 0} style={[styles.btnSecundario, styles.flex, campoTema, { opacity: bloqueado || categorias.length === 0 ? 0.5 : 1 }]} onPress={() => adicionarFinanceiro("despesa")}><Plus size={16} color={theme.text} /><ThemedText style={styles.nomeLinha}>Despesa</ThemedText></TouchableOpacity>
              </View>
              {categorias.length === 0 && <ThemedText style={styles.descricao}>Nenhuma categoria financeira cadastrada.</ThemedText>}
            </View>

            <View style={[styles.card, cardTema]}>
              <ThemedText style={styles.nome}>Resumo financeiro</ThemedText>
              <View style={styles.resumoLinha}><ThemedText>Receitas</ThemedText><ThemedText>{formatoMoeda(totais.receita)}</ThemedText></View>
              <View style={styles.resumoLinha}><ThemedText>Despesas</ThemedText><ThemedText>{formatoMoeda(totais.despesa)}</ThemedText></View>
              <View style={[styles.resumoLinha, styles.divisor, { borderColor: theme.backgroundSelected }]}><ThemedText style={styles.nomeLinha}>Saldo do evento</ThemedText><ThemedText style={styles.nome}>{formatoMoeda(saldo)}</ThemedText></View>
              <ThemedText style={styles.descricao}>{saldo > 0 ? "Superávit" : saldo < 0 ? "Déficit" : "Saldo neutro"}. Todos são permitidos.</ThemedText>
              <ThemedText style={[styles.descricao, { color: theme.textSecondary }]}>Prévia dos valores válidos digitados. Os campos incompletos serão verificados antes de finalizar.</ThemedText>
            </View>

            <View style={styles.finalizacao}>
              {!!erroFormulario && <ThemedText style={styles.erro}>{erroFormulario}</ThemedText>}
              {confirmacao ? (
                <View style={[styles.cardConfirmacao, cardTema]}>
                  <ThemedText style={styles.nome}>Confirmar realização?</ThemedText>
                  <ThemedText style={styles.descricao}>{confirmacao.consumed_products.length} produto(s) diferente(s) e {confirmacao.financial_entries.length} movimentação(ões) financeira(s).</ThemedText>
                  {confirmacao.consumed_products.length === 0 && confirmacao.financial_entries.length === 0 && <ThemedText style={styles.descricao}>O evento será finalizado sem nenhuma movimentação.</ThemedText>}
                  <ThemedText style={styles.descricao}>O evento passará para realizado. Esta ação não pode ser desfeita pelo aplicativo.</ThemedText>
                  <View style={styles.acoes}>
                    <TouchableOpacity disabled={salvando} style={[styles.btnSecundario, styles.flex, campoTema, { opacity: salvando ? 0.5 : 1 }]} onPress={() => setConfirmacao(null)}><ThemedText>Revisar</ThemedText></TouchableOpacity>
                    <TouchableOpacity disabled={salvando} style={[styles.btnPrincipal, styles.flex, { opacity: salvando ? 0.5 : 1 }]} onPress={() => void realizarEvento()}><ThemedText style={styles.btnTexto}>{salvando ? "Salvando..." : "Confirmar"}</ThemedText></TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.btnPrincipal} onPress={prepararRealizacao}><ThemedText style={styles.btnTexto}>Finalizar evento</ThemedText></TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#D8DEE8", gap: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  titulo: { fontSize: 24, fontWeight: "700", flex: 1 },
  nome: { fontSize: 16, fontWeight: "600" },
  nomeLinha: { fontSize: 13, fontWeight: "600" },
  descricao: { fontSize: 13, lineHeight: 19 },
  card: { marginHorizontal: 20, marginTop: 16, padding: 16, borderWidth: 1, borderRadius: 18, gap: 10, elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  cardConfirmacao: { padding: 16, borderWidth: 1, borderRadius: 18, gap: 12 },
  linha: { padding: 12, borderWidth: 1, borderRadius: 12, gap: 8 },
  categoria: { fontSize: 12, fontWeight: "500" },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  pickerContainer: { minHeight: 44, borderWidth: 1, borderRadius: 12, justifyContent: "center", overflow: "hidden" },
  picker: { height: 60, width: "100%" },
  iconButton: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  info: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoTexto: { flex: 1, fontSize: 13, lineHeight: 19 },
  acoes: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
  btnPrincipal: { minHeight: 44, borderRadius: 13, backgroundColor: "#6A95C7", alignItems: "center", justifyContent: "center", paddingHorizontal: 10, paddingVertical: 10 },
  btnSecundario: { minHeight: 44, borderRadius: 13, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 10 },
  btnTexto: { color: "#FFFFFF", fontSize: 13, fontWeight: "600", textAlign: "center" },
  resumoLinha: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  divisor: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  finalizacao: { marginHorizontal: 20, marginTop: 16, gap: 10 },
  estado: { padding: 24, alignItems: "center", gap: 12 },
  erro: { fontSize: 13, color: "#DC2626", lineHeight: 19 },
});
