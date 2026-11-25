
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const authMiddleware = require("./middleware/authMiddleware");

const app = express();

app.use(cors());
app.use(express.json());

// Conexão com o Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

// Login do administrador
app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  if (
    typeof email !== "string" ||
    typeof senha !== "string" ||
    !email.trim() ||
    !senha
  ) {
    return res.status(400).json({
      error: "Informe o email e a senha."
    });
  }

  try {
    const authClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    const { data, error } =
      await authClient.auth.signInWithPassword({
        email: email.trim(),
        password: senha
      });

    if (error || !data.user || !data.session) {
      return res.status(401).json({
        error: "Email ou senha inválidos."
      });
    }

    if (data.user.id !== ADMIN_USER_ID) {
      return res.status(403).json({
        error: "Usuário sem permissão de administrador."
      });
    }

    return res.json({
      message: "Login realizado com sucesso!",
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email
      }
    });
  } catch (error) {
    console.error("Erro no login:", error);

    return res.status(500).json({
      error: "Erro interno ao realizar login."
    });
  }
});

app.post("/refresh", async (req, res) => {
  const { refresh_token } = req.body;

  // Verifica se o refresh token foi informado
  if (typeof refresh_token !== "string" || !refresh_token.trim()) {
    return res.status(400).json({
      error: "Refresh token não informado ou inválido.",
    });
  }

  try {
    // Configura o cliente do Supabase
    const authClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Solicita a renovação da sessão
    const { data, error } = await authClient.auth.refreshSession({
      refresh_token: refresh_token,
    });

    // Verifica se a renovação foi bem-sucedida
    if (error || !data.session || !data.user) {
      return res.status(401).json({
        error: "Sessão inválida ou expirada.",
      });
    }

    // Verifica a autorização do usuário
    if (data.user.id !== ADMIN_USER_ID) {
      return res.status(403).json({
        error: "Usuário sem permissão de acesso.",
      });
    }

    // Retorna os novos tokens
    return res.status(200).json({
      message: "Sessão renovada com sucesso.",
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

  } catch (erro) {
    console.error("Erro ao renovar sessão:", erro);

    return res.status(500).json({
      error: "Erro interno ao renovar sessão.",
    });
  }
});

app.post("/logout", authMiddleware, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];

    const { error } = await supabase.auth.admin.signOut(
      token,
      "local"
    );

    if (error) {
      console.error("Erro do Supabase no logout:", error);

      return res.status(500).json({
        error: "Não foi possível revogar a sessão.",
      });
    }

    return res.status(200).json({
      message: "Sessão encerrada com sucesso.",
    });

  } catch (erro) {
    console.error("Erro ao encerrar sessão:", erro);

    return res.status(500).json({
      error: "Erro interno ao encerrar sessão.",
    });
  }
});

// Rota inicial para verificar se o servidor está funcionando
app.get('/', (req, res) => {
    res.send('Backend da Igreja funcionando!');
});

// Buscar todos os produtos ativos
app.get("/products", authMiddleware, async (req, res) => {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true);

    if (error) {
        console.error('Erro ao buscar produtos:', error.message);
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});

// Buscar o estoque atual
app.get("/stock", authMiddleware, async (req, res) => {
    const { data, error } = await supabase
        .from('current_stock')
        .select('*');

    if (error) {
        console.error('Erro ao consultar estoque:', error.message);
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});

app.get("/event-types", authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from("event_types")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao consultar tipos de eventos:", error.message);

    return res.status(500).json({
      error: "Não foi possível consultar os tipos de eventos.",
    });
  }

  return res.status(200).json(data);
});

app.get("/events", authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from("events")
    .select(`
      id,
      name,
      event_type_id,
      event_date,
      event_time,
      location,
      description,
      status,
      event_types(name)
    `)
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });

  if (error) {
    console.error("Erro ao consultar eventos:", error.message);

    return res.status(500).json({
      error: "Não foi possível consultar os eventos.",
    });
  }

  return res.status(200).json(data);
});

