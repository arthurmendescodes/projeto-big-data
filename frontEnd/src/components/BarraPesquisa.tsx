import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";

import type { TextInputProps } from "react-native";
import { ThemedTextInput } from "@/components/ThemedTextInput";

import { useTheme } from "@/hooks/use-theme";

export default function BarraPesquisa({
  value,
  onChangeText,
}: Pick<TextInputProps, "value" | "onChangeText">) {
  const theme = useTheme();

  return (
    <ThemedTextInput
      style={[
        styles.input,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder="Procurar item..."
    />
  );
}

const styles = StyleSheet.create({
  input: {
    alignItems: "center",
    margin: 10,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    textAlignVertical: "top",
  },
});
