import { useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Card, Button, ActivityIndicator } from "react-native-paper";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../config/firebase";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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

  const getStatusTheme = (status: string) => {
    switch (status) {
      case "pending": return { bg: "#fef3c7", text: "#d97706", icon: "clock-outline" };
      case "proses": return { bg: "#dbeafe", text: "#2563eb", icon: "sync" };
      case "disetujui": return { bg: "#dcfce7", text: "#16a34a", icon: "check-circle-outline" };
      case "ditolak": return { bg: "#fee2e2", text: "#dc2626", icon: "close-circle-outline" };
      default: return { bg: "#f1f5f9", text: "#64748b", icon: "help-circle-outline" };
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Memuat status...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6200EE"]} />
        }
      >
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View>
            <Text style={styles.header}>Status Surat</Text>
            <Text style={styles.subHeader}>Pantau progress secara berkala</Text>
          </View>
        </View>

        {data.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="folder-open-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Belum Ada Pengajuan</Text>
            <Text style={styles.emptyText}>Anda belum mengajukan surat apapun. Mulai ajukan surat pertama Anda.</Text>
            <Button 
              mode="contained" 
              onPress={() => router.push("/warga/pengajuan_surat")}
              style={styles.emptyButton}
              buttonColor="#6200EE"
              labelStyle={{ fontFamily: "Poppins_500Medium" }}
            >
              Ajukan Sekarang
            </Button>
          </View>
        ) : (
          data.map((item) => {
            const theme = getStatusTheme(item.status);
            return (
              <Card key={item.id} style={styles.card}>
                <Card.Content>
                  
                  <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: theme.bg }]}>
                      <MaterialCommunityIcons name={theme.icon as any} size={16} color={theme.text} />
                      <Text style={[styles.statusBadgeText, { color: theme.text }]}>
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.kodeSurat}>{item.kode_permohonan}</Text>
                  </View>

                  <Text style={styles.jenisSurat}>{item.nama_jenis_surat}</Text>
                  <Text style={styles.keperluan}>Keperluan: {item.keperluan}</Text>
                  
                  <View style={styles.dateRow}>
                    <MaterialCommunityIcons name="calendar-month-outline" size={16} color="#64748b" />
                    <Text style={styles.tanggal}>
                      {new Date(item.tanggal_pengajuan).toLocaleDateString("id-ID", {
                        day: "numeric", month: "long", year: "numeric"
                      })}
                    </Text>
                  </View>

                  {item.status === "proses" && (
                    <View style={[styles.infoBox, { backgroundColor: "#dbeafe", borderColor: "#93c5fd" }]}>
                      <View style={styles.infoLabelRow}>
                        <MaterialCommunityIcons name="sync" size={16} color="#2563eb" />
                        <Text style={[styles.infoLabel, { color: "#1e40af" }]}>Sedang Diproses:</Text>
                      </View>
                      <Text style={[styles.infoText, { color: "#1e40af" }]}>
                        {item.catatan_admin || "Permohonan Anda sedang diproses oleh admin. Mohon tunggu."}
                      </Text>
                    </View>
                  )}

                  {item.status === "ditolak" && item.catatan_admin && (
                    <View style={[styles.infoBox, { backgroundColor: "#fef2f2", borderColor: "#fca5a5" }]}>
                      <View style={styles.infoLabelRow}>
                        <MaterialCommunityIcons name="message-alert-outline" size={16} color="#dc2626" />
                        <Text style={[styles.infoLabel, { color: "#b91c1c" }]}>Catatan Penolakan:</Text>
                      </View>
                      <Text style={[styles.infoText, { color: "#991b1b" }]}>{item.catatan_admin}</Text>
                    </View>
                  )}

                  {item.status === "disetujui" && item.nomor_surat && (
                    <View style={[styles.infoBox, { backgroundColor: "#f0fdf4", borderColor: "#86efac" }]}>
                      <View style={styles.infoLabelRow}>
                        <MaterialCommunityIcons name="file-certificate-outline" size={16} color="#16a34a" />
                        <Text style={[styles.infoLabel, { color: "#15803d" }]}>Nomor Surat Resmi:</Text>
                      </View>
                      <Text style={[styles.infoText, { color: "#166534", fontFamily: "Poppins_500Medium" }]}>
                        {item.nomor_surat}
                      </Text>
                    </View>
                  )}

                  {item.status === "disetujui" && item.surat_pdf_url && (
                    <Button 
                      mode="contained"
                      onPress={() => {
                        Alert.alert(
                          "Unduh Dokumen",
                          "Mulai mengunduh file PDF ke perangkat Anda?",
                          [
                            { text: "Batal", style: "cancel" },
                            { 
                              text: "Unduh",
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
                                      Alert.alert("Info", `File diunduh ke: ${downloadResult.uri}`);
                                    }
                                  } catch (err) {
                                    console.error("Download Error:", err);
                                    Alert.alert("Error", "Gagal mengunduh file PDF.");
                                  }
                                } else {
                                  Alert.alert("Error", "Tautan PDF belum tersedia.");
                                }
                              }
                            }
                          ]
                        );
                      }}
                      style={styles.actionButton}
                      buttonColor="#10b981"
                      icon="download"
                      labelStyle={{ fontFamily: "Poppins_500Medium" }}
                    >
                      Unduh PDF
                    </Button>
                  )}

                  {item.status === "ditolak" && (
                    <Button 
                      mode="outlined"
                      onPress={() => router.push("/warga/pengajuan_surat")}
                      style={styles.actionButton}
                      textColor="#f59e0b"
                      icon="refresh"
                      labelStyle={{ fontFamily: "Poppins_500Medium" }}
                    >
                      Ajukan Ulang
                    </Button>
                  )}
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  loadingText: { marginTop: 12, fontFamily: "Poppins", fontSize: 13, color: "#64748b" },
  
  headerContainer: { flexDirection: "row", alignItems: "flex-start", marginBottom: 24 },
  backButton: { marginRight: 16, marginTop: 4, padding: 8, backgroundColor: "#ffffff", borderRadius: 12, elevation: 1 },
  header: { fontSize: 26, fontFamily: "Poppins_500Medium", color: "#1e293b" },
  subHeader: { fontSize: 13, fontFamily: "Poppins", color: "#64748b", marginTop: -2 },
  
  emptyCard: { backgroundColor: "#ffffff", borderRadius: 20, padding: 30, alignItems: "center", marginTop: 20, borderWidth: 1, borderColor: "#e2e8f0", borderStyle: "dashed" },
  emptyTitle: { fontFamily: "Poppins_500Medium", fontSize: 18, color: "#334155", marginTop: 16, marginBottom: 8 },
  emptyText: { fontFamily: "Poppins", fontSize: 13, color: "#94a3b8", textAlign: "center", marginBottom: 20 },
  emptyButton: { borderRadius: 12, width: "100%" },

  card: { backgroundColor: "#ffffff", borderRadius: 20, marginBottom: 16, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 },
  statusBadgeText: { fontSize: 11, fontFamily: "Poppins_500Medium", marginTop: 2 },
  
  kodeSurat: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#64748b" },
  jenisSurat: { fontSize: 18, fontFamily: "Poppins_500Medium", color: "#1e293b", marginBottom: 6 },
  keperluan: { fontSize: 13, fontFamily: "Poppins", color: "#475569", marginBottom: 10, lineHeight: 20 },
  
  dateRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 6 },
  tanggal: { fontSize: 12, fontFamily: "Poppins", color: "#64748b", marginTop: 2 },
  
  infoBox: { padding: 14, borderRadius: 12, marginTop: 12, borderWidth: 1 },
  infoLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 6 },
  infoLabel: { fontSize: 12, fontFamily: "Poppins_500Medium" },
  infoText: { fontSize: 13, fontFamily: "Poppins", lineHeight: 20, marginLeft: 22 },
  
  actionButton: { marginTop: 16, borderRadius: 12, paddingVertical: 4 },
});