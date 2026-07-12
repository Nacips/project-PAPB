import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  Linking,
} from "react-native";
import {
  Button,
  Text,
  TextInput,
  ActivityIndicator,
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { db, auth } from "../../config/firebase";
import { uploadToCloudinary } from "../../config/cloudinary";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";

type DokumenLampiran = {
  nama: string;
  url: string;
  tipe: "image" | "pdf" | "link";
};

export default function PengajuanSurat() {
  const [jenisSuratList, setJenisSuratList] = useState<any[]>([]);
  const [selectedJenis, setSelectedJenis] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [keperluan, setKeperluan] = useState("");

  const [dokumenLampiran, setDokumenLampiran] = useState<DokumenLampiran[]>([]);

  const [loadingData, setLoadingData] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [currentReqIndex, setCurrentReqIndex] = useState(0);

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

  useEffect(() => {
    if (selectedJenis) {
      const persyaratan = selectedJenis.persyaratan || [];
      const initialLampiran: DokumenLampiran[] = persyaratan.map((req: string) => ({
        nama: req,
        url: "",
        tipe: "image",
      }));
      setDokumenLampiran(initialLampiran);
    }
  }, [selectedJenis]);

  const pickFromGallery = async (index: number) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Izin Ditolak", "Aplikasi butuh izin untuk akses galeri.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadFile(result.assets[0].uri, index, "image");
    }
  };

  const takePhoto = async (index: number) => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Izin Ditolak", "Aplikasi butuh izin untuk mengakses kamera.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadFile(result.assets[0].uri, index, "image");
    }
  };

  const pickPDF = async (index: number) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      await uploadFile(result.assets[0].uri, index, "pdf");
    } catch (error) {
      console.error("Error pick PDF:", error);
      Alert.alert("Error", "Gagal memilih file PDF.");
    }
  };

  const uploadFile = async (uri: string, index: number, tipe: "image" | "pdf") => {
    setUploading(true);
    try {
      const uploadResult = await uploadToCloudinary(uri, "esurat/dokumen_warga");
      
      const updatedLampiran = [...dokumenLampiran];
      updatedLampiran[index] = {
        ...updatedLampiran[index],
        url: uploadResult.url,
        tipe: tipe,
      };
      setDokumenLampiran(updatedLampiran);
    } catch (error: any) {
      console.error("Error upload:", error);
      Alert.alert("Error", "Gagal mengupload file.");
    } finally {
      setUploading(false);
    }
  };

  const handleInputLink = () => {
    if (!linkInput.trim()) {
      Alert.alert("Peringatan", "Link tidak boleh kosong.");
      return;
    }

    if (!linkInput.startsWith("http://") && !linkInput.startsWith("https://")) {
      Alert.alert("Peringatan", "Link harus diawali dengan http:// atau https://");
      return;
    }

    const updatedLampiran = [...dokumenLampiran];
    updatedLampiran[currentReqIndex] = {
      ...updatedLampiran[currentReqIndex],
      url: linkInput,
      tipe: "link",
    };
    setDokumenLampiran(updatedLampiran);
    setLinkInput("");
    setShowLinkModal(false);
  };

  const removeDokumen = (index: number) => {
    const updatedLampiran = [...dokumenLampiran];
    updatedLampiran[index] = {
      ...updatedLampiran[index],
      url: "",
      tipe: "image",
    };
    setDokumenLampiran(updatedLampiran);
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

    const persyaratan = selectedJenis.persyaratan || [];
    const missingDocs = dokumenLampiran.filter((doc) => !doc.url);

    if (missingDocs.length > 0) {
      Alert.alert(
        "Peringatan",
        `Masih ada ${missingDocs.length} persyaratan yang belum diupload:\n${missingDocs.map(d => `• ${d.nama}`).join('\n')}`
      );
      return;
    }

    setSubmitting(true);
    try {
      const kodePermohonan = `PS-${Date.now().toString().slice(-6)}`;

      let namaLengkap = "Warga";
      let nikPemohon = "";
      
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            namaLengkap = userData?.nama || auth.currentUser.displayName || "Warga";
            nikPemohon = userData?.nik || "";
          } else {
            namaLengkap = auth.currentUser.displayName || "Warga";
          }
        } catch (err) {
          console.error("Error fetch user data:", err);
          namaLengkap = auth.currentUser.displayName || "Warga";
        }
      }

      await addDoc(collection(db, "permohonan_surat"), {
        kode_permohonan: kodePermohonan,
        user_uid: auth.currentUser?.uid,
        nama_pemohon: namaLengkap,
        nik: nikPemohon,
        jenis_surat_id: selectedJenis.id,
        nama_jenis_surat: selectedJenis.namaSurat,
        keperluan: keperluan,
        dokumen_lampiran: dokumenLampiran,
        status: "pending",
        tanggal_pengajuan: new Date().toISOString(),
      });

      Alert.alert(
        "Berhasil!",
        `Permohonan berhasil diajukan.\nKode: ${kodePermohonan}`,
        [{ text: "Cek Status", onPress: () => router.replace("/warga/riwayat_surat") }]
      );

      setSelectedJenis(null);
      setKeperluan("");
      setDokumenLampiran([]);
    } catch (error: any) {
      console.error("Error submit:", error);
      Alert.alert("Gagal", error.message || "Terjadi kesalahan saat mengajukan surat.");
    } finally {
      setSubmitting(false);
    }
  };


  const StepLabel = ({ number, title }: { number: string; title: string }) => (
    <View style={styles.stepContainer}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{number}</Text>
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
    </View>
  );

  const UploadItem = ({ item, index }: { item: DokumenLampiran; index: number }) => (
    <View style={styles.uploadItem}>
      <View style={styles.uploadItemHeader}>
        <MaterialCommunityIcons name="file-document-outline" size={20} color="#6200EE" />
        <Text style={styles.uploadItemTitle}>{item.nama}</Text>
        {item.url && (
          <TouchableOpacity onPress={() => removeDokumen(index)}>
            <MaterialCommunityIcons name="close-circle" size={20} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      {item.url ? (
        <View style={styles.uploadedPreview}>
          {item.tipe === "link" ? (
            <TouchableOpacity 
              style={styles.linkPreview}
              onPress={() => Linking.openURL(item.url)}
            >
              <MaterialCommunityIcons name="link" size={24} color="#0284c7" />
              <Text style={styles.linkText} numberOfLines={1}>{item.url}</Text>
            </TouchableOpacity>
          ) : (
            <Image source={{ uri: item.url }} style={styles.previewImage} />
          )}
          <View style={styles.uploadedBadge}>
            <MaterialCommunityIcons name="check-circle" size={14} color="#10b981" />
            <Text style={styles.uploadedText}>Terupload</Text>
          </View>
        </View>
      ) : (
        <View style={styles.uploadActions}>
          <TouchableOpacity 
            style={styles.uploadBtn}
            onPress={() => takePhoto(index)}
          >
            <MaterialCommunityIcons name="camera" size={20} color="#6200EE" />
            <Text style={styles.uploadBtnText}>Kamera</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.uploadBtn}
            onPress={() => pickFromGallery(index)}
          >
            <MaterialCommunityIcons name="image" size={20} color="#6200EE" />
            <Text style={styles.uploadBtnText}>Galeri</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.uploadBtn}
            onPress={() => pickPDF(index)}
          >
            <MaterialCommunityIcons name="file-pdf-box" size={20} color="#6200EE" />
            <Text style={styles.uploadBtnText}>PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.uploadBtn}
            onPress={() => {
              setCurrentReqIndex(index);
              setShowLinkModal(true);
            }}
          >
            <MaterialCommunityIcons name="link" size={20} color="#6200EE" />
            <Text style={styles.uploadBtnText}>Link</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loadingData) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Menyiapkan formulir...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View>
            <Text style={styles.header}>Buat Pengajuan</Text>
            <Text style={styles.subHeader}>Lengkapi data surat yang dibutuhkan</Text>
          </View>
        </View>

        <StepLabel number="1" title="Pilih Jenis Surat" />
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowDropdown(true)}
          activeOpacity={0.7}
        >
          <View style={styles.dropdownLeft}>
            <MaterialCommunityIcons 
              name="file-document-outline" 
              size={24} 
              color={selectedJenis ? "#6200EE" : "#94a3b8"} 
            />
            <Text style={[styles.dropdownText, !selectedJenis && { color: "#94a3b8" }]}>
              {selectedJenis ? selectedJenis.namaSurat : "Pilih dokumen yang mau diurus..."}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={24} color="#64748b" />
        </TouchableOpacity>

        {selectedJenis && selectedJenis.persyaratan && selectedJenis.persyaratan.length > 0 && (
          <View style={styles.reqContainer}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <MaterialCommunityIcons name="information-outline" size={18} color="#0284c7" />
              <Text style={styles.reqLabel}>Persyaratan Dokumen:</Text>
            </View>
            {selectedJenis.persyaratan.map((req: string, idx: number) => (
              <View key={idx} style={styles.reqRow}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#0ea5e9" />
                <Text style={styles.reqItem}>{req}</Text>
              </View>
            ))}
          </View>
        )}

        <StepLabel number="2" title="Tujuan Pembuatan" />
        <TextInput
          mode="outlined"
          value={keperluan}
          onChangeText={setKeperluan}
          placeholder="Misal: Syarat administrasi pembuatan BPJS Kesehatan"
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={4}
          style={styles.textArea}
          theme={{ roundness: 16 }}
          outlineColor="#e2e8f0"
          activeOutlineColor="#6200EE"
        />

        {selectedJenis && (
          <>
            <StepLabel number="3" title="Unggah Persyaratan" />
            <View style={styles.uploadCard}>
              {dokumenLampiran.map((item, index) => (
                <UploadItem key={index} item={item} index={index} />
              ))}

              {uploading && (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color="#6200EE" />
                  <Text style={styles.uploadingText}>Mengupload dokumen...</Text>
                </View>
              )}
            </View>
          </>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting || uploading || !selectedJenis}
          style={styles.submitButton}
          buttonColor="#6200EE"
          labelStyle={styles.submitBtnText}
        >
          {submitting ? "Memproses Data..." : "Kirim Pengajuan"}
        </Button>
      </ScrollView>

      <Modal visible={showDropdown} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Jenis Surat</Text>
              <TouchableOpacity onPress={() => setShowDropdown(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={jenisSuratList}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  activeOpacity={0.6}
                  onPress={() => {
                    setSelectedJenis(item);
                    setShowDropdown(false);
                  }}
                >
                  <View style={styles.modalIconBox}>
                    <MaterialCommunityIcons name="file-document-outline" size={24} color="#6200EE" />
                  </View>
                  <View style={styles.modalItemBody}>
                    <Text style={styles.modalItemTitle}>{item.namaSurat}</Text>
                    <Text style={styles.modalItemCode}>Kode Surat: {item.kodeSurat}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#cbd5e1" />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showLinkModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "50%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Masukkan Link Dokumen</Text>
              <TouchableOpacity onPress={() => setShowLinkModal(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <TextInput
              mode="outlined"
              value={linkInput}
              onChangeText={setLinkInput}
              placeholder="https://drive.google.com/..."
              placeholderTextColor="#94a3b8"
              style={styles.textArea}
              theme={{ roundness: 12 }}
              outlineColor="#e2e8f0"
              activeOutlineColor="#6200EE"
              autoCapitalize="none"
            />
            <Button
              mode="contained"
              onPress={handleInputLink}
              style={styles.submitButton}
              buttonColor="#6200EE"
            >
              Simpan Link
            </Button>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  scrollContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 50 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#ffffff" },
  loadingText: { marginTop: 12, fontFamily: "Poppins", fontSize: 13, color: "#64748b" },
  
  headerContainer: { flexDirection: "row", alignItems: "flex-start", marginBottom: 30 },
  backButton: { marginRight: 16, marginTop: 4, padding: 8, backgroundColor: "#f8fafc", borderRadius: 12 },
  header: { fontSize: 28, fontFamily: "Poppins_500Medium", color: "#1e293b" },
  subHeader: { fontSize: 14, fontFamily: "Poppins", color: "#64748b", marginTop: -2 },
  
  stepContainer: { flexDirection: "row", alignItems: "center", marginTop: 24, marginBottom: 12 },
  stepBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#e0e7ff", justifyContent: "center", alignItems: "center", marginRight: 12 },
  stepBadgeText: { color: "#4f46e5", fontFamily: "Poppins_500Medium", fontSize: 13, marginTop: 2 },
  stepTitle: { fontSize: 16, fontFamily: "Poppins_500Medium", color: "#334155" },
  
  dropdownButton: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0",
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16,
  },
  dropdownLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  dropdownText: { fontFamily: "Poppins", fontSize: 14, color: "#1e293b", marginLeft: 12, flex: 1 },
  
  reqContainer: { backgroundColor: "#f0f9ff", padding: 16, borderRadius: 16, marginTop: 12, borderWidth: 1, borderColor: "#bae6fd" },
  reqLabel: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "#0369a1", marginLeft: 6, marginTop: 2 },
  reqRow: { flexDirection: "row", alignItems: "center", marginBottom: 6, paddingRight: 10 },
  reqItem: { fontSize: 13, fontFamily: "Poppins", color: "#0c4a6e", marginLeft: 8, flexShrink: 1, lineHeight: 20 },

  textArea: { backgroundColor: "#f8fafc", fontFamily: "Poppins", fontSize: 14, minHeight: 100 },
  
  uploadCard: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 20, padding: 16, marginBottom: 30 },
  
  uploadItem: { marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  uploadItemHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  uploadItemTitle: { flex: 1, fontSize: 14, fontFamily: "Poppins_500Medium", color: "#1e293b" },
  
  uploadActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  uploadBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0",
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  uploadBtnText: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#1e293b" },
  
  uploadedPreview: { position: "relative" },
  previewImage: { width: "100%", height: 200, borderRadius: 12, backgroundColor: "#e2e8f0" },
  linkPreview: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#f0f9ff", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#bae6fd",
  },
  linkText: { flex: 1, fontSize: 13, fontFamily: "Poppins", color: "#0284c7" },
  
  uploadedBadge: {
    position: "absolute", top: 8, right: 8,
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.9)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  uploadedText: { fontSize: 11, fontFamily: "Poppins_500Medium", color: "#ffffff" },
  
  loadingBox: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 16, backgroundColor: "#f3e8ff", padding: 12, borderRadius: 12 },
  uploadingText: { marginLeft: 10, fontFamily: "Poppins_500Medium", fontSize: 12, color: "#6200EE", marginTop: 2 },
  
  submitButton: { paddingVertical: 8, borderRadius: 16, elevation: 2 },
  submitBtnText: { fontFamily: "Poppins_500Medium", fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#ffffff", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: "Poppins_500Medium", color: "#1e293b" },
  closeBtn: { padding: 4, backgroundColor: "#f1f5f9", borderRadius: 20 },
  
  modalItem: { flexDirection: "row", alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  modalIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#f3e8ff", justifyContent: "center", alignItems: "center", marginRight: 16 },
  modalItemBody: { flex: 1 },
  modalItemTitle: { fontSize: 15, fontFamily: "Poppins_500Medium", color: "#1e293b", marginBottom: 2 },
  modalItemCode: { fontSize: 12, fontFamily: "Poppins", color: "#64748b" },
});