import { useEffect, useState } from "react";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Card, Title, Paragraph, ActivityIndicator } from "react-native-paper";
import { auth } from "../../config/firebase";
import { subscribeToCollection } from "../../services/firestoreService";

export default function AdminDashboard() {
  const [totalPenduduk, setTotalPenduduk] = useState(0);
  const [totalPermohonan, setTotalPermohonan] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubPenduduk = subscribeToCollection("penduduk", (data) => {
      setTotalPenduduk(data.length);
    });

    const unsubPermohonan = subscribeToCollection("permohonan_surat", (data) => {
      setTotalPermohonan(data.length);
      const pendingCount = data.filter((item) => item.status === "pending").length;
      setTotalPending(pendingCount);
      setLoading(false);
    });

    return () => {
      unsubPenduduk();
      unsubPermohonan();
    };
  }, []);

  async function handleLogout() {
    Alert.alert("Logout", "Apakah Anda yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Ya, Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
            router.replace("/login");
          } catch (error) {
            Alert.alert("Error", "Gagal logout.");
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={{ marginTop: 10, color: "#64748b" }}>Memuat data real-time...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.appName}>E-Surat Desa</Text>
          <Text style={styles.welcome}>Halo, Admin!</Text>
          <Text style={styles.subtitle}>Dashboard Real-Time</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>⏻</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Title style={styles.statNumber}>{totalPenduduk}</Title>
            <Paragraph style={styles.statLabel}>Total Penduduk</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <Title style={styles.statNumber}>{totalPermohonan}</Title>
            <Paragraph style={styles.statLabel}>Total Surat</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <Title style={[styles.statNumber, { color: "#f59e0b" }]}>{totalPending}</Title>
            <Paragraph style={styles.statLabel}>Pending</Paragraph>
          </Card.Content>
        </Card>
      </View>

      <Text style={styles.sectionTitle}>Menu Cepat</Text>
      
      <Card style={styles.menuCard}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/admin/penduduk")}>
          <Text style={styles.menuIcon}>👤</Text>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Kelola Data Penduduk</Text>
            <Text style={styles.menuDesc}>Tambah, edit, hapus data warga</Text>
          </View>
        </TouchableOpacity>
      </Card>

      <Card style={styles.menuCard}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/admin/verifikasi_surat")}>
          <Text style={styles.menuIcon}>📝</Text>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Verifikasi Surat</Text>
            <Text style={styles.menuDesc}>Setujui atau tolak pengajuan</Text>
          </View>
        </TouchableOpacity>
      </Card>

      <Card style={styles.menuCard}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/admin/laporan")}>
          <Text style={styles.menuIcon}>📊</Text>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Laporan Bulanan</Text>
            <Text style={styles.menuDesc}>Rekap surat yang diterbitkan</Text>
          </View>
        </TouchableOpacity>
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>E-Surat Desa v1.0</Text>
        <Text style={styles.footerSubText}>© 2024 - Project PAPB</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { backgroundColor: "#6200ee", paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20, flexDirection: "row", alignItems: "center" },
  appName: { color: "#ffffff", fontSize: 26, fontWeight: "bold" },
  welcome: { color: "#e9d5ff", fontSize: 16, marginTop: 4 },
  subtitle: { color: "#d8b4fe", fontSize: 13, marginTop: 2 },
  logoutButton: { backgroundColor: "#ffffff", width: 45, height: 45, borderRadius: 22, justifyContent: "center", alignItems: "center", marginLeft: 10, zIndex: 10 },
  logoutText: { color: "#6200ee", fontSize: 22, fontWeight: "bold" },
  statsContainer: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 15, marginTop: 20 },
  statCard: { flex: 1, marginHorizontal: 5, backgroundColor: "#ffffff", elevation: 2 },
  statNumber: { fontSize: 28, fontWeight: "bold", color: "#6200ee", textAlign: "center" },
  statLabel: { fontSize: 12, color: "#64748b", textAlign: "center", marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#1e293b", marginHorizontal: 20, marginTop: 25, marginBottom: 12 },
  menuCard: { marginHorizontal: 15, marginBottom: 12, backgroundColor: "#ffffff", elevation: 1 },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 16 },
  menuIcon: { fontSize: 32, marginRight: 15 },
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: "600", color: "#1e293b" },
  menuDesc: { fontSize: 13, color: "#94a3b8", marginTop: 2 },
  footer: { alignItems: "center", marginVertical: 30 },
  footerText: { color: "#64748b", fontWeight: "600" },
  footerSubText: { color: "#cbd5e1", fontSize: 12, marginTop: 2 },
});