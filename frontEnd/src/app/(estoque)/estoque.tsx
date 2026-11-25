import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import { useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { PackagePlus, History as HistoryIcon } from "lucide-react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { useTheme } from "@/hooks/use-theme";

import ListaEstoque, {
  type EstoqueItem,
} from "@/components/ListaEstoque";

import { apiFetch } from "@/services/api";

export default function Estoque() {
  const router = useRouter();
  const theme = useTheme();

  const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pesquisa, setPesquisa] = useState("");

  // Atualiza o estoque sempre que a tela recebe foco
  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregarEstoque() {
        try {
          setIsLoading(true);
          setErro(null);

          const resposta = await apiFetch("/stock");

          if (!resposta.ok) {
            throw new Error(
              "Não foi possível consultar o estoque."
            );
          }

          const dados: EstoqueItem[] = await resposta.json();

          if (ativo) {
            setEstoque(dados);
          }

        } catch (erro) {
          const mensagem =
            erro instanceof Error
              ? erro.message
              : "Erro desconhecido.";

          if (ativo) {
            setErro(mensagem);
          }

        } finally {
          if (ativo) {
            setIsLoading(false);
          }
        }
      }

      carregarEstoque();

      return () => {
        ativo = false;
      };
    }, [])
  );

  // Normaliza os textos para permitir pesquisas sem acentos
  function normalizarTexto(texto: string): string {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  const estoqueFiltrado = estoque.filter((item) =>
    normalizarTexto(item.product_name).includes(
      normalizarTexto(pesquisa)
    )
  );

  return (
    <ThemedView
      style={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: theme.backgroundElement },
          ]}
        >
          <View style={styles.headerTexts}>
            <ThemedText style={styles.titulo}>
              Estoque
            </ThemedText>
          </View>

          <ThemedText style={styles.subTitulo}>
            Consulte e gerencie os itens do estoque.
          </ThemedText>
        </View>

        {/* Pesquisa */}
        <View>
          <ThemedTextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
              },
            ]}
            placeholder="Procurar item..."
            value={pesquisa}
            onChangeText={setPesquisa}
          />
        </View>

        {/* Reposição de estoque */}
        <TouchableOpacity
          style={styles.btnReposicao}
          onPress={() => router.push("/reporEstoque")}
          activeOpacity={0.7}
        >
          <PackagePlus size={20} color="#FFFFFF" />

          <ThemedText style={styles.btnReposicaoTexto}>
            Repor estoque
          </ThemedText>
        </TouchableOpacity>

        {/* Histórico de movimentações */}
        <TouchableOpacity
          style={styles.btnHistorico}
          onPress={() =>
            router.push("/historicoMovimentacoes")
          }
          activeOpacity={0.7}
        >
          <HistoryIcon size={20} color={theme.text} />

          <ThemedText style={styles.btnHistoricoTexto}>
            Histórico de movimentações
          </ThemedText>
        </TouchableOpacity>

        {/* Lista de estoque */}
        <View>
          {isLoading ? (
            <ActivityIndicator
              size="large"
              color={theme.text}
              style={styles.carregamento}
            />
          ) : erro ? (
            <ThemedText style={styles.erroMensagem}>
              {erro}
            </ThemedText>
          ) : estoqueFiltrado.length === 0 ? (
            <ThemedText style={styles.mensagemVazia}>
              Nenhum produto encontrado.
            </ThemedText>
          ) : (
            estoqueFiltrado.map((item) => (
              <ListaEstoque
                key={item.product_id}
                item={item}
              />
            ))
          )}
        </View>
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

  input: {
    margin: 10,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },

  btnReposicao: {
    marginHorizontal: 20,
    marginVertical: 12,
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: "#6A95C7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  btnReposicaoTexto: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  btnHistorico: {
    marginHorizontal: 20,
    marginBottom: 12,
    minHeight: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#6A95C7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  btnHistoricoTexto: {
    fontSize: 14,
    fontWeight: "600",
  },

  carregamento: {
    marginTop: 20,
  },

  erroMensagem: {
    textAlign: "center",
    marginHorizontal: 20,
    marginTop: 20,
    color: "#DC2626",
  },

  mensagemVazia: {
    textAlign: "center",
    marginHorizontal: 20,
    marginTop: 20,
  },
});