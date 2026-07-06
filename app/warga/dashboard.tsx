import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Card, Paragraph, Title } from "react-native-paper";
import { auth } from "../../config/firebase";

export default function WargaDashboard() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    try {
      console.log("Tombol logout ditekan...");
      await signOut(auth);
      console.log("Berhasil logout dari Firebase");

      router.replace("/login");
    } catch (error) {
      console.error("Error saat logout:", error);
      Alert.alert("Gagal", "Terjadi kesalahan saat logout.");
    }
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.appName}>E-Surat Desa</Text>
          <Text style={styles.welcome}>Halo, Warga!</Text>
          <Text style={styles.subtitle}>Ajukan surat dengan mudah</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>⏻</Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.announcementCard}>
        <Card.Content>
          <Title style={styles.announcementTitle}>📢 Pengumuman</Title>
          <Paragraph style={styles.announcementText}>
            Selamat datang di aplikasi E-Surat Desa. Anda sekarang bisa
            mengajukan surat secara online tanpa perlu datang ke balai desa.
          </Paragraph>
        </Card.Content>
      </Card>

      <Text style={styles.sectionTitle}>Layanan Surat</Text>

      <View style={styles.menuGrid}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/warga/pengajuan_surat")}
        >
          <View style={[styles.menuIconBox, { backgroundColor: "#dbeafe" }]}>
            <Text style={styles.menuIcon}>📄</Text>
          </View>
          <Text style={styles.menuTitle}>Surat Domisili</Text>
          <Text style={styles.menuDesc}>Keterangan Domisili</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuIconBox, { backgroundColor: "#dcfce7" }]}>
            <Text style={styles.menuIcon}>💼</Text>
          </View>
          <Text style={styles.menuTitle}>Surat Usaha</Text>
          <Text style={styles.menuDesc}>Keterangan Usaha</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuIconBox, { backgroundColor: "#fef3c7" }]}>
            <Text style={styles.menuIcon}>🎓</Text>
          </View>
          <Text style={styles.menuTitle}>Surat Keterangan</Text>
          <Text style={styles.menuDesc}>Umum</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuIconBox, { backgroundColor: "#f3e8ff" }]}>
            <Text style={styles.menuIcon}>📋</Text>
          </View>
          <Text style={styles.menuTitle}>Lihat Semua</Text>
          <Text style={styles.menuDesc}>Jenis Surat</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Status Pengajuan</Text>

      <Card style={styles.statusCard}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <Title style={styles.statusTitle}>Belum Ada Pengajuan</Title>
          </View>
          <Paragraph style={styles.statusText}>
            Anda belum memiliki pengajuan surat. Klik tombol di bawah untuk
            mengajukan surat baru.
          </Paragraph>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => router.push("/warga/pengajuan_surat")}
          >
            <Text style={styles.submitButtonText}>+ Ajukan Surat Baru</Text>
          </TouchableOpacity>
        </Card.Content>
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>E-Surat Desa v1.0</Text>
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
    backgroundColor: "#0284c7",
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  appName: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "bold",
  },
  welcome: {
    color: "#bae6fd",
    fontSize: 16,
    marginTop: 4,
  },
  subtitle: {
    color: "#7dd3fc",
    fontSize: 13,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: "#ffffff",
    width: 45,
    height: 45,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  logoutText: {
    color: "#0284c7",
    fontSize: 22,
    fontWeight: "bold",
  },
  announcementCard: {
    margin: 15,
    backgroundColor: "#fef3c7",
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#92400e",
  },
  announcementText: {
    fontSize: 13,
    color: "#a16207",
    marginTop: 6,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 15,
  },
  menuItem: {
    width: "50%",
    padding: 15,
    alignItems: "center",
  },
  menuIconBox: {
    width: 70,
    height: 70,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  menuIcon: {
    fontSize: 32,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "center",
  },
  menuDesc: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 2,
  },
  statusCard: {
    marginHorizontal: 15,
    marginBottom: 20,
    backgroundColor: "#ffffff",
    elevation: 2,
  },
  statusHeader: {
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#64748b",
  },
  statusText: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 15,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: "#0284c7",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },
  footer: {
    alignItems: "center",
    marginVertical: 30,
  },
  footerText: {
    color: "#64748b",
    fontWeight: "600",
  },
  footerSubText: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 2,
  },
});
