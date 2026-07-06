import { useState } from "react";
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Text, TextInput, Button, Card } from "react-native-paper";
import { router } from "expo-router";
import { forgotPassword } from "../services/authService";

export default function LupaPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

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
      console.error(error);
      if (error.code === "auth/user-not-found") {
        Alert.alert("Gagal", "Email tidak terdaftar di sistem kami.");
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("Gagal", "Format email tidak valid.");
      } else {
        Alert.alert("Gagal", "Terjadi kesalahan. Pastikan koneksi internet Anda stabil.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title} variant="displaySmall">Reset Password</Text>
        <Text style={styles.subtitle} variant="bodyMedium">
          Masukkan email yang terdaftar. Kami akan mengirimkan tautan untuk membuat password baru.
        </Text>

        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="Email"
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              left={<TextInput.Icon icon="email" />}
            />

            <Button
              mode="contained"
              onPress={handleResetPassword}
              loading={loading}
              disabled={loading}
              style={styles.button}
              buttonColor="#6200ee"
            >
              Kirim Tautan Reset
            </Button>
            
            <Button
              mode="text"
              onPress={() => router.back()}
              style={styles.backButton}
              textColor="#64748b"
            >
              Kembali ke Login
            </Button>
          </Card.Content>
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontWeight: "bold", textAlign: "center", marginBottom: 8, color: "#6200ee" },
  subtitle: { textAlign: "center", marginBottom: 32, color: "#64748b", paddingHorizontal: 10 },
  card: { backgroundColor: "#ffffff", elevation: 2 },
  input: { marginBottom: 16, backgroundColor: "#ffffff" },
  button: { marginTop: 8, paddingVertical: 6, borderRadius: 8 },
  backButton: { marginTop: 16 },
});