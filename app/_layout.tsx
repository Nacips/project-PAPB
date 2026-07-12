import { useEffect } from "react";
import { Stack } from "expo-router";
import { PaperProvider, configureFonts, MD3LightTheme } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { 
  useFonts, 
  Poppins_400Regular, 
  Poppins_500Medium 
} from "@expo-google-fonts/poppins";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins: Poppins_400Regular,
    Poppins_Medium: Poppins_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const fontConfig = {
    fontFamily: "Poppins",
  };
  
  const theme = {
    ...MD3LightTheme,
    fonts: configureFonts({ config: fontConfig }),
  };

  return (
    <PaperProvider theme={theme}>
      <StatusBar style="light" />
      
      <Stack 
        screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0A12' },
          animation: "fade"
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="splash" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="lupa_password" />
        
        <Stack.Screen name="admin" />
        <Stack.Screen name="warga" />
      </Stack>
    </PaperProvider>
  );
}