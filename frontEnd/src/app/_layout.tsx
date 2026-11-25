import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  Stack,
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppThemeProvider, useAppTheme } from "@/components/ThemeContext";

import { AuthProvider, useAuth } from "@/components/AuthContext";

function AppNavigation() {
  const { themeMode } = useAppTheme();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationThemeProvider
      value={themeMode === "dark" ? DarkTheme : DefaultTheme}
    >
      <SafeAreaProvider>
        <StatusBar style={themeMode === "dark" ? "light" : "dark"} />

        <Stack>
          <Stack.Protected guard={!isAuthenticated}>
            <Stack.Screen
              name="index"
              options={{ headerShown: false }}
            />
          </Stack.Protected>

          <Stack.Protected guard={isAuthenticated}>
            <Stack.Screen
              name="(Home)/home"
              options={{
                title: "Home",
                headerBackTitle: "Voltar",
              }}
            />

            <Stack.Screen name="(estoque)/estoque" />

            <Stack.Screen name="(Eventos)/eventos" />

            <Stack.Screen name="(Eventos)/addEvento" />

            <Stack.Screen name="(Eventos)/historicoEventos" />

            <Stack.Screen name="(financeiro)/financeiro" />

            <Stack.Screen name="(dashboard)/dashboard" />

            <Stack.Screen name="(Configuracoes)/config" />

            <Stack.Screen name="(Eventos)/eventosAgendados" />

            <Stack.Screen name="(Eventos)/realizarEvento" />

            <Stack.Screen name="(estoque)/reporEstoque" />

            <Stack.Screen name="(estoque)/historicoMovimentacoes" />

            <Stack.Screen name="(financeiro)/lancamentosFinanceiros" />

          </Stack.Protected>
        </Stack>

      </SafeAreaProvider>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <AppNavigation />
        </KeyboardAvoidingView>
      </AuthProvider>
    </AppThemeProvider>
  );
}

// import { StatusBar } from "expo-status-bar";
// import { Stack, DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
// import { useColorScheme } from "react-native";
// import { SafeAreaProvider } from "react-native-safe-area-context";

// export default function RootLayout() {
//   const colorScheme = useColorScheme();
//   return (
//     <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
//       <SafeAreaProvider>
//         <StatusBar />

//         <Stack>
//           <Stack.Screen
//             name="index"
//             options={{
//               headerShown: false,
//             }}
//           />

//           <Stack.Screen
//             name="(Home)/home"
//             options={{
//               title: "Home",
//               headerBackTitle: "Voltar",
//             }}
//           />
//         </Stack>
//       </SafeAreaProvider>
//     </ThemeProvider>
//   );
// }

// PADRAO EXPO----------

// import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
// import * as SplashScreen from "expo-splash-screen";
// import { useColorScheme } from "react-native";

// import { AnimatedSplashOverlay } from "@/components/animated-icon";
// import AppTabs from "@/components/app-tabs";

// SplashScreen.preventAutoHideAsync();

// export default function TabLayout() {
//   const colorScheme = useColorScheme();
//   return (
//     <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
//       <AnimatedSplashOverlay />
//       <AppTabs />
//     </ThemeProvider>
//   );
// }