app.post("/events", authMiddleware, async (req, res) => {
  const {
    name,
    event_type_id,
    event_date,
    event_time,
    location,
    description,
  } = req.body ?? {};

  // Validação do nome
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      error: "Informe o nome do evento.",
    });
  }

  // Validação do tipo de evento
  if (!Number.isSafeInteger(event_type_id) || event_type_id <= 0) {
    return res.status(400).json({
      error: "Tipo de evento inválido.",
    });
  }

  // Validação do formato da data
  if (
    typeof event_date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(event_date)
  ) {
    return res.status(400).json({
      error: "Informe uma data no formato AAAA-MM-DD.",
    });
  }

  // Validação da existência da data
  const dataEvento = new Date(`${event_date}T00:00:00Z`);

  if (
    Number.isNaN(dataEvento.getTime()) ||
    dataEvento.toISOString().slice(0, 10) !== event_date
  ) {
    return res.status(400).json({
      error: "Data do evento inválida.",
    });
  }

  // Validação da descrição
  if (description != null && typeof description !== "string") {
    return res.status(400).json({
      error: "Descrição inválida.",
    });
  }

  // Validação do endereço
  if (
    typeof location !== "string" ||
    !location.trim() ||
    location.trim().length > 300
  ) {
    return res.status(400).json({
      error: "Informe um endereço válido para o evento.",
    });
  }
  
  // Validação do horário
  if (
    typeof event_time !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(event_time)
  ) {
    return res.status(400).json({
      error: "Informe um horário válido no formato HH:MM.",
    });
  }

  try {
    const { data, error } = await supabase
      .from("events")
      .insert({
        name: name.trim(),
        event_type_id: event_type_id,
        event_date: event_date,
        event_time: event_time,
        location: location.trim(),
        description: description?.trim() || null,
        created_by: req.user.id,
        status: "agendado",
      })
      .select()
      .single();
      
      if (error) {
        console.error("Erro ao cadastrar evento:", error.message);

        if (error.code === "23503") {
          return res.status(400).json({
            error: "Tipo de evento não encontrado.",
          });
        }

        return res.status(500).json({
          error: "Não foi possível cadastrar o evento.",
        });
      }

      return res.status(201).json({
        message: "Evento agendado com sucesso.",
        event: data,
      });

  } catch (erro) {
    console.error("Erro ao cadastrar evento:", erro);

    return res.status(500).json({
      error: "Erro interno ao cadastrar evento.",
    });
  }

});

app.patch("/events/:id/cancel", authMiddleware, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "ID do evento inválido.",
    });
  }

  try {
    const { data, error } = await supabase
      .from("events")
      .update({
        status: "cancelado",
      })
      .eq("id", id)
      .eq("status", "agendado")
      .select()
      .maybeSingle();
      if (error) {
        console.error("Erro ao cancelar evento:", error.message);

        return res.status(500).json({
          error: "Não foi possível cancelar o evento.",
        });
      }
      if (!data) {
        return res.status(409).json({
          error: "Evento não encontrado ou não está agendado.",
        });
      }
      return res.status(200).json({
        message: "Evento cancelado com sucesso.",
        event: data,
      });

  } catch (erro) {
    console.error("Erro ao cancelar evento:", erro);

    return res.status(500).json({
      error: "Erro interno ao cancelar evento.",
    });
  }
});

app.post("/events/:id/complete", authMiddleware, async (req, res) => {
  const id = Number(req.params.id);

  const {
    consumed_products,
    financial_entries,
  } = req.body ?? {};

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "ID do evento inválido.",
    });
  }

  if (!Array.isArray(consumed_products)) {
    return res.status(400).json({
      error: "Lista de produtos consumidos inválida.",
    });
  }

  if (!Array.isArray(financial_entries)) {
    return res.status(400).json({
      error: "Lista de movimentações financeiras inválida.",
    });
  }

  try {
  const { data, error } = await supabase.rpc("complete_event", {
    p_event_id: id,
    p_user_id: req.user.id,
    p_consumed_products: consumed_products,
    p_financial_entries: financial_entries,
  });

    if (error) {
      console.error("Erro ao realizar evento:", error.message);

      if (error.code === "P0001") {
        if (error.message === "Evento não encontrado.") {
          return res.status(404).json({
            error: error.message,
          });
        }

        if (
          error.message ===
            "Somente eventos agendados podem ser realizados." ||
          error.message.startsWith("Estoque insuficiente")
        ) {
          return res.status(409).json({
            error: error.message,
          });
        }

        return res.status(400).json({
          error: error.message,
        });
      }

      if (["22P02", "22003"].includes(error.code)) {
        return res.status(400).json({
          error: "Identificador ou valor numérico inválido.",
        });
      }

      return res.status(500).json({
        error: "Não foi possível realizar o evento.",
      });
    }

    return res.status(200).json(data);

  } catch (erro) {
    console.error("Erro ao realizar evento:", erro);

    return res.status(500).json({
      error: "Erro interno ao realizar evento.",
    });
  }

});

