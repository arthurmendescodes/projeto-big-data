const { createClient } = require("@supabase/supabase-js");

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

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Token de autenticação não informado.",
      });
    }

    const token = authHeader.split(" ")[1];

    const { data, error } = await authClient.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        error: "Token inválido ou expirado.",
      });
    }

    if (data.user.id !== ADMIN_USER_ID) {
      return res.status(403).json({
        error: "Usuário sem permissão de acesso.",
      });
    }

    req.user = data.user;
    next();

  } catch (erro) {
    console.error("Erro no middleware de autenticação:", erro);

    return res.status(500).json({
      error: "Erro interno na autenticação.",
    });
  }
}

module.exports = authMiddleware;