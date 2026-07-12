import { useEffect, useState } from "react";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { auth, db } from "../../config/firebase";
import { subscribeToCollection } from "../../services/firestoreService";

export default function AdminDashboard() {
  const [namaAdmin, setNamaAdmin] = useState("Admin");
  const [totalPenduduk, setTotalPenduduk] = useState(0);
  const [totalPermohonan, setTotalPermohonan] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      if (auth.currentUser) {
        try {
          const docRef = doc(db, "users", auth.currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const fullName = docSnap.data().nama || "Admin";
            setNamaAdmin(fullName.split(" ")[0]); 
          }
        } catch (error) {
          console.error("Gagal mengambil nama admin:", error);
        }
      }
    };
    fetchAdminData();

    const unsubPenduduk = subscribeToCollection("penduduk", (data) => {
      setTotalPenduduk(data.length);
    });

    const unsubPermohonan = subscribeToCollection("permohonan_surat", (data) => {
      setTotalPermohonan(data.length);
      const pendingCount = data.filter((item: any) => item.status === "pending").length;
      setTotalPending(pendingCount);
      setLoading(false);
    });

    return () => {
      unsubPenduduk();
      unsubPermohonan();
    };
  }, []);

  const handleLogout = () => {
    Alert.alert("Konfirmasi Keluar", "Apakah Anda yakin ingin keluar dari halaman Admin?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Ya, Keluar",
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
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Menyiapkan Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.appName}>Panel Admin Desaku</Text>
            <Text style={styles.welcome}>Halo, {namaAdmin}!</Text>
            <Text style={styles.subtitle}>Pantau aktivitas desa hari ini</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <MaterialCommunityIcons name="logout" size={24} color="#6200EE" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: "#dbeafe" }]}>
              <MaterialCommunityIcons name="account-group" size={24} color="#2563eb" />
            </View>
            <Text style={styles.statNumber}>{totalPenduduk}</Text>
            <Text style={styles.statLabel}>Penduduk</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: "#f3e8ff" }]}>
              <MaterialCommunityIcons name="file-document-multiple" size={28} color="#9333ea" />
            </View>
            <Text style={styles.statNumber}>{totalPermohonan}</Text>
            <Text style={styles.statLabel}>Total Surat</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: "#fef3c7" }]}>
              <MaterialCommunityIcons name="timer-sand" size={24} color="#d97706" />
            </View>
            <Text style={[styles.statNumber, { color: "#d97706" }]}>{totalPending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Menu Operasional</Text>
        
        <TouchableOpacity style={styles.menuCard} onPress={() => router.push("/admin/penduduk")} activeOpacity={0.7}>
          <View style={[styles.menuIconBox, { backgroundColor: "#e0e7ff" }]}>
            <MaterialCommunityIcons name="card-account-details-outline" size={28} color="#4f46e5" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Kelola Data Penduduk</Text>
            <Text style={styles.menuDesc}>Tambah, edit, dan hapus master data warga</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => router.push("/admin/verifikasi_surat")} activeOpacity={0.7}>
          <View style={[styles.menuIconBox, { backgroundColor: "#dcfce7" }]}>
            <MaterialCommunityIcons name="text-box-check-outline" size={28} color="#16a34a" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Verifikasi Surat</Text>
            <Text style={styles.menuDesc}>Tinjau, setujui, atau tolak pengajuan surat warga</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => router.push("/admin/laporan")} activeOpacity={0.7}>
          <View style={[styles.menuIconBox, { backgroundColor: "#fee2e2" }]}>
            <MaterialCommunityIcons name="chart-box-outline" size={28} color="#dc2626" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Laporan Bulanan</Text>
            <Text style={styles.menuDesc}>Cetak rekapitulasi surat yang telah diterbitkan</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#cbd5e1" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuCard} onPress={() => router.push("/admin/pengaturan")} activeOpacity={0.7}>
          <View style={[styles.menuIconBox, { backgroundColor: "#f1f5f9" }]}>
            <MaterialCommunityIcons name="cog-outline" size={28} color="#475569" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Pengaturan Desa</Text>
            <Text style={styles.menuDesc}>Ubah profil desa, data Kades, dan logo instansi</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#cbd5e1" />
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Panel Admin Desaku v1.0</Text>
          <Text style={styles.footerSubText}>© 2024 - Project PAPB</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  loadingText: { marginTop: 12, fontFamily: "Poppins", fontSize: 13, color: "#64748b" },
  scrollContent: { paddingBottom: 40 },
  
  header: { 
    backgroundColor: "#6200EE", 
    paddingTop: 60, paddingBottom: 30, paddingHorizontal: 24, 
    flexDirection: "row", alignItems: "center",
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    elevation: 5, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }
  },
  appName: { color: "#e0e7ff", fontFamily: "Poppins_500Medium", fontSize: 13, letterSpacing: 1 },
  welcome: { color: "#ffffff", fontFamily: "Poppins_500Medium", fontSize: 26, marginTop: 4 },
  subtitle: { color: "#e0e7ff", fontFamily: "Poppins", fontSize: 14, marginTop: 2 },
  logoutButton: { backgroundColor: "#ffffff", width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", marginLeft: 10, elevation: 3 },
  
  statsContainer: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, marginTop: -20, gap: 10 },
  statCard: { 
    flex: 1, backgroundColor: "#ffffff", borderRadius: 16, padding: 16, alignItems: "center", 
    elevation: 3, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } 
  },
  statIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  statNumber: { fontSize: 24, fontFamily: "Poppins_500Medium", color: "#1e293b", lineHeight: 30 },
  statLabel: { fontSize: 11, fontFamily: "Poppins", color: "#64748b", textAlign: "center" },
  
  sectionTitle: { fontSize: 18, fontFamily: "Poppins_500Medium", color: "#1e293b", marginHorizontal: 24, marginTop: 32, marginBottom: 16 },
  
  menuCard: { 
    flexDirection: "row", alignItems: "center", 
    backgroundColor: "#ffffff", marginHorizontal: 20, marginBottom: 12, 
    borderRadius: 16, padding: 16, 
    elevation: 2, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } 
  },
  menuIconBox: { width: 54, height: 54, borderRadius: 16, justifyContent: "center", alignItems: "center", marginRight: 16 },
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 15, fontFamily: "Poppins_500Medium", color: "#1e293b", marginBottom: 2 },
  menuDesc: { fontSize: 12, fontFamily: "Poppins", color: "#64748b", lineHeight: 18 },
  
  footer: { alignItems: "center", marginTop: 40 },
  footerText: { color: "#64748b", fontFamily: "Poppins_500Medium", fontSize: 13 },
  footerSubText: { color: "#cbd5e1", fontFamily: "Poppins", fontSize: 12, marginTop: 2 },
});