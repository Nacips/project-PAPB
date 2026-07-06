import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput, ActivityIndicator } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { uploadToCloudinary } from "../../config/cloudinary";
import { PengaturanDesa } from "../../types";

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
      Alert.alert("Izin Ditolak", "Izinkan akses galeri untuk mengupload logo.");
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
    }
  };

  const handleSave = async () => {
    if (!namaDesa || !namaKepalaDesa || !kecamatan || !kabupaten) {
      Alert.alert("Peringatan", "Nama Desa, Kecamatan, Kabupaten, dan Nama Kepala Desa wajib diisi.");
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
      
      Alert.alert("Sukses", "Pengaturan desa berhasil disimpan. Data ini akan otomatis masuk ke Kop Surat PDF.");
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
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={{ marginTop: 10 }}>Memuat data pengaturan...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>Pengaturan Desa</Text>
      <Text style={styles.subHeader}>Data ini akan digunakan sebagai identitas pada Kop Surat PDF.</Text>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Identitas Wilayah</Text>
          <TextInput label="Nama Desa (Tanpa kata 'Desa')" mode="outlined" value={namaDesa} onChangeText={setNamaDesa} style={styles.input} placeholder="Contoh: Sukamaju" />
          <TextInput label="Alamat Lengkap Balai Desa" mode="outlined" value={alamatDesa} onChangeText={setAlamatDesa} multiline style={styles.input} />
          <TextInput label="Kecamatan" mode="outlined" value={kecamatan} onChangeText={setKecamatan} style={styles.input} />
          <TextInput label="Kabupaten / Kota" mode="outlined" value={kabupaten} onChangeText={setKabupaten} style={styles.input} />

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Pimpinan / Pejabat</Text>
          <TextInput label="Nama Kepala Desa" mode="outlined" value={namaKepalaDesa} onChangeText={setNamaKepalaDesa} style={styles.input} />
          <TextInput label="NIP Kepala Desa (Opsional)" mode="outlined" value={nipKepalaDesa} onChangeText={setNipKepalaDesa} keyboardType="numeric" style={styles.input} />

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Logo Desa</Text>
          <Button mode="outlined" onPress={pickImage} icon="camera">Pilih Logo Baru</Button>
          
          {(logoUri || logoUrl) && (
             <View style={styles.logoContainer}>
                <Image source={{ uri: logoUri || logoUrl }} style={styles.logoPreview} resizeMode="contain" />
             </View>
          )}

          <Button 
            mode="contained" 
            onPress={handleSave} 
            loading={loading} 
            disabled={loading} 
            style={styles.saveBtn} 
            buttonColor="#6200ee"
          >
            Simpan Pengaturan
          </Button>
        </Card.Content>
      </Card>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { fontSize: 24, fontWeight: "bold", color: "#1e293b", marginTop: 20 },
  subHeader: { fontSize: 14, color: "#64748b", marginBottom: 20 },
  card: { backgroundColor: "#ffffff", elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#6200ee", marginBottom: 10 },
  input: { marginBottom: 12, backgroundColor: "#ffffff" },
  logoContainer: { alignItems: "center", marginTop: 12, marginBottom: 10 },
  logoPreview: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#e2e8f0" },
  saveBtn: { marginTop: 24, paddingVertical: 6, borderRadius: 8 },
});