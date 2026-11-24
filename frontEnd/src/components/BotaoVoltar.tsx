import { TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

import { useTheme } from "@/hooks/use-theme";

export function BotaoVoltar() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={{
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
      }}
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      hitSlop={8}
    >
      <ArrowLeft size={24} color={theme.text} />
    </TouchableOpacity>
  );
}
