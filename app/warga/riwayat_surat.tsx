import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Card, Chip, Button, Searchbar } from "react-native-paper";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../config/firebase";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { downloadAsync } from "expo-file-system";

type RiwayatItem = {
  id: string;
  kode_permohonan: string;
  nama_jenis_surat: string;
  keperluan: string;
  status: string;
  tanggal_pengajuan: string;
  nomor_surat?: string;
};

export default function RiwayatSurat() {
  const [data, setData] = useState<RiwayatItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("semua");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "permohonan_surat"),
      where("user_uid", "==", user.uid)
    );
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const hasil = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as RiwayatItem[];
        
        hasil.sort((a, b) => 
          new Date(b.tanggal_pengajuan).getTime() - new Date(a.tanggal_pengajuan).getTime()
        );
        
        setData(hasil);
      },
      (error) => {
        console.error("Error:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredData = data.filter((item) => {
    const matchStatus = filterStatus === "semua" || item.status === filterStatus;
    const matchSearch = item.nama_jenis_surat.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       item.kode_permohonan.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "#f59e0b";
      case "proses": return "#3b82f6";
      case "disetujui": return "#10b981";
      case "ditolak": return "#ef4444";
      default: return "#6b7280";
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Riwayat Surat</Text>
      <Text style={styles.subHeader}>Semua pengajuan surat Anda</Text>

      <Searchbar
        placeholder="Cari jenis surat atau kode..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {["semua", "pending", "proses", "disetujui", "ditolak"].map((status) => (
          <Chip
            key={status}
            selected={filterStatus === status}
            onPress={() => setFilterStatus(status)}
            style={[
              styles.filterChip,
              filterStatus === status && { backgroundColor: getStatusColor(status) }
            ]}
            textStyle={[
              styles.filterText,
              filterStatus === status && { color: "#ffffff" }
            ]}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Chip>
        ))}
      </ScrollView>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{data.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: "#10b981" }]}>
            {data.filter(d => d.status === "disetujui").length}
          </Text>
          <Text style={styles.statLabel}>Disetujui</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: "#f59e0b" }]}>
            {data.filter(d => d.status === "pending").length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {filteredData.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>Tidak ada data yang cocok</Text>
          </Card.Content>
        </Card>
      ) : (
        filteredData.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => {
              router.push("/warga/status_permohonan");
            }}
          >
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <View style={styles.leftContent}>
                    <Text style={styles.kodeSurat}>{item.kode_permohonan}</Text>
                    <Text style={styles.jenisSurat}>{item.nama_jenis_surat}</Text>
                  </View>
                  <Chip 
                    style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
                    textStyle={styles.statusChipText}
                  >
                    {item.status}
                  </Chip>
                </View>

                <Text style={styles.keperluan}>{item.keperluan}</Text>
                
                <View style={styles.footer}>
                  <Text style={styles.tanggal}>
                    📅 {new Date(item.tanggal_pengajuan).toLocaleDateString("id-ID")}
                  </Text>
                  {item.nomor_surat && (
                    <Text style={styles.nomorSurat}>
                      No: {item.nomor_surat}
                    </Text>
                  )}
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))
      )}

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  header: { fontSize: 24, fontWeight: "bold", color: "#1e293b", marginTop: 20 },
  subHeader: { fontSize: 14, color: "#64748b", marginBottom: 20 },
  searchBar: { marginBottom: 16, backgroundColor: "#ffffff", elevation: 2 },
  filterContainer: { marginBottom: 16 },
  filterChip: { marginRight: 8, backgroundColor: "#ffffff" },
  filterText: { fontSize: 12 },
  statsContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: "#ffffff", padding: 16, marginHorizontal: 4, borderRadius: 12, elevation: 2, alignItems: "center" },
  statNumber: { fontSize: 24, fontWeight: "bold", color: "#6200ee" },
  statLabel: { fontSize: 12, color: "#64748b", marginTop: 4 },
  emptyCard: { backgroundColor: "#ffffff", padding: 20 },
  emptyText: { textAlign: "center", color: "#64748b", fontSize: 14 },
  card: { backgroundColor: "#ffffff", marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  leftContent: { flex: 1 },
  kodeSurat: { fontSize: 12, color: "#6200ee", fontWeight: "600", marginBottom: 4 },
  jenisSurat: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  statusChip: { height: 28, marginLeft: 8 },
  statusChipText: { color: "#ffffff", fontSize: 11, fontWeight: "bold" },
  keperluan: { fontSize: 14, color: "#475569", marginBottom: 12 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tanggal: { fontSize: 12, color: "#64748b" },
  nomorSurat: { fontSize: 12, color: "#10b981", fontWeight: "600" },
});