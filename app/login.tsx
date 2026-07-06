import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    View,
} from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { auth, db } from "../config/firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);

  async function handleLogin() {
    if (email.trim() === "" || password.trim() === "") {
      Alert.alert("Peringatan", "Email dan password wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));

      console.log("=====================================");
      console.log("🔍 DEBUG LOGIN");
      console.log("=====================================");
      console.log("UID User:", user.uid);
      console.log("Email:", user.email);
      console.log("Dokumen ada?", userDoc.exists());

      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log("📦 SEMUA Data Firestore:", JSON.stringify(data, null, 2));
        console.log("🔑 Field 'role' bernilai:", data.role);
        console.log("📝 Type of role:", typeof data.role);

        const role = data.role;

        if (!role) {
          console.warn("⚠️ PERINGATAN: Field 'role' TIDAK ADA di Firestore!");
          console.warn(
            "⚠️ Silakan tambahkan field 'role' = 'admin' di Firebase Console",
          );
          Alert.alert(
            "Error Konfigurasi",
            "Field 'role' tidak ditemukan di database. Silakan hubungi admin untuk memperbaiki data user Anda.",
          );
          await auth.signOut();
          setLoading(false);
          return;
        }

        console.log("✅ Role terdeteksi:", role);
        console.log("=====================================");

        if (role === "admin") {
          console.log("🚀 Redirect ke: /admin/dashboard");
          router.replace("/admin/dashboard");
        } else if (role === "warga") {
          console.log("🚀 Redirect ke: /warga/dashboard");
          router.replace("/warga/dashboard");
        } else {
          console.error("❌ Role tidak dikenali:", role);
          Alert.alert("Error", `Role '${role}' tidak dikenali oleh sistem.`);
          await auth.signOut();
        }
      } else {
        console.error("❌ Dokumen user TIDAK DITEMUKAN di Firestore!");
        Alert.alert("Error", "Data user tidak ditemukan di database.");
        await auth.signOut();
      }
    } catch (error: any) {
      console.error("❌ ERROR LOGIN:", error);
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password"
      ) {
        Alert.alert("Login Gagal", "Email atau password salah.");
      } else if (error.code === "auth/too-many-requests") {
        Alert.alert(
          "Login Gagal",
          "Terlalu banyak percobaan. Coba lagi nanti.",
        );
      } else {
        Alert.alert(
          "Login Gagal",
          error.message || "Terjadi kesalahan. Coba lagi nanti.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title} variant="displaySmall">
          Login E-Surat
        </Text>
        <Text style={styles.subtitle} variant="bodyMedium">
          Masuk ke akun Anda untuk melanjutkan
        </Text>

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
        <TextInput
          label="Password"
          mode="outlined"
          style={styles.input}
          secureTextEntry={secureText}
          value={password}
          onChangeText={setPassword}
          left={<TextInput.Icon icon="lock" />}
          right={
            <TextInput.Icon
              icon={secureText ? "eye-off" : "eye"}
              onPress={() => setSecureText(!secureText)}
            />
          }
        />

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={styles.button}
          buttonColor="#6200ee"
        >
          Masuk
        </Button>
        <Button
          mode="text"
          onPress={() => router.push("/lupa_password")}
          style={styles.forgotButton}
        >
          Lupa Password?
        </Button>

        <View style={styles.registerContainer}>
          <Text variant="bodyMedium">Belum punya akun? </Text>
          <Button
            mode="text"
            compact
            onPress={() => router.push("/register")}
            textColor="#6200ee"
          >
            Daftar di sini
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  content: { flex: 1, justifyContent: "center", padding: 24 },
  title: {
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#6200ee",
  },
  subtitle: { textAlign: "center", marginBottom: 32, color: "#666666" },
  input: { marginBottom: 16, backgroundColor: "#ffffff" },
  button: { marginTop: 8, paddingVertical: 4, borderRadius: 8 },
  forgotButton: { marginTop: 8 },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
});
