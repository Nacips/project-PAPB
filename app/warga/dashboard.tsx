import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Card, Paragraph, Title } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { auth, db } from "../../config/firebase";

export default function WargaDashboard() {
  const [namaUser, setNamaUser] = useState("Warga");

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        try {
          const docRef = doc(db, "users", auth.currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const fullName = docSnap.data().nama || "Warga";
            setNamaUser(fullName.split(" ")[0]); 
          }
        } catch (error) {
          console.error("Gagal mengambil nama user:", error);
        }
      }
    };
    fetchUserData();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      "Konfirmasi Keluar",
      "Apakah Anda yakin ingin keluar dari aplikasi?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Keluar",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace("/login");
            } catch (error) {
              console.error("Error saat logout:", error);
              Alert.alert("Gagal", "Terjadi kesalahan saat logout.");
            }
          },
        },
      ]
    );
  };

  const MENU_LAYANAN = [
    { id: 1, title: "Domisili", desc: "Ket. Domisili", icon: "home-map-marker", color: "#dbeafe", iconColor: "#2563eb" },
    { id: 2, title: "Usaha", desc: "Ket. Usaha", icon: "briefcase", color: "#dcfce7", iconColor: "#16a34a" },
    { id: 3, title: "SKTM", desc: "Ket. Tidak Mampu", icon: "hand-coin", color: "#fef3c7", iconColor: "#d97706" },
    { id: 4, title: "Kematian", desc: "Ket. Kematian", icon: "coffin", color: "#fee2e2", iconColor: "#dc2626" },
    { id: 5, title: "Kelahiran", desc: "Ket. Kelahiran", icon: "baby-carriage", color: "#e0e7ff", iconColor: "#4f46e5" },
    { id: 6, title: "Lainnya", desc: "Lihat Semua", icon: "dots-grid", color: "#f3e8ff", iconColor: "#9333ea" },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.appName}>Desaku</Text>
          <Text style={styles.welcome}>Halo, {namaUser}!</Text>
          <Text style={styles.subtitle}>Mau urus surat apa hari ini?</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="logout" size={24} color="#6200EE" />
        </TouchableOpacity>
      </View>

      <Card style={styles.announcementCard}>
        <Card.Content style={styles.announcementContent}>
          <MaterialCommunityIcons name="bullhorn-outline" size={28} color="#92400e" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.announcementTitle}>Pengumuman Desa</Text>
            <Text style={styles.announcementText}>
              Layanan e-Surat kini mendukung format dokumen PDF untuk pengajuan yang lebih mudah.
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Text style={styles.sectionTitle}>Layanan Administrasi</Text>

      <View style={styles.menuGrid}>
        {MENU_LAYANAN.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => router.push("/warga/pengajuan_surat")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: item.color }]}>
              <MaterialCommunityIcons name={item.icon as any} size={32} color={item.iconColor} />
            </View>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <Text style={styles.menuDesc}>{item.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Pantau Pengajuan</Text>

      <Card style={styles.statusCard}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <MaterialCommunityIcons name="text-box-search-outline" size={24} color="#64748b" />
            <Text style={styles.statusTitle}>Belum Ada Aktivitas</Text>
          </View>
          <Text style={styles.statusText}>
            Anda belum memiliki pengajuan surat yang sedang diproses. Ajukan surat pertama Anda sekarang.
          </Text>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => router.push("/warga/pengajuan_surat")}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.submitButtonText}>Ajukan Surat Baru</Text>
          </TouchableOpacity>
        </Card.Content>
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Desaku e-Surat v1.0</Text>
        <Text style={styles.footerSubText}>© 2024 - Project PAPB</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#6200EE",
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 5,
  },
  appName: {
    color: "#e0e7ff",
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    letterSpacing: 1,
  },
  welcome: {
    color: "#ffffff",
    fontFamily: "Poppins_500Medium",
    fontSize: 26,
    marginTop: 4,
  },
  subtitle: {
    color: "#e0e7ff",
    fontFamily: "Poppins",
    fontSize: 14,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: "#ffffff",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    elevation: 3,
  },
  announcementCard: {
    marginHorizontal: 20,
    marginTop: -20,
    backgroundColor: "#fef3c7",
    borderRadius: 16,
    elevation: 3,
  },
  announcementContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  announcementTitle: {
    fontSize: 15,
    fontFamily: "Poppins_500Medium",
    color: "#92400e",
  },
  announcementText: {
    fontSize: 12,
    fontFamily: "Poppins",
    color: "#a16207",
    marginTop: 2,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins_500Medium",
    color: "#1e293b",
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 16,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
  },
  menuItem: {
    width: "33.33%",
    padding: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  menuIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  menuTitle: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#1e293b",
    textAlign: "center",
  },
  menuDesc: {
    fontSize: 11,
    fontFamily: "Poppins",
    color: "#64748b",
    textAlign: "center",
    marginTop: 2,
  },
  statusCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 15,
    fontFamily: "Poppins_500Medium",
    color: "#64748b",
    marginLeft: 8,
  },
  statusText: {
    fontSize: 13,
    fontFamily: "Poppins",
    color: "#94a3b8",
    marginBottom: 16,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: "#6200EE",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonText: {
    color: "#ffffff",
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
  },
  footer: {
    alignItems: "center",
    marginVertical: 30,
  },
  footerText: {
    color: "#64748b",
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
  },
  footerSubText: {
    color: "#cbd5e1",
    fontFamily: "Poppins",
    fontSize: 12,
    marginTop: 2,
  },
});