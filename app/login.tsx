import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../config/firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  async function handleLogin() {
    if (email.trim() === "" || password.trim() === "") {
      Alert.alert("Peringatan", "Email dan password wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const role = userDoc.data().role;
        if (role === "admin") router.replace("/admin/dashboard");
        else if (role === "warga") router.replace("/warga/dashboard");
        else {
          Alert.alert("Error", `Role '${role}' tidak dikenali.`);
          await auth.signOut();
        }
      } else {
        Alert.alert("Error", "Data user tidak ditemukan di database.");
        await auth.signOut();
      }
    } catch (error: any) {
      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        Alert.alert("Login Gagal", "Email atau password salah.");
      } else {
        Alert.alert("Login Gagal", "Terjadi kesalahan. Coba lagi nanti.");
      }
    } finally {
      setLoading(false);
    }
  }

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
                  <Text style={styles.title}>Selamat Datang</Text>
                  <Text style={styles.subtitle}>Masuk ke akun Anda untuk melanjutkan</Text>
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

                  <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Kata Sandi</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={styles.inputPassword}
                        placeholder="Masukkan Kata Sandi"
                        placeholderTextColor="#8E8E93"
                        secureTextEntry={secureText}
                        value={password}
                        onChangeText={setPassword}
                      />
                      <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.eyeIcon}>
                        <Text style={{ color: "#8E8E93" }}>{secureText ? "Tampil" : "Sembunyi"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.forgotBtn} onPress={() => router.push("/lupa_password")}>
                    <Text style={styles.forgotText}>Lupa Password?</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.btn, loading && { opacity: 0.7 }]} 
                    onPress={handleLogin} 
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnText}>{loading ? "Memproses..." : "Masuk"}</Text>
                  </TouchableOpacity>

                  <View style={styles.registerContainer}>
                    <Text style={styles.regText}>Belum punya akun? </Text>
                    <TouchableOpacity onPress={() => router.push("/register")}>
                      <Text style={styles.regLink}>Daftar di sini</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.reportContainer}>
                    <Text style={styles.regText}>Ada masalah dengan NIK Anda? </Text>
                    <TouchableOpacity onPress={() => router.push("/lapor_akun")}>
                      <Text style={styles.reportLink}>Lapor di sini</Text>
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
  title: { fontSize: 28, fontFamily: "Poppins_500Medium", color: "#ffffff", marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: "Poppins", color: "#8E8E93" },
  
  formContainer: { width: "100%" },
  inputWrapper: { marginBottom: 20 },
  label: { color: "#D1D1D6", fontFamily: "Poppins", fontSize: 13, marginBottom: 8, marginLeft: 4 },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16,
    color: "#ffffff", fontFamily: "Poppins",
  },
  passwordContainer: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16, paddingRight: 16,
  },
  inputPassword: {
    flex: 1, paddingHorizontal: 16, paddingVertical: 16,
    color: "#ffffff", fontFamily: "Poppins",
  },
  eyeIcon: { padding: 4 },
  
  forgotBtn: { alignSelf: "flex-end", marginBottom: 30 },
  forgotText: { color: "#D1D1D6", fontFamily: "Poppins", fontSize: 13 },
  
  btn: { backgroundColor: "#6200EE", paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  btnText: { color: "#ffffff", fontFamily: "Poppins_500Medium", fontSize: 16 },
  
  registerContainer: { flexDirection: "row", justifyContent: "center", marginTop: 30 },
  regText: { color: "#8E8E93", fontFamily: "Poppins", fontSize: 13 },
  regLink: { color: "#ffffff", fontFamily: "Poppins_500Medium", fontSize: 13 },

  reportContainer: { flexDirection: "row", justifyContent: "center", marginTop: 15 },
  reportLink: { color: "#fca5a5", fontFamily: "Poppins_500Medium", fontSize: 13, textDecorationLine: "underline" },
});