app.get("/financial-categories", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("financial_categories")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("Erro ao consultar categorias financeiras:", error.message);

      return res.status(500).json({
        error: "Não foi possível consultar as categorias financeiras.",
      });
    }

    return res.status(200).json(data);

  } catch (erro) {
    console.error("Erro ao consultar categorias financeiras:", erro);

    return res.status(500).json({
      error: "Erro interno ao consultar categorias financeiras.",
    });
  }
});

app.post("/stock/entry", authMiddleware, async (req, res) => {
  const {
    product_id,
    quantity,
    description,
  } = req.body ?? {};

  // Valida o ID do produto
  if (!Number.isSafeInteger(product_id) || product_id <= 0) {
    return res.status(400).json({
      error: "ID do produto inválido.",
    });
  }

  // Valida a quantidade
  if (
    typeof quantity !== "number" ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    quantity > 99999999.99
  ) {
    return res.status(400).json({
      error: "Quantidade inválida.",
    });
  }

  // Valida a precisão da quantidade
  if (quantity !== Number(quantity.toFixed(2))) {
    return res.status(400).json({
      error: "A quantidade deve ter no máximo duas casas decimais.",
    });
  }

  // Valida a descrição
  if (description != null && typeof description !== "string") {
    return res.status(400).json({
      error: "Descrição inválida.",
    });
  }

  try {
    const { data, error } = await supabase.rpc(
      "register_stock_entry",
      {
        p_product_id: product_id,
        p_quantity: quantity,
        p_description: description?.trim() || null,
        p_user_id: req.user.id,
      }
    );

    if (error) {
      console.error("Erro ao registrar entrada:", error.message);

      if (error.code === "P0001") {
        if (
          error.message === "Produto não encontrado ou inativo."
        ) {
          return res.status(404).json({
            error: error.message,
          });
        }

        if (
          error.message === "Quantidade inválida." ||
          error.message === "ID do produto inválido." ||
          error.message ===
            "A quantidade deve ter no máximo duas casas decimais."
        ) {
          return res.status(400).json({
            error: error.message,
          });
        }
      }

      return res.status(500).json({
        error: "Não foi possível registrar a entrada.",
      });
    }

    return res.status(201).json(data);

  } catch (erro) {
    console.error("Erro ao registrar entrada:", erro);

    return res.status(500).json({
      error: "Erro interno ao registrar entrada.",
    });
  }
});

app.get("/stock/movements", authMiddleware, async (req, res) => {
  const tipo = req.query.type ?? "todos";
  const pagina = Number(req.query.page ?? 1);
  const limite = 50;

  if (!["todos", "entrada", "saida"].includes(tipo)) {
    return res.status(400).json({
      error: "Tipo de movimentação inválido.",
    });
  }

  if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 100000) {
    return res.status(400).json({
      error: "Página inválida.",
    });
  }

  try {
    let consulta = supabase
      .from("stock_movements")
      .select(`
        id,
        product_id,
        event_id,
        movement_type,
        quantity,
        description,
        occurred_at,
        products(name, unit),
        events(name)
      `)
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false });

    if (tipo !== "todos") {
      consulta = consulta.eq("movement_type", tipo);
    }

    const inicio = (pagina - 1) * limite;

    const { data, error } = await consulta.range(
      inicio,
      inicio + limite
    );

    if (error) {
      console.error("Erro ao consultar movimentações:", error.message);

      return res.status(500).json({
        error: "Não foi possível consultar as movimentações.",
      });
    }

    return res
      .set("Cache-Control", "no-store")
      .status(200)
      .json({
        movements: data.slice(0, limite),
        page: pagina,
        has_more: data.length > limite,
      });

  } catch (erro) {
    console.error("Erro ao consultar movimentações:", erro);

    return res.status(500).json({
      error: "Erro interno ao consultar movimentações.",
    });
  }
});

app.get("/financial/dashboard", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.rpc(
      "get_financial_dashboard"
    );

    if (error) {
      console.error(
        "Erro ao consultar dashboard financeiro:",
        error.message
      );

      return res.status(500).json({
        error: "Não foi possível consultar os dados financeiros.",
      });
    }

    return res
      .set("Cache-Control", "no-store")
      .status(200)
      .json(data);

  } catch (erro) {
    console.error("Erro no dashboard financeiro:", erro);

    return res.status(500).json({
      error: "Erro interno ao consultar o financeiro.",
    });
  }
});

