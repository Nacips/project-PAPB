import { router } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { auth, db } from "../config/firebase";

export default function Register() {
  const [nama, setNama] = useState("");
  const [nik, setNik] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (nama.trim() === "" || nik.trim() === "" || email.trim() === "" || password.trim() === "") {
      Alert.alert("Peringatan", "Semua field wajib diisi."); return;
    }
    if (nik.length !== 16) {
      Alert.alert("Peringatan", "NIK harus terdiri dari 16 digit."); return;
    }
    if (password.length < 6) {
      Alert.alert("Peringatan", "Password minimal 6 karakter."); return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        nama: nama,
        email: email,
        nik: nik,
        role: "warga",
        noHp: "",
        fotoProfileUrl: "",
        createdAt: new Date().toISOString(),
      });

      Alert.alert("Berhasil", "Akun berhasil dibuat. Silakan login.");
      router.replace("/login");
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") Alert.alert("Register Gagal", "Email sudah digunakan.");
      else Alert.alert("Register Gagal", "Terjadi kesalahan saat membuat akun.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.content}>
        <Text style={styles.title} variant="displaySmall">Daftar Warga</Text>
        <Text style={styles.subtitle} variant="bodyMedium">Lengkapi data diri Anda untuk mendaftar</Text>

        <TextInput label="NIK (16 Digit)" mode="outlined" style={styles.input} keyboardType="numeric" maxLength={16} value={nik} onChangeText={setNik} left={<TextInput.Icon icon="card-account-details" />} />
        <TextInput label="Nama Lengkap" mode="outlined" style={styles.input} value={nama} onChangeText={setNama} left={<TextInput.Icon icon="account" />} />
        <TextInput label="Email" mode="outlined" style={styles.input} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} left={<TextInput.Icon icon="email" />} />
        <TextInput label="Password (Min. 6 Karakter)" mode="outlined" style={styles.input} secureTextEntry value={password} onChangeText={setPassword} left={<TextInput.Icon icon="lock" />} />

        <Button mode="contained" onPress={handleRegister} loading={loading} disabled={loading} style={styles.button} buttonColor="#6200ee">Daftar</Button>

        <View style={styles.loginContainer}>
          <Text variant="bodyMedium">Sudah punya akun? </Text>
          <Button mode="text" compact onPress={() => router.replace("/login")} textColor="#6200ee">Login di sini</Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  content: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontWeight: "bold", textAlign: "center", marginBottom: 8, color: "#6200ee" },
  subtitle: { textAlign: "center", marginBottom: 32, color: "#666666" },
  input: { marginBottom: 16, backgroundColor: "#ffffff" },
  button: { marginTop: 8, paddingVertical: 4, borderRadius: 8 },
  loginContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 16 },
});