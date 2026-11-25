import {
  getAccessToken,
  getRefreshToken,
  saveSession,
} from "./authStorage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const hostUri = Constants.expoConfig?.hostUri;
const host = hostUri?.split(":")[0];

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "web"
    ? "http://localhost:3000"
    : host && /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
      ? `http://${host}:3000`
      : "http://localhost:3000");

console.log("Endereço da API:", API_URL);

let refreshPromise: Promise<string | null> | null = null;

let onSessionExpired: (() => Promise<void>) | null = null;

export function setSessionExpiredHandler(
  handler: (() => Promise<void>) | null
) {
  onSessionExpired = handler;
}

async function refreshSession(): Promise<string | null> {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  const resposta = await fetch(`${API_URL}/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
  });

  if (resposta.status === 401 || resposta.status === 403) {
    return null;
  }

  if (!resposta.ok) {
    throw new Error("Erro ao renovar a sessão.");
  }

  const dados = await resposta.json();

  await saveSession(dados.access_token, dados.refresh_token);

  return dados.access_token;
}

async function refreshSessionOnce(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshSession().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();

  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const resposta = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Verifica se precisamos renovar a sessão
  if (resposta.status === 401) {
    const currentToken = await getAccessToken();

    const newToken =
      currentToken && currentToken !== token
        ? currentToken
        : await refreshSessionOnce();

    if (!newToken) {
        if (onSessionExpired) {
            await onSessionExpired();
        }

        return resposta;
    }

    // Atualiza o cabeçalho de autenticação
    headers.set("Authorization", `Bearer ${newToken}`);

    // Repete a requisição original
    return await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  }

  return resposta;
}