app.post("/financial/entries", authMiddleware, async (req, res) => {
  const { category_id, entry_type, amount, description } = req.body ?? {};

  if (!Number.isSafeInteger(category_id) || category_id <= 0) {
    return res.status(400).json({ error: "Categoria inválida." });
  }
  if (!["receita", "despesa"].includes(entry_type)) {
    return res.status(400).json({ error: "Tipo de lançamento inválido." });
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) ||
      amount <= 0 || amount > 9999999999.99 ||
      amount !== Number(amount.toFixed(2))) {
    return res.status(400).json({ error: "Informe um valor positivo com até duas casas decimais." });
  }
  if (description != null && (typeof description !== "string" || description.trim().length > 500)) {
    return res.status(400).json({ error: "Descrição inválida (máximo de 500 caracteres)." });
  }
  // event_id, created_by e occurred_at não são escolhidos pelo cliente.
  try {
    const { data, error } = await supabase.from("financial_entries")
      .insert({ category_id, entry_type, amount,
        description: description?.trim() || null,
        event_id: null, created_by: req.user.id })
      .select("id, category_id, event_id, entry_type, amount, description, occurred_at")
      .single();
    if (error) {
      console.error("Erro ao registrar lançamento:", error.message);
      if (error.code === "23503") {
        return res.status(400).json({ error: "Categoria ou usuário inválido." });
      }
      return res.status(500).json({ error: "Não foi possível confirmar o lançamento." });
    }
    return res.status(201).json(data);
  } catch (erro) {
    console.error("Erro ao registrar lançamento:", erro);
    return res.status(500).json({ error: "Não foi possível confirmar o lançamento." });
  }
});

app.get("/financial/entries", authMiddleware, async (req, res) => {
  const { type = "todos", category_id, from, to, page = "1" } = req.query;
  const idValido = (v) => typeof v === "string" && /^\d+$/.test(v) && Number.isSafeInteger(Number(v)) && Number(v) > 0;
  const dataValida = (v) => {
    if (typeof v !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(v + "T00:00:00Z");
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
  };
  if (!["todos", "receita", "despesa"].includes(type)) {
    return res.status(400).json({ error: "Tipo de lançamento inválido." });
  }
  if (!idValido(page) || Number(page) > 100000) {
    return res.status(400).json({ error: "Página inválida." });
  }
  if (category_id !== undefined && !idValido(category_id)) {
    return res.status(400).json({ error: "Categoria inválida." });
  }
  if ((from !== undefined && !dataValida(from)) || (to !== undefined && !dataValida(to)) ||
      (from !== undefined && to !== undefined && from > to)) {
    return res.status(400).json({ error: "Período inválido." });
  }
  try {
    const { data, error } = await supabase.rpc("get_financial_history", {
      p_type: type === "todos" ? null : type,
      p_category_id: category_id === undefined ? null : Number(category_id),
      p_from: from ?? null, p_to: to ?? null, p_page: Number(page),
    });
    if (error) {
      console.error("Erro ao consultar histórico financeiro:", error.message);
      return res.status(500).json({ error: "Não foi possível consultar o histórico financeiro." });
    }
    return res.set("Cache-Control", "no-store").status(200).json(data);
  } catch (erro) {
    console.error("Erro ao consultar histórico financeiro:", erro);
    return res.status(500).json({ error: "Erro interno ao consultar o histórico financeiro." });
  }
});

app.get("/sad/stock-forecast", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.rpc(
      "get_stock_forecast"
    );

    if (error) {
      console.error(
        "Erro ao calcular previsão de estoque:",
        error.message
      );

      return res.status(500).json({
        error: "Não foi possível calcular a previsão de estoque.",
      });
    }

    return res
      .set("Cache-Control", "no-store")
      .status(200)
      .json(data);

  } catch (erro) {
    console.error("Erro na previsão de estoque:", erro);

    return res.status(500).json({
      error: "Erro interno ao calcular a previsão de estoque.",
    });
  }
});

app.get("/sad/financial-forecast", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.rpc(
      "get_financial_forecast"
    );

    if (error) {
      console.error(
        "Erro ao calcular previsão financeira:",
        error.message
      );

      return res.status(500).json({
        error: "Não foi possível calcular a previsão financeira.",
      });
    }

    return res
      .set("Cache-Control", "no-store")
      .status(200)
      .json(data);

  } catch (erro) {
    console.error("Erro na previsão financeira:", erro);

    return res.status(500).json({
      error: "Erro interno ao calcular a previsão financeira.",
    });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
