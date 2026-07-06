import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { auth, db } from "../config/firebase";

export default function Splash() {
  useEffect(() => {
    const timer = setTimeout(() => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
              const role = userDoc.data().role;
              if (role === "admin") {
                router.replace("/admin/dashboard");
              } else {
                router.replace("/warga/dashboard");
              }
            } else {
              router.replace("/login");
            }
          } catch (error) {
            console.error("Error fetching user role:", error);
            router.replace("/login");
          }
        } else {
          router.replace("/login");
        }
      });
      return () => unsubscribe();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>E-Surat</Text>
      <Text style={styles.subtitle}>Sistem Administrasi Desa Digital</Text>
      <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 30 }} />
      <Text style={styles.loading}>Memuat aplikasi...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", justifyContent: "center", alignItems: "center", padding: 24 },
  title: { color: "#6200ee", fontSize: 40, fontWeight: "bold" },
  subtitle: { color: "#666666", marginTop: 8, fontSize: 16, textAlign: "center" },
  loading: { color: "#666666", marginTop: 12 },
});