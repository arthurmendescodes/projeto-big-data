import { usePathname } from "expo-router";
import { useEffect } from "react";
import { BackHandler, Alert } from "react-native";
import { useRouter } from "expo-router";

const ConfirmaVoltar = () => {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const backAction = () => {
      if (pathname === "/home") {
        Alert.alert(
          "Desconectar",
          "Deseja desconectar e voltar à tela de Login?",
          [
            {
              text: "Cancelar",
              onPress: () => null,
              style: "cancel",
            },
            { text: "Sim", onPress: () => router.push("/") },
            // aqui vai a função de deslogar
          ],
        );
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [pathname]);
};
export default ConfirmaVoltar;
