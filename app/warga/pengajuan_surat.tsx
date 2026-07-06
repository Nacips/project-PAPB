import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, View } from "react-native";
import { 
  Button, 
  Card, 
  Text, 
  TextInput, 
  ActivityIndicator,
  List,
  Divider 
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { db, auth } from "../../config/firebase";
import { uploadToCloudinary } from "../../config/cloudinary";
import { router } from "expo-router";

export default function PengajuanSurat() {
  const [jenisSuratList, setJenisSuratList] = useState<any[]>([]);
  const [selectedJenis, setSelectedJenis] = useState<any>(null);
  const [keperluan, setKeperluan] = useState("");
  
  const [dokumenUri, setDokumenUri] = useState<string | null>(null);
  const [dokumenUrl, setDokumenUrl] = useState("");
  
  const [loadingData, setLoadingData] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchJenisSurat = async () => {
      try {
        const q = query(collection(db, "jenis_surat"), where("aktif", "==", true));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setJenisSuratList(list);
      } catch (error) {
        console.error("Gagal ambil jenis surat:", error);
        Alert.alert("Error", "Gagal memuat daftar jenis surat.");
      } finally {
        setLoadingData(false);
      }
    };
    fetchJenisSurat();
  }, []);

  const pickDocument = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Izin Ditolak", "Aplikasi butuh izin untuk akses galeri.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setDokumenUri(result.assets[0].uri);
      setDokumenUrl("");
    }
  };
const handleSubmit = async () => {
  if (!selectedJenis) {
    Alert.alert("Peringatan", "Silakan pilih jenis surat terlebih dahulu.");
    return;
  }
  if (keperluan.trim() === "") {
    Alert.alert("Peringatan", "Keperluan wajib diisi.");
    return;
  }
  if (!dokumenUri) {
    Alert.alert("Peringatan", "Dokumen persyaratan wajib diupload.");
    return;
  }

  setSubmitting(true);
  setUploading(true);

  let finalUrl = "";

  try {
    const uploadResult = await uploadToCloudinary(dokumenUri, "esurat/dokumen_warga");
    finalUrl = uploadResult.url;
    setDokumenUrl(finalUrl);
    setUploading(false);

    const kodePermohonan = `PS-${Date.now().toString().slice(-6)}`;

    await addDoc(collection(db, "permohonan_surat"), {
      kode_permohonan: kodePermohonan,
      user_uid: auth.currentUser?.uid,
      nama_pemohon: auth.currentUser?.displayName || "Warga",
      jenis_surat_id: selectedJenis.id,
      nama_jenis_surat: selectedJenis.namaSurat,
      keperluan: keperluan,
      dokumen_url: finalUrl,
      status: "pending",
      tanggal_pengajuan: new Date().toISOString(),
    });

    Alert.alert(
      "Berhasil!",
      `Permohonan surat berhasil diajukan dengan kode: ${kodePermohonan}. Silakan cek status di menu Riwayat.`,
      [{ text: "OK", onPress: () => router.replace("/warga/riwayat_surat") }]
    );

    setSelectedJenis(null);
    setKeperluan("");
    setDokumenUri(null);
    setDokumenUrl("");
  } catch (error: any) {
    console.error("Error submit:", error);
    Alert.alert("Gagal", error.message || "Terjadi kesalahan saat mengajukan surat.");
  } finally {
    setSubmitting(false);
    setUploading(false);
  }
};

  if (loadingData) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={{ marginTop: 10 }}>Memuat daftar surat...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>Form Pengajuan Surat</Text>
      <Text style={styles.subHeader}>Lengkapi data di bawah ini untuk mengajukan surat.</Text>

      <Text style={styles.stepTitle}>1. Pilih Jenis Surat</Text>
      {jenisSuratList.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={{ textAlign: "center", color: "#94a3b8" }}>
              Belum ada jenis surat yang tersedia.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        jenisSuratList.map((item) => (
          <Card 
            key={item.id} 
            style={[
              styles.jenisCard, 
              selectedJenis?.id === item.id && styles.selectedCard
            ]}
            onPress={() => setSelectedJenis(item)}
          >
            <Card.Content>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.jenisTitle}>{item.namaSurat}</Text>
                  <Text style={styles.jenisCode}>Kode: {item.kodeSurat}</Text>
                </View>
                {selectedJenis?.id === item.id && (
                  <Text style={styles.checkIcon}>✅</Text>
                )}
              </View>
              {item.persyaratan && item.persyaratan.length > 0 && (
                <>
                  <Divider style={{ marginVertical: 8 }} />
                  <Text style={styles.reqLabel}>Persyaratan:</Text>
                  {item.persyaratan.map((req: string, idx: number) => (
                    <Text key={idx} style={styles.reqItem}>• {req}</Text>
                  ))}
                </>
              )}
            </Card.Content>
          </Card>
        ))
      )}

      <Text style={styles.stepTitle}>2. Isi Keperluan</Text>
      <Card style={styles.formCard}>
        <Card.Content>
          <TextInput
            label="Keperluan Pengajuan"
            mode="outlined"
            value={keperluan}
            onChangeText={setKeperluan}
            placeholder="Contoh: Untuk syarat pengurusan BPJS"
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />
        </Card.Content>
      </Card>

      <Text style={styles.stepTitle}>3. Upload Dokumen Persyaratan</Text>
      <Card style={styles.formCard}>
        <Card.Content>
          <Button 
            mode="outlined" 
            onPress={pickDocument} 
            icon="file-image"
            style={{ marginBottom: 10 }}
          >
            Pilih Gambar dari Galeri
          </Button>
          
          {dokumenUri && (
            <Image source={{ uri: dokumenUri }} style={styles.previewImage} />
          )}
          
          {uploading && (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color="#6200ee" />
              <Text style={{ marginTop: 5, fontSize: 12 }}>Sedang mengupload ke Cloudinary...</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting || uploading}
        style={styles.submitButton}
        buttonColor="#6200ee"
        contentStyle={{ paddingVertical: 8 }}
      >
        {submitting ? "Mengajukan..." : "Kirim Permohonan"}
      </Button>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  header: { fontSize: 24, fontWeight: "bold", color: "#1e293b", marginTop: 20, marginBottom: 4 },
  subHeader: { fontSize: 14, color: "#64748b", marginBottom: 20 },
  stepTitle: { fontSize: 16, fontWeight: "bold", color: "#475569", marginBottom: 10, marginTop: 10 },
  
  emptyCard: { backgroundColor: "#ffffff", marginBottom: 10 },
  jenisCard: { backgroundColor: "#ffffff", marginBottom: 10, borderWidth: 1, borderColor: "#e2e8f0" },
  selectedCard: { borderColor: "#6200ee", backgroundColor: "#f3e8ff" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  jenisTitle: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  jenisCode: { fontSize: 12, color: "#64748b", marginTop: 2 },
  checkIcon: { fontSize: 20 },
  reqLabel: { fontSize: 12, fontWeight: "600", color: "#475569", marginTop: 4 },
  reqItem: { fontSize: 12, color: "#64748b", marginLeft: 8 },

  formCard: { backgroundColor: "#ffffff", marginBottom: 10 },
  textArea: { backgroundColor: "#ffffff", height: 80 },
  previewImage: { width: "100%", height: 150, borderRadius: 8, marginTop: 10, backgroundColor: "#e2e8f0" },
  
  submitButton: { marginTop: 20, borderRadius: 8 },
});