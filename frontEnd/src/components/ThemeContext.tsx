import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark";

type ThemeContextType = {
  themeMode: ThemeMode;
  changeTheme: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadTheme() {
      try {
        const savedTheme = await AsyncStorage.getItem("appTheme");

        if (savedTheme === "light" || savedTheme === "dark") {
          setThemeMode(savedTheme);
        }
      } catch (error) {
        console.error("Erro ao carregar o tema:", error);
      } finally {
        setLoaded(true);
      }
    }

    loadTheme();
  }, []);

  async function changeTheme(mode: ThemeMode) {
    setThemeMode(mode);

    try {
      await AsyncStorage.setItem("appTheme", mode);
    } catch (error) {
      console.error("Erro ao salvar o tema:", error);
    }
  }

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ themeMode, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme deve ser usado dentro de AppThemeProvider");
  }

  return context;
}
