import { useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View, Linking } from "react-native";
import { Card, Chip, Button } from "react-native-paper";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../config/firebase";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
type Permohonan = {
  id: string;
  kode_permohonan: string;
  nama_jenis_surat: string;
  keperluan: string;
  status: string;
  catatan_admin?: string;
  nomor_surat?: string;
  tanggal_pengajuan: string;
  surat_pdf_url?: string;
};

export default function StatusPermohonan() {
  const [data, setData] = useState<Permohonan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        })) as Permohonan[];
        
        hasil.sort((a, b) => 
          new Date(b.tanggal_pengajuan).getTime() - new Date(a.tanggal_pengajuan).getTime()
        );
        
        setData(hasil);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error("Error listening:", error);
        Alert.alert("Error", "Gagal memuat data status.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "#f59e0b";
      case "proses": return "#3b82f6";
      case "disetujui": return "#10b981";
      case "ditolak": return "#ef4444";
      default: return "#6b7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return "⏳";
      case "proses": return "🔄";
      case "disetujui": return "✅";
      case "ditolak": return "❌";
      default: return "❓";
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Memuat status...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.header}>Status Permohonan</Text>
      <Text style={styles.subHeader}>Pantau perkembangan surat Anda secara real-time</Text>

      {data.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Belum ada pengajuan surat</Text>
            <Text style={styles.emptySubText}>
              Ajukan surat pertama Anda untuk melihat status di sini
            </Text>
            <Button 
              mode="contained" 
              onPress={() => router.push("/warga/pengajuan_surat")}
              style={styles.button}
              buttonColor="#6200ee"
            >
              Ajukan Surat Sekarang
            </Button>
          </Card.Content>
        </Card>
      ) : (
        data.map((item) => (
          <Card key={item.id} style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusIcon}>
                    {getStatusIcon(item.status)}
                  </Text>
                  <Chip 
                    style={[styles.chip, { backgroundColor: getStatusColor(item.status) }]}
                    textStyle={styles.chipText}
                  >
                    {item.status.toUpperCase()}
                  </Chip>
                </View>
                <Text style={styles.kodeSurat}>{item.kode_permohonan}</Text>
              </View>

              <Text style={styles.jenisSurat}>{item.nama_jenis_surat}</Text>
              <Text style={styles.keperluan}>Keperluan: {item.keperluan}</Text>
              <Text style={styles.tanggal}>
                📅 {new Date(item.tanggal_pengajuan).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                })}
              </Text>

              {item.status === "ditolak" && item.catatan_admin && (
                <View style={styles.catatanBox}>
                  <Text style={styles.catatanLabel}>📝 Catatan Admin:</Text>
                  <Text style={styles.catatanText}>{item.catatan_admin}</Text>
                </View>
              )}

              {item.status === "disetujui" && item.nomor_surat && (
                <View style={styles.nomorBox}>
                  <Text style={styles.nomorLabel}> Nomor Surat:</Text>
                  <Text style={styles.nomorText}>{item.nomor_surat}</Text>
                </View>
              )}

              {item.status === "disetujui" && item.surat_pdf_url && (
                <Button 
                  mode="contained"
                  onPress={() => {
                    Alert.alert(
                      "Download Surat",
                      "Mulai mengunduh surat ke perangkat Anda?",
                      [
                        { text: "Batal", style: "cancel" },
                        { 
                          text: "Ya, Download",
                          onPress: async () => {
                            let finalUrl = "";
                            if (typeof item.surat_pdf_url === "object" && item.surat_pdf_url !== null) {
                              finalUrl = (item.surat_pdf_url as any).url;
                            } else if (typeof item.surat_pdf_url === "string") {
                              finalUrl = item.surat_pdf_url;
                            }

                            if (finalUrl) {
                              try {
                                const fileName = `Surat_${item.kode_permohonan.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
                                
                                const fileUri = `${FileSystem.documentDirectory}${fileName}`;

                                const downloadResult = await FileSystem.downloadAsync(finalUrl, fileUri);

                                const isAvailable = await Sharing.isAvailableAsync();
                                if (isAvailable) {
                                  await Sharing.shareAsync(downloadResult.uri, {
                                    mimeType: "application/pdf",
                                    dialogTitle: "Simpan Surat PDF",
                                    UTI: "com.adobe.pdf" 
                                  });
                                } else {
                                  Alert.alert("Info", `File berhasil diunduh ke: ${downloadResult.uri}`);
                                }

                              } catch (err) {
                                console.error("Download Error:", err);
                                Alert.alert("Error", "Gagal mengunduh file PDF ke perangkat.");
                              }
                            } else {
                              Alert.alert("Error", "Link PDF tidak valid atau belum tersedia.");
                            }
                          }
                        }
                      ]
                    );
                  }}
                  style={styles.downloadButton}
                  buttonColor="#10b981"
                  icon="download"
                >
                  Download Surat PDF
                </Button>
              )}

              {item.status === "ditolak" && (
                <Button 
                  mode="outlined"
                  onPress={() => router.push("/warga/pengajuan_surat")}
                  style={styles.ajukanButton}
                  textColor="#f59e0b"
                >
                  Ajukan Ulang
                </Button>
              )}
            </Card.Content>
          </Card>
        ))
      )}

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  loadingText: { fontSize: 16, color: "#64748b" },
  header: { fontSize: 24, fontWeight: "bold", color: "#1e293b", marginTop: 20 },
  subHeader: { fontSize: 14, color: "#64748b", marginBottom: 20 },
  emptyCard: { backgroundColor: "#ffffff", padding: 20, elevation: 2 },
  emptyIcon: { fontSize: 48, textAlign: "center", marginBottom: 10 },
  emptyText: { fontSize: 18, fontWeight: "bold", textAlign: "center", color: "#1e293b" },
  emptySubText: { fontSize: 14, textAlign: "center", color: "#64748b", marginTop: 8, marginBottom: 20 },
  button: { marginTop: 10 },
  card: { backgroundColor: "#ffffff", marginBottom: 16, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusIcon: { fontSize: 20 },
  chip: { height: 28 },
  chipText: { color: "#ffffff", fontSize: 11, fontWeight: "bold" },
  kodeSurat: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  jenisSurat: { fontSize: 16, fontWeight: "bold", color: "#1e293b", marginBottom: 8 },
  keperluan: { fontSize: 14, color: "#475569", marginBottom: 8 },
  tanggal: { fontSize: 13, color: "#64748b", marginBottom: 12 },
  catatanBox: { backgroundColor: "#fef2f2", padding: 12, borderRadius: 8, marginTop: 12, borderLeftWidth: 4, borderLeftColor: "#ef4444" },
  catatanLabel: { fontSize: 13, fontWeight: "bold", color: "#991b1b", marginBottom: 4 },
  catatanText: { fontSize: 13, color: "#7f1d1d" },
  nomorBox: { backgroundColor: "#f0fdf4", padding: 12, borderRadius: 8, marginTop: 12, borderLeftWidth: 4, borderLeftColor: "#10b981" },
  nomorLabel: { fontSize: 13, fontWeight: "bold", color: "#065f46", marginBottom: 4 },
  nomorText: { fontSize: 14, color: "#064e3b", fontWeight: "600" },
  downloadButton: { marginTop: 12 },
  ajukanButton: { marginTop: 12 },
});