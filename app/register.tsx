import { router } from "expo-router";
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from "firebase/auth";
import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";
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

export default function Register() {
  const [nama, setNama] = useState("");
  const [nik, setNik] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  async function handleRegister() {
    if (!nama.trim() || !nik.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Peringatan", "Semua field wajib diisi."); 
      return;
    }
    if (nik.length !== 16) {
      Alert.alert("Peringatan", "NIK harus terdiri dari 16 digit."); 
      return;
    }
    if (password.length < 6) {
      Alert.alert("Peringatan", "Kata sandi minimal 6 karakter."); 
      return;
    }

    setLoading(true);

    try {
      console.log("=== MEMULAI VALIDASI REGISTRASI ===");
      console.log("1. Mengecek NIK di tabel 'penduduk'...");
      
      const qPenduduk = query(collection(db, "penduduk"), where("nik", "==", nik));
      const snapPenduduk = await getDocs(qPenduduk);

      if (snapPenduduk.empty) {
        console.log("❌ NIK tidak ditemukan di tabel penduduk.");
        Alert.alert(
          "Data Tidak Ditemukan", 
          "NIK Anda tidak terdaftar dalam database desa. Pastikan NIK benar atau silakan lapor ke balai desa."
        );
        setLoading(false);
        return;
      }

      const dataPenduduk = snapPenduduk.docs[0].data();
      console.log("✅ NIK ditemukan di tabel penduduk atas nama:", dataPenduduk.nama);

      if (dataPenduduk.nama.toLowerCase() !== nama.toLowerCase()) {
        console.log("❌ Nama tidak cocok. Input:", nama, "| Database:", dataPenduduk.nama);
        Alert.alert(
          "Data Tidak Cocok", 
          "Nama Lengkap yang Anda masukkan tidak sama dengan nama yang terdaftar untuk NIK tersebut di sistem desa."
        );
        setLoading(false);
        return;
      }

      console.log("2. Mengecek status email di Firebase Auth...");
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      if (signInMethods.length > 0) {
        console.log("❌ Email sudah dipakai di Auth:", email);
        Alert.alert("Pendaftaran Ditolak", "Email ini sudah digunakan oleh akun lain. Silakan gunakan email berbeda.");
        setLoading(false);
        return;
      }

      console.log("3. Mengecek apakah NIK sudah dipakai di tabel 'users'...");
      const qUsers = query(collection(db, "users"), where("nik", "==", nik));
      const snapUsers = await getDocs(qUsers);

      if (!snapUsers.empty) {
        const existingUserData = snapUsers.docs[0].data();
        const existingEmail = existingUserData.email;
        
        console.log("⚠️ NIK ditemukan di tabel users terkait dengan email:", existingEmail);

        const isExistingEmailActive = await fetchSignInMethodsForEmail(auth, existingEmail);
        
        if (isExistingEmailActive.length > 0) {
           console.log("❌ Akun benar-benar aktif dan sudah dipakai orang lain.");
           Alert.alert(
            "NIK Sudah Terdaftar", 
            "Akun dengan NIK ini SUDAH VALID terdaftar di sistem. Jika Anda merasa data Anda disalahgunakan, gunakan menu Lapor Akun."
          );
          setLoading(false);
          return;
        } else {
           console.log("✅ Akun tersebut adalah data residu (Auth kosong). Sistem akan menimpa (overwrite) datanya.");
        }
      }

      console.log("4. Memproses pembuatan akun di Firebase Auth...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      console.log("✅ Akun Auth berhasil dibuat! Menyimpan/menimpa ke Firestore tabel users...");
      
      await setDoc(doc(db, "users", userCredential.user.uid), {
        nama: dataPenduduk.nama, 
        email: email,
        nik: nik,
        role: "warga",
        noHp: dataPenduduk.noHp || "",
        fotoProfileUrl: "",
        createdAt: new Date().toISOString(),
      });

      console.log("=== REGISTRASI SELESAI ===");
      Alert.alert("Berhasil", "Akun berhasil dibuat! Silakan masuk.");
      router.replace("/login");

    } catch (error: any) {
      console.error("❌ Register Error:", error); 
      
      if (error.code === "permission-denied") {
        Alert.alert(
          "Akses Ditolak (Database)", 
          "Sistem gagal membaca NIK karena aturan keamanan (Security Rules) Firebase memblokirnya."
        );
      } else if (error.code === "auth/email-already-in-use") {
        Alert.alert("Gagal", "Email ini sudah didaftarkan pada akun lain.");
      } else {
        Alert.alert("Pendaftaran Gagal", error.message || "Terjadi kesalahan pada sistem database.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <ImageBackground source={require('../assets/images/bg-1.jpeg')} style={styles.bgImage}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView 
              contentContainerStyle={styles.scrollContent} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Animated.View style={{ opacity: fadeAnim, width: "100%" }}>
                
                <View style={styles.header}>
                  <Text style={styles.title}>Registrasi Warga</Text>
                  <Text style={styles.subtitle}>Sistem akan mencocokkan data Anda</Text>
                </View>

                <View style={styles.formContainer}>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.label}>NIK (16 Digit)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Masukkan 16 Digit NIK"
                      placeholderTextColor="#8E8E93"
                      keyboardType="numeric"
                      maxLength={16}
                      value={nik}
                      onChangeText={setNik}
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Nama Lengkap (Sesuai KTP)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Masukkan nama asli"
                      placeholderTextColor="#8E8E93"
                      value={nama}
                      onChangeText={setNama}
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Email Aktif</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Untuk akses login"
                      placeholderTextColor="#8E8E93"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Kata Sandi</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Minimal 6 Karakter"
                      placeholderTextColor="#8E8E93"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                    />
                  </View>

                  <TouchableOpacity 
                    style={[styles.btn, loading && { opacity: 0.7 }]} 
                    onPress={handleRegister} 
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnText}>{loading ? "Memvalidasi Data..." : "Daftar Akun"}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.btnReport} 
                    onPress={() => router.push("/lapor_akun")}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnReportText}>NIK Sudah Terpakai? Lapor Di Sini</Text>
                  </TouchableOpacity>

                  <View style={styles.loginContainer}>
                    <Text style={styles.logText}>Sudah punya akun? </Text>
                    <TouchableOpacity onPress={() => router.replace("/login")}>
                      <Text style={styles.logLink}>Masuk di sini</Text>
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
  
  header: { marginBottom: 30, alignItems: "center", marginTop: 40 },
  title: { fontSize: 26, fontFamily: "Poppins_500Medium", color: "#ffffff", marginBottom: 8 },
  subtitle: { fontSize: 13, fontFamily: "Poppins", color: "#8E8E93", textAlign: "center" },
  
  formContainer: { width: "100%" },
  inputWrapper: { marginBottom: 20 },
  label: { color: "#D1D1D6", fontFamily: "Poppins", fontSize: 13, marginBottom: 8, marginLeft: 4 },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16,
    color: "#ffffff", fontFamily: "Poppins",
  },
  
  btn: { backgroundColor: "#6200EE", paddingVertical: 16, borderRadius: 16, alignItems: "center", marginTop: 10 },
  btnText: { color: "#ffffff", fontFamily: "Poppins_500Medium", fontSize: 15 },

  btnReport: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#ef4444", paddingVertical: 14, borderRadius: 16, alignItems: "center", marginTop: 16 },
  btnReportText: { color: "#fca5a5", fontFamily: "Poppins_500Medium", fontSize: 13 },
  
  loginContainer: { flexDirection: "row", justifyContent: "center", marginTop: 30, marginBottom: 20 },
  logText: { color: "#8E8E93", fontFamily: "Poppins", fontSize: 13 },
  logLink: { color: "#ffffff", fontFamily: "Poppins_500Medium", fontSize: 13 },
});