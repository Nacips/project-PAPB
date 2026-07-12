import { useState, useEffect, useRef } from "react";
import { 
  View, StyleSheet, Alert, KeyboardAvoidingView, Platform, 
  ImageBackground, Text, TextInput, TouchableOpacity, ScrollView, Animated
} from "react-native";
import { router } from "expo-router";
import { forgotPassword } from "../services/authService";
import { Zocial } from "@expo/vector-icons";

export default function LupaPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Peringatan", "Masukkan alamat email Anda terlebih dahulu.");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      Alert.alert(
        "Berhasil!",
        "Tautan untuk reset password telah dikirim ke email Anda. Silakan cek inbox atau folder spam.",
        [{ text: "OK", onPress: () => router.replace("/login") }]
      );
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        Alert.alert("Gagal", "Email tidak terdaftar di sistem kami.");
      } else {
        Alert.alert("Gagal", "Format email tidak valid atau terjadi kesalahan.");
      }Zocial
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground source={require("../assets/images/bg-2.jpeg")} style={styles.bgImage}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <Animated.View style={{ opacity: fadeAnim, width: "100%" }}>
                
                <View style={styles.header}>
                  <Text style={styles.title}>Lupa Kata Sandi?</Text>
                  <Text style={styles.subtitle}>
                    Masukkan email terdaftar Anda. Kami akan mengirimkan tautan pemulihan sandi.
                  </Text>
                </View>

                <View style={styles.formContainer}>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Masukkan Email Anda"
                      placeholderTextColor="#8E8E93"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>

                  <TouchableOpacity 
                    style={[styles.btn, loading && { opacity: 0.7 }]} 
                    onPress={handleResetPassword} 
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnText}>{loading ? "Mengirim..." : "Kirim Tautan"}</Text>
                  </TouchableOpacity>

                  <View style={styles.loginContainer}>
                    <TouchableOpacity onPress={() => router.replace("/login")}>
                      <Text style={styles.logLink}>Kembali ke Login</Text>
                    </TouchableOpacity>
                  </View>
                </View>

              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A12" },
  bgImage: { flex: 1, width: "100%", height: "100%" },
  overlay: { flex: 1, backgroundColor: "rgba(10, 10, 18, 0.85)" },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 30, paddingVertical: 40 },
  
  header: { marginBottom: 40, alignItems: "center" },
  title: { fontSize: 28, fontFamily: "Poppins_500Medium", color: "#ffffff", marginBottom: 12 },
  subtitle: { fontSize: 14, fontFamily: "Poppins", color: "#8E8E93", textAlign: "center", lineHeight: 22 },
  
  formContainer: { width: "100%" },
  inputWrapper: { marginBottom: 30 },
  label: { color: "#D1D1D6", fontFamily: "Poppins", fontSize: 13, marginBottom: 8, marginLeft: 4 },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16,
    color: "#ffffff", fontFamily: "Poppins",
  },
  
  btn: { backgroundColor: "#6200EE", paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  btnText: { color: "#ffffff", fontFamily: "Poppins_500Medium", fontSize: 16 },
  
  loginContainer: { flexDirection: "row", justifyContent: "center", marginTop: 30 },
  logLink: { color: "#ffffff", fontFamily: "Poppins_500Medium", fontSize: 14, textDecorationLine: "underline" },
});