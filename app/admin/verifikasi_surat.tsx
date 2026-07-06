import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Text,
  TextInput,
  Chip,
  Divider,
  ActivityIndicator,
} from "react-native-paper";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, auth } from "../../config/firebase";
import { router } from "expo-router";
import { uploadToCloudinary } from "../../config/cloudinary";
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system";

const escapeHtml = (unsafe: string | undefined | null): string => {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

type PermohonanSurat = {
  id: string;
  kode_permohonan: string;
  user_uid: string;
  nama_pemohon: string;
  nik: string;
  jenis_surat_id: string;
  nama_jenis_surat: string;
  keperluan: string;
  dokumen_url: string;
  status: "pending" | "proses" | "disetujui" | "ditolak";
  catatan_admin?: string;
  nomor_surat?: string;
  tanggal_pengajuan: string;
  tanggal_verifikasi?: string;
  diverifikasi_oleh?: string;
};

export default function VerifikasiSurat() {
  const [data, setData] = useState<PermohonanSurat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [selectedItem, setSelectedItem] = useState<PermohonanSurat | null>(null);
  const [catatan, setCatatan] = useState("");
  const [nomorSurat, setNomorSurat] = useState("");

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      let q;
      if (filterStatus === "semua") {
        q = query(collection(db, "permohonan_surat"));
      } else {
        q = query(
          collection(db, "permohonan_surat"),
          where("status", "==", filterStatus)
        );
      }

      const snapshot = await getDocs(q);
      const hasil: PermohonanSurat[] = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...(docItem.data() as any),
      }));

      hasil.sort((a, b) => {
        const dateA = new Date(a.tanggal_pengajuan).getTime();
        const dateB = new Date(b.tanggal_pengajuan).getTime();
        return dateB - dateA;
      });

      setData(hasil);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Gagal memuat data permohonan.");
    } finally {
      setLoading(false);
    }
  };

  const bukaDetail = (item: PermohonanSurat) => {
    setSelectedItem(item);
    setCatatan(item.catatan_admin || "");
    setNomorSurat(item.nomor_surat || generateNomorSurat());
  };

  const generateNomorSurat = () => {
    const tanggal = new Date();
    const tahun = tanggal.getFullYear();
    const bulan = (tanggal.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `${tahun}.${bulan}.${random}`;
  };

  const handleApproveWithPDF = async () => {
    if (!selectedItem) return;

    if (!nomorSurat.trim()) {
      Alert.alert("Peringatan", "Nomor surat wajib diisi.");
      return;
    }

    try {
      setLoading(true);
      
      let config = { 
        namaDesa: "Desa Tidak Diketahui", 
        alamatDesa: "",
        kecamatan: "",
        kabupaten: "",
        namaKepalaDesa: "Kepala Desa"
      };
      
      const configDoc = await getDoc(doc(db, "pengaturan_desa", "config"));
      if (configDoc.exists()) {
        config = configDoc.data() as any;
      }

      const amanNama = escapeHtml(selectedItem.nama_pemohon);
      const amanKeperluan = escapeHtml(selectedItem.keperluan);
      const amanNik = escapeHtml(selectedItem.nik);

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial; padding: 40px; }
            .kop { text-align: center; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .kop h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
            .kop h2 { margin: 5px 0; font-size: 18px; text-transform: uppercase; }
            .kop p { margin: 5px 0; font-size: 14px; }
            .nomor { text-align: center; margin-bottom: 20px; text-decoration: underline; font-weight: bold; }
            .judul { text-align: center; margin: 30px 0; text-decoration: underline; font-size: 18px; font-weight: bold; }
            .isi { text-align: justify; line-height: 1.8; }
            .data { margin: 20px 0; padding-left: 20px; }
            .data table { width: 100%; }
            .data td { padding: 5px; }
            .ttd { margin-top: 60px; text-align: right; padding-right: 50px; }
            .ttd .nama { font-weight: bold; text-decoration: underline; margin-top: 80px; }
          </style>
        </head>
        <body>
          <div class="kop">
            <h1>PEMERINTAH KABUPATEN ${escapeHtml(config.kabupaten)}</h1>
            <h2>KECAMATAN ${escapeHtml(config.kecamatan)}</h2>
            <h2>DESA ${escapeHtml(config.namaDesa)}</h2>
            <p>${escapeHtml(config.alamatDesa)}</p>
          </div>
          
          <div class="judul">${escapeHtml(selectedItem.nama_jenis_surat).toUpperCase()}</div>
          <div class="nomor">Nomor: ${escapeHtml(nomorSurat)}</div>
          
          <div class="isi">
            <p>Yang bertanda tangan di bawah ini Kepala Desa ${escapeHtml(config.namaDesa)}, Kecamatan ${escapeHtml(config.kecamatan)}, menerangkan bahwa:</p>
            <div class="data">
              <table>
                <tr><td width="30%">Nama Lengkap</td><td width="70%">: ${amanNama}</td></tr>
                <tr><td>NIK</td><td>: ${amanNik}</td></tr>
                <tr><td>Keperluan</td><td>: ${amanKeperluan}</td></tr>
              </table>
            </div>
            <p>Orang tersebut di atas adalah benar warga kami dan surat keterangan ini dibuat untuk keperluan yang bersangkutan.</p>
            <p>Demikian surat keterangan ini dibuat agar dapat dipergunakan sebagaimana mestinya.</p>
          </div>
          <div class="ttd">
            <p>${escapeHtml(config.namaDesa)}, ${new Date().toLocaleDateString('id-ID')}</p>
            <p>Kepala Desa</p>
            <p class="nama">${escapeHtml(config.namaKepalaDesa)}</p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      
      const pdfUrl = await uploadToCloudinary(uri, "esurat/surat_pdf");
      
      await updateDoc(doc(db, "permohonan_surat", selectedItem.id), {
        status: "disetujui",
        catatan_admin: catatan,
        nomor_surat: nomorSurat,
        tanggal_verifikasi: new Date().toISOString(),
        diverifikasi_oleh: auth.currentUser?.uid || "",
        surat_pdf_url: pdfUrl,
      });

      Alert.alert("Berhasil", `Surat ${selectedItem.kode_permohonan} telah disetujui dan PDF berhasil diupload.`);
      setSelectedItem(null);
      loadData();
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "Gagal memproses surat.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedItem) return;

    if (!nomorSurat.trim()) {
      Alert.alert("Peringatan", "Nomor surat wajib diisi saat approve.");
      return;
    }

    try {
      await updateDoc(doc(db, "permohonan_surat", selectedItem.id), {
        status: "disetujui",
        catatan_admin: catatan,
        nomor_surat: nomorSurat,
        tanggal_verifikasi: new Date().toISOString(),
        diverifikasi_oleh: auth.currentUser?.uid || "",
      });

      Alert.alert(
        "Berhasil",
        `Surat ${selectedItem.kode_permohonan} telah disetujui dengan nomor: ${nomorSurat}`
      );
      setSelectedItem(null);
      loadData();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal menyetujui surat.");
    }
  };

  const handleReject = async () => {
    if (!selectedItem) return;

    if (!catatan.trim()) {
      Alert.alert(
        "Peringatan",
        "Catatan alasan penolakan wajib diisi agar warga tahu mengapa ditolak."
      );
      return;
    }

    Alert.alert(
      "Konfirmasi Tolak",
      "Yakin ingin menolak permohonan ini? Warga akan mendapat notifikasi.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Tolak",
          style: "destructive",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "permohonan_surat", selectedItem.id), {
                status: "ditolak",
                catatan_admin: catatan,
                tanggal_verifikasi: new Date().toISOString(),
                diverifikasi_oleh: auth.currentUser?.uid || "",
              });

              Alert.alert(
                "Berhasil",
                `Surat ${selectedItem.kode_permohonan} telah ditolak.`
              );
              setSelectedItem(null);
              loadData();
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Gagal menolak surat.");
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#f59e0b";
      case "proses":
        return "#3b82f6";
      case "disetujui":
        return "#10b981";
      case "ditolak":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const formatTanggal = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Verifikasi Permohonan Surat</Text>
      <Text style={styles.subHeader}>
        Review dan proses permohonan surat dari warga
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filterContainer}>
          {["pending", "proses", "disetujui", "ditolak", "semua"].map(
            (status) => (
              <Chip
                key={status}
                selected={filterStatus === status}
                onPress={() => setFilterStatus(status)}
                style={[
                  styles.chip,
                  filterStatus === status && {
                    backgroundColor: getStatusColor(status),
                  },
                ]}
                textStyle={[
                  styles.chipText,
                  filterStatus === status && { color: "#ffffff" },
                ]}
              >
                {status === "semua" ? "Semua" : status.charAt(0).toUpperCase() + status.slice(1)}
              </Chip>
            )
          )}
        </View>
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={{ marginTop: 10 }}>Memuat data...</Text>
        </View>
      ) : data.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>
              Tidak ada permohonan dengan status "{filterStatus}"
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <>
          <Text style={styles.listTitle}>
            Total: {data.length} Permohonan
          </Text>

          {data.map((item) => (
            <Card key={item.id} style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.kodeSurat}>
                      {item.kode_permohonan}
                    </Text>
                    <Text style={styles.namaPemohon}>{item.nama_pemohon}</Text>
                    <Text style={styles.nik}>NIK: {item.nik}</Text>
                  </View>
                  <Chip
                    style={[
                      styles.statusChip,
                      { backgroundColor: getStatusColor(item.status) },
                    ]}
                    textStyle={styles.statusChipText}
                  >
                    {item.status}
                  </Chip>
                </View>

                <Divider style={{ marginVertical: 10 }} />

                <Text style={styles.label}>Jenis Surat:</Text>
                <Text style={styles.value}>{item.nama_jenis_surat}</Text>

                <Text style={styles.label}>Keperluan:</Text>
                <Text style={styles.value}>{item.keperluan}</Text>

                <Text style={styles.label}>Tanggal Pengajuan:</Text>
                <Text style={styles.value}>
                  {formatTanggal(item.tanggal_pengajuan)}
                </Text>

                {item.dokumen_url && (
                  <>
                    <Text style={styles.label}>Dokumen Lampiran:</Text>
                    <Image
                      source={{ uri: item.dokumen_url }}
                      style={styles.previewImage}
                    />
                    <Button
                      mode="text"
                      onPress={() => Linking.openURL(item.dokumen_url)}
                      textColor="#0284c7"
                      compact
                    >
                      🔗 Buka Dokumen di Browser
                    </Button>
                  </>
                )}

                {item.catatan_admin && (
                  <>
                    <Text style={styles.label}>Catatan Admin:</Text>
                    <Text style={[styles.value, { fontStyle: "italic" }]}>
                      {item.catatan_admin}
                    </Text>
                  </>
                )}

                {item.nomor_surat && (
                  <>
                    <Text style={styles.label}>Nomor Surat:</Text>
                    <Text style={[styles.value, { fontWeight: "bold" }]}>
                      {item.nomor_surat}
                    </Text>
                  </>
                )}

                <Button
                  mode="contained"
                  onPress={() => bukaDetail(item)}
                  style={styles.detailButton}
                  buttonColor="#6200ee"
                >
                  {item.status === "pending" ? "Proses Sekarang" : "Lihat Detail"}
                </Button>
              </Card.Content>
            </Card>
          ))}
        </>
      )}

      {selectedItem && (
        <Card style={styles.modalCard}>
          <Card.Content>
            <Text style={styles.modalTitle}>
              Proses Permohonan {selectedItem.kode_permohonan}
            </Text>
            <Divider style={{ marginVertical: 10 }} />

            <Text style={styles.label}>Nama Pemohon:</Text>
            <Text style={styles.value}>{selectedItem.nama_pemohon}</Text>

            <Text style={styles.label}>Jenis Surat:</Text>
            <Text style={styles.value}>{selectedItem.nama_jenis_surat}</Text>

            <Text style={styles.label}>Keperluan:</Text>
            <Text style={styles.value}>{selectedItem.keperluan}</Text>

            <Divider style={{ marginVertical: 12 }} />

            {selectedItem.status === "pending" && (
              <>
                <TextInput
                  label="Nomor Surat (untuk Approve)"
                  mode="outlined"
                  value={nomorSurat}
                  onChangeText={setNomorSurat}
                  style={styles.input}
                  placeholder="Contoh: 2026.07.001"
                />
              </>
            )}

            <TextInput
              label="Catatan Admin (wajib jika tolak)"
              mode="outlined"
              value={catatan}
              onChangeText={setCatatan}
              style={styles.input}
              multiline
              numberOfLines={3}
              placeholder="Tuliskan catatan untuk warga..."
            />

            {selectedItem.status === "pending" && (
              <View style={styles.buttonRow}>
                <Button
                  mode="contained"
                  onPress={handleReject}
                  style={[styles.actionButton, { backgroundColor: "#ef4444" }]}
                  icon="close"
                >
                  Tolak
                </Button>
                <Button
                  mode="contained"
                  onPress={handleApproveWithPDF}
                  style={[styles.actionButton, { backgroundColor: "#10b981" }]}
                  icon="check"
                >
                  Setujui
                </Button>
              </View>
            )}

            <Button
              mode="text"
              onPress={() => setSelectedItem(null)}
              style={{ marginTop: 10 }}
            >
              Tutup
            </Button>
          </Card.Content>
        </Card>
      )}

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 20,
  },
  subHeader: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    padding: 20,
  },
  emptyText: {
    textAlign: "center",
    color: "#94a3b8",
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#475569",
    marginBottom: 12,
  },
  card: {
    marginBottom: 12,
    backgroundColor: "#ffffff",
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  kodeSurat: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#6200ee",
  },
  namaPemohon: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 4,
  },
  nik: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  statusChip: {
    height: 28,
  },
  statusChipText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginTop: 8,
  },
  value: {
    fontSize: 14,
    color: "#1e293b",
    marginTop: 2,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: "#e2e8f0",
  },
  detailButton: {
    marginTop: 12,
  },
  modalCard: {
    marginTop: 20,
    backgroundColor: "#ffffff",
    elevation: 4,
    borderWidth: 2,
    borderColor: "#6200ee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6200ee",
  },
  input: {
    marginBottom: 12,
    backgroundColor: "#ffffff",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
  },
});