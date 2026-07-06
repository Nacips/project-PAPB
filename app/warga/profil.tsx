import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput, ActivityIndicator } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { db, auth } from "../../config/firebase";
import { uploadToCloudinary } from "../../config/cloudinary";

export default function ProfilScreen() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [noHp, setNoHp] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      try {
        const docRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setNama(data.nama || "");
          setEmail(data.email || "");
          setNoHp(data.noHp || "");
          setFotoUrl(data.fotoProfileUrl || "");
        }
      } catch (error) {
        console.error("Gagal menarik data user:", error);
      } finally {
        setFetching(false);
      }
    };
    fetchUserData();
  }, []);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Izin Ditolak", "Izinkan akses galeri untuk mengganti foto profil.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setFotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    
    try {
      let finalFotoUrl = fotoUrl;

      if (fotoUri) {
        const uploadResult = await uploadToCloudinary(fotoUri, "esurat/profil");
        finalFotoUrl = uploadResult.url;
      }

      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        nama,
        noHp,
        fotoProfileUrl: finalFotoUrl,
      });

      if (passwordBaru.trim().length > 0) {
        if (passwordBaru.length < 6) {
          Alert.alert("Peringatan", "Password minimal 6 karakter.");
          setLoading(false);
          return;
        }
        await updatePassword(auth.currentUser, passwordBaru);
        setPasswordBaru("");
      }

      setFotoUrl(finalFotoUrl);
      setFotoUri(null);
      Alert.alert("Sukses", "Profil berhasil diperbarui.");
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert("Error", "Sesi Anda sudah terlalu lama. Silakan logout dan login kembali untuk mengganti password.");
      } else {
        Alert.alert("Error", "Gagal memperbarui profil.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Profil Saya</Text>
      <Text style={styles.subHeader}>Kelola informasi akun Anda</Text>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.photoContainer}>
            <Image 
              source={{ uri: fotoUri || fotoUrl || "https://res.cloudinary.com/dc4m93dhq/image/upload/v1/esurat/default-avatar.png" }} 
              style={styles.avatar} 
            />
            <Button mode="text" onPress={pickImage} icon="camera">Ubah Foto</Button>
          </View>

          <TextInput label="Email (Tidak bisa diubah)" mode="outlined" value={email} disabled style={styles.input} />
          <TextInput label="Nama Lengkap" mode="outlined" value={nama} onChangeText={setNama} style={styles.input} />
          <TextInput label="Nomor HP" mode="outlined" value={noHp} onChangeText={setNoHp} keyboardType="phone-pad" style={styles.input} />
          
          <Text style={styles.sectionTitle}>Ganti Password</Text>
          <TextInput 
            label="Password Baru (Opsional)" 
            mode="outlined" 
            value={passwordBaru} 
            onChangeText={setPasswordBaru} 
            secureTextEntry 
            style={styles.input} 
            placeholder="Biarkan kosong jika tidak ingin mengubah"
          />

          <Button 
            mode="contained" 
            onPress={handleSave} 
            loading={loading} 
            disabled={loading} 
            style={styles.saveBtn} 
            buttonColor="#6200ee"
          >
            Simpan Perubahan
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
  photoContainer: { alignItems: "center", marginBottom: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#e2e8f0", marginBottom: 8 },
  input: { marginBottom: 12, backgroundColor: "#ffffff" },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#475569", marginTop: 10, marginBottom: 10 },
  saveBtn: { marginTop: 20, paddingVertical: 6 },
});