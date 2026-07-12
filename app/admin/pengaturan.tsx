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
} from "react-native";
import {
  Button,
  Card,
  Text,
  TextInput,
  ActivityIndicator,
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { uploadToCloudinary } from "../../config/cloudinary";
import { PengaturanDesa } from "../../types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function PengaturanDesaScreen() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [namaDesa, setNamaDesa] = useState("");
  const [alamatDesa, setAlamatDesa] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [kabupaten, setKabupaten] = useState("");
  const [namaKepalaDesa, setNamaKepalaDesa] = useState("");
  const [nipKepalaDesa, setNipKepalaDesa] = useState("");

  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, "pengaturan_desa", "config");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as PengaturanDesa;
          setNamaDesa(data.namaDesa || "");
          setAlamatDesa(data.alamatDesa || "");
          setKecamatan(data.kecamatan || "");
          setKabupaten(data.kabupaten || "");
          setNamaKepalaDesa(data.namaKepalaDesa || "");
          setNipKepalaDesa(data.nipKepalaDesa || "");
          setLogoUrl(data.logoUrl || "");
        }
      } catch (error) {
        console.error("Gagal menarik data pengaturan:", error);
      } finally {
        setFetching(false);
      }
    };
    fetchConfig();
  }, []);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Izin Ditolak", "Izinkan akses galeri di pengaturan HP Anda.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
      setLogoUrl("");
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Izin Ditolak", "Aplikasi butuh izin untuk mengakses kamera.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
      setLogoUrl("");
    }
  };

  const handleSave = async () => {
    if (!namaDesa || !namaKepalaDesa || !kecamatan || !kabupaten) {
      Alert.alert(
        "Peringatan",
        "Nama Desa, Kecamatan, Kabupaten, dan Nama Kepala Desa wajib diisi."
      );
      return;
    }

    setLoading(true);
    try {
      let finalLogoUrl = logoUrl;

      if (logoUri) {
        const uploadResult = await uploadToCloudinary(logoUri, "esurat/assets");
        finalLogoUrl = uploadResult.url;
      }

      const payload: PengaturanDesa = {
        id: "config",
        namaDesa,
        alamatDesa,
        kecamatan,
        kabupaten,
        namaKepalaDesa,
        nipKepalaDesa,
        logoUrl: finalLogoUrl,
      };

      await setDoc(doc(db, "pengaturan_desa", "config"), payload);
      setLogoUrl(finalLogoUrl);
      setLogoUri(null);

      Alert.alert(
        "Sukses",
        "Pengaturan desa berhasil disimpan. Data ini akan otomatis masuk ke Kop Surat PDF saat dokumen di-generate."
      );
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal menyimpan pengaturan.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Memuat data pengaturan...</Text>
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
      >
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View>
            <Text style={styles.header}>Pengaturan Desa</Text>
            <Text style={styles.subHeader}>Atur identitas untuk Kop Surat PDF</Text>
          </View>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="map-marker-radius-outline" size={20} color="#6200EE" />
              <Text style={styles.sectionTitle}>Identitas Wilayah</Text>
            </View>

            <TextInput
              label="Nama Desa (Tanpa kata 'Desa')"
              mode="outlined"
              value={namaDesa}
              onChangeText={setNamaDesa}
              style={styles.input}
              placeholder="Contoh: Sukamaju"
              theme={{ roundness: 12 }}
              activeOutlineColor="#6200EE"
            />
            <TextInput
              label="Alamat Lengkap Balai Desa"
              mode="outlined"
              value={alamatDesa}
              onChangeText={setAlamatDesa}
              multiline
              numberOfLines={3}
              style={styles.input}
              theme={{ roundness: 12 }}
              activeOutlineColor="#6200EE"
            />
            <View style={styles.rowInputs}>
              <TextInput
                label="Kecamatan"
                mode="outlined"
                value={kecamatan}
                onChangeText={setKecamatan}
                style={[styles.input, { flex: 1 }]}
                theme={{ roundness: 12 }}
                activeOutlineColor="#6200EE"
              />
              <View style={{ width: 12 }} />
              <TextInput
                label="Kabupaten / Kota"
                mode="outlined"
                value={kabupaten}
                onChangeText={setKabupaten}
                style={[styles.input, { flex: 1 }]}
                theme={{ roundness: 12 }}
                activeOutlineColor="#6200EE"
              />
            </View>

            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <MaterialCommunityIcons name="tie" size={20} color="#6200EE" />
              <Text style={styles.sectionTitle}>Pimpinan / Pejabat</Text>
            </View>

            <TextInput
              label="Nama Kepala Desa"
              mode="outlined"
              value={namaKepalaDesa}
              onChangeText={setNamaKepalaDesa}
              style={styles.input}
              theme={{ roundness: 12 }}
              activeOutlineColor="#6200EE"
            />
            <TextInput
              label="NIP Kepala Desa (Opsional)"
              mode="outlined"
              value={nipKepalaDesa}
              onChangeText={setNipKepalaDesa}
              keyboardType="numeric"
              style={styles.input}
              theme={{ roundness: 12 }}
              activeOutlineColor="#6200EE"
            />

            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <MaterialCommunityIcons name="shield-star-outline" size={20} color="#6200EE" />
              <Text style={styles.sectionTitle}>Logo Desa</Text>
            </View>

            <View style={styles.uploadCard}>
              <View style={styles.actionRow}>
                <Button
                  mode="outlined"
                  onPress={takePhoto}
                  icon="camera"
                  style={styles.actionBtn}
                  textColor="#6200EE"
                >
                  Kamera
                </Button>
                <View style={{ width: 10 }} />
                <Button
                  mode="outlined"
                  onPress={pickImage}
                  icon="image"
                  style={styles.actionBtn}
                  textColor="#6200EE"
                >
                  Galeri
                </Button>
              </View>

              {logoUri || logoUrl ? (
                <View style={styles.logoContainer}>
                  <Image
                    source={{ uri: logoUri || logoUrl }}
                    style={styles.logoPreview}
                    resizeMode="contain"
                  />
                  <Text style={styles.logoHint}>Logo siap digunakan</Text>
                </View>
              ) : (
                <View style={styles.placeholderContainer}>
                  <MaterialCommunityIcons name="image-off-outline" size={40} color="#cbd5e1" />
                  <Text style={styles.placeholderText}>Belum ada logo terpasang</Text>
                </View>
              )}
            </View>

            <Button
              mode="contained"
              onPress={handleSave}
              loading={loading}
              disabled={loading}
              style={styles.saveBtn}
              buttonColor="#6200EE"
              labelStyle={{ fontFamily: "Poppins_500Medium", fontSize: 16 }}
            >
              {loading ? "Menyimpan Pengaturan..." : "Simpan Pengaturan"}
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  loadingText: { marginTop: 12, fontFamily: "Poppins", fontSize: 13, color: "#64748b" },
  scrollContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  
  headerContainer: { flexDirection: "row", alignItems: "flex-start", marginBottom: 24 },
  backButton: { marginRight: 16, marginTop: 4, padding: 8, backgroundColor: "#ffffff", borderRadius: 12, elevation: 1 },
  header: { fontSize: 26, fontFamily: "Poppins_500Medium", color: "#1e293b" },
  subHeader: { fontSize: 13, fontFamily: "Poppins", color: "#64748b", marginTop: -2 },
  
  card: { backgroundColor: "#ffffff", borderRadius: 24, elevation: 2 },
  
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 8 },
  sectionTitle: { fontSize: 16, fontFamily: "Poppins_500Medium", color: "#1e293b" },
  
  input: { marginBottom: 16, backgroundColor: "#ffffff", fontFamily: "Poppins", fontSize: 14 },
  rowInputs: { flexDirection: "row", justifyContent: "space-between" },
  
  uploadCard: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 16, padding: 16, marginBottom: 16, backgroundColor: "#f8fafc" },
  actionRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  actionBtn: { flex: 1, borderRadius: 10, borderColor: "#6200EE" },
  
  logoContainer: { alignItems: "center", justifyContent: "center", marginTop: 10, marginBottom: 10 },
  logoPreview: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#ffffff", borderWidth: 2, borderColor: "#e2e8f0" },
  logoHint: { fontFamily: "Poppins", fontSize: 12, color: "#10b981", marginTop: 8 },
  
  placeholderContainer: { alignItems: "center", justifyContent: "center", height: 120, borderRadius: 16, borderWidth: 2, borderColor: "#e2e8f0", borderStyle: "dashed", backgroundColor: "#ffffff" },
  placeholderText: { fontFamily: "Poppins", fontSize: 12, color: "#94a3b8", marginTop: 8 },
  
  saveBtn: { marginTop: 20, paddingVertical: 6, borderRadius: 14, elevation: 2 },
});