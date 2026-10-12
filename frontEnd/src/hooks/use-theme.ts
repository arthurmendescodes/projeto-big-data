/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

// import { Colors } from "@/constants/theme";
// import { useColorScheme } from "@/hooks/use-color-scheme";

// export function useTheme() {
//   const scheme = useColorScheme();
//   const theme = scheme === "unspecified" ? "light" : scheme;

//   return Colors[theme];
// }

import { Colors } from "@/constants/theme";
import { useAppTheme } from "@/components/ThemeContext";

export function useTheme() {
  const { themeMode } = useAppTheme();

  return Colors[themeMode];
}
