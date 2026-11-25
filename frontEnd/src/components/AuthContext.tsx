import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  getAccessToken,
  saveSession,
  clearSession,
} from "@/services/authStorage";

import { apiFetch, setSessionExpiredHandler } from "@/services/api";

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    accessToken: string,
    refreshToken: string
  ) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
        try {
        const token = await getAccessToken();

        setIsAuthenticated(!!token);

        } catch (erro) {
        console.error("Erro ao verificar sessão:", erro);
        setIsAuthenticated(false);

        } finally {
        setIsLoading(false);
        }
    }

        checkSession();
    }, []);
    
    async function login(accessToken: string, refreshToken: string) {
    await saveSession(accessToken, refreshToken);
    setIsAuthenticated(true);
    }

    async function logout() {
      try {
        const resposta = await apiFetch("/logout", {
          method: "POST",
        });

        if (!resposta.ok) {
          throw new Error("Não foi possível revogar a sessão.");
        }

      } catch (erro) {
        console.error("Erro ao revogar sessão:", erro);

      } finally {
        await clearSession();
        setIsAuthenticated(false);
      }
    }

  useEffect(() => {
        setSessionExpiredHandler(async () => {
            await clearSession();
            setIsAuthenticated(false);
        });

        return () => {
            setSessionExpiredHandler(null);
        };
    }, []);

  return (
    <AuthContext.Provider
        value={{
        isAuthenticated,
        isLoading,
        login,
        logout,
        }}
    >
        {children}
    </AuthContext.Provider>
    );

}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider.");
  }

  return context;
}