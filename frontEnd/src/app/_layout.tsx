import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
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

function AppNavigation() {
  const { themeMode } = useAppTheme();

  return (
    <NavigationThemeProvider
      value={themeMode === "dark" ? DarkTheme : DefaultTheme}
    >
      <SafeAreaProvider>
        <StatusBar style={themeMode === "dark" ? "light" : "dark"} />

        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />

          <Stack.Screen
            name="(Home)/home"
            options={{
              title: "Home",
              headerBackTitle: "Voltar",
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <AppNavigation />
      </KeyboardAvoidingView>
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
