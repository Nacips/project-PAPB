import { useEffect, useState } from "react";
import { 
  Alert, 
  Image, 
  ScrollView, 
  StyleSheet, 
  View, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableOpacity 
} from "react-native";
import { Button, Text, TextInput, ActivityIndicator } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updatePassword, signOut } from "firebase/auth";
import { db, auth } from "../../config/firebase";
import { uploadToCloudinary } from "../../config/cloudinary";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function AdminProfilScreen() {
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
        console.error("Gagal menarik data admin:", error);
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

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Izin Ditolak", "Aplikasi butuh izin untuk mengakses kamera.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
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
          Alert.alert("Peringatan", "Kata sandi minimal 6 karakter.");
          setLoading(false);
          return;
        }
        await updatePassword(auth.currentUser, passwordBaru);
        setPasswordBaru("");
      }

      setFotoUrl(finalFotoUrl);
      setFotoUri(null);
      Alert.alert("Sukses", "Profil admin berhasil diperbarui.");
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert("Keamanan", "Sesi Anda sudah terlalu lama. Silakan logout dan login kembali.");
      } else {
        Alert.alert("Error", "Gagal memperbarui profil.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Konfirmasi Keluar", "Apakah Anda yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Ya, Keluar",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
            router.replace("/login");
          } catch (error) {
            Alert.alert("Error", "Gagal logout.");
          }
        },
      },
    ]);
  };

  if (fetching) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Memuat data profil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.headerContainer}>
            <Text style={styles.header}>Profil Admin</Text>
            <Text style={styles.subHeader}>Kelola identitas dan keamanan akun</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.photoSection}>
              <View style={styles.avatarContainer}>
                <Image 
                  source={{ uri: fotoUri || fotoUrl || "https://res.cloudinary.com/dc4m93dhq/image/upload/v1/esurat/default-avatar.png" }} 
                  style={styles.avatar} 
                />
              </View>
              
              <View style={styles.photoActions}>
                <TouchableOpacity style={styles.photoBtn} onPress={takePhoto} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="camera-outline" size={20} color="#6200EE" />
                  <Text style={styles.photoBtnText}>Kamera</Text>
                </TouchableOpacity>
                <View style={styles.photoBtnDivider} />
                <TouchableOpacity style={styles.photoBtn} onPress={pickImage} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="image-outline" size={20} color="#6200EE" />
                  <Text style={styles.photoBtnText}>Galeri</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Informasi Pribadi</Text>
              
              <TextInput 
                label="Alamat Email (Permanen)" 
                mode="outlined" 
                value={email} 
                disabled 
                style={styles.input}
                theme={{ roundness: 12 }}
                left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="email-outline" size={20} color="#94a3b8" />} />}
              />
              
              <TextInput 
                label="Nama Lengkap" 
                mode="outlined" 
                value={nama} 
                onChangeText={setNama} 
                style={styles.input}
                theme={{ roundness: 12 }}
                activeOutlineColor="#6200EE"
                outlineColor="#e2e8f0"
                left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="account-outline" size={20} color="#64748b" />} />}
              />
              
              <TextInput 
                label="Nomor Handphone" 
                mode="outlined" 
                value={noHp} 
                onChangeText={setNoHp} 
                keyboardType="phone-pad" 
                style={styles.input}
                theme={{ roundness: 12 }}
                activeOutlineColor="#6200EE"
                outlineColor="#e2e8f0"
                left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="phone-outline" size={20} color="#64748b" />} />}
              />
            </View>

            <View style={styles.formSection}>
              <View style={styles.securityHeader}>
                <MaterialCommunityIcons name="shield-lock-outline" size={18} color="#475569" />
                <Text style={styles.sectionTitleSecurity}>Keamanan Akun</Text>
              </View>
              
              <TextInput 
                label="Kata Sandi Baru (Opsional)" 
                mode="outlined" 
                value={passwordBaru} 
                onChangeText={setPasswordBaru} 
                secureTextEntry 
                style={styles.input} 
                theme={{ roundness: 12 }}
                activeOutlineColor="#6200EE"
                outlineColor="#e2e8f0"
                placeholder="Kosongkan jika tidak ingin diubah"
                placeholderTextColor="#cbd5e1"
                left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="key-outline" size={20} color="#64748b" />} />}
              />
            </View>

            <Button 
              mode="contained" 
              onPress={handleSave} 
              loading={loading} 
              disabled={loading} 
              style={styles.saveBtn} 
              buttonColor="#6200EE"
              labelStyle={styles.saveBtnText}
            >
              {loading ? "Menyimpan Data..." : "Simpan Perubahan"}
            </Button>

            <Button 
              mode="outlined" 
              onPress={handleLogout} 
              style={styles.logoutBtn} 
              textColor="#dc2626"
              icon="logout"
              labelStyle={styles.logoutBtnText}
            >
              Keluar dari Akun
            </Button>
          </View>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  loadingText: { marginTop: 12, fontFamily: "Poppins", fontSize: 13, color: "#64748b" },
  
  headerContainer: { marginBottom: 24 },
  header: { fontSize: 28, fontFamily: "Poppins_500Medium", color: "#1e293b" },
  subHeader: { fontSize: 14, fontFamily: "Poppins", color: "#64748b", marginTop: -2 },
  
  card: { 
    backgroundColor: "#ffffff", 
    borderRadius: 24, 
    padding: 24, 
    elevation: 3, 
    shadowColor: "#000", 
    shadowOpacity: 0.05, 
    shadowRadius: 10, 
    shadowOffset: { width: 0, height: 4 } 
  },
  
  photoSection: { alignItems: "center", marginBottom: 30 },
  avatarContainer: {
    width: 110, height: 110, borderRadius: 55, 
    backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center",
    borderWidth: 3, borderColor: "#e0e7ff", marginBottom: 16, overflow: "hidden"
  },
  avatar: { width: "100%", height: "100%" },
  
  photoActions: { 
    flexDirection: "row", alignItems: "center", 
    backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0" 
  },
  photoBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  photoBtnText: { fontFamily: "Poppins_500Medium", fontSize: 13, color: "#1e293b", marginTop: 2 },
  photoBtnDivider: { width: 1, height: 20, backgroundColor: "#cbd5e1" },
  
  formSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontFamily: "Poppins_500Medium", color: "#334155", marginBottom: 12 },
  securityHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  sectionTitleSecurity: { fontSize: 16, fontFamily: "Poppins_500Medium", color: "#334155" },
  
  input: { marginBottom: 16, backgroundColor: "#ffffff", fontFamily: "Poppins", fontSize: 14 },
  
  saveBtn: { marginTop: 10, paddingVertical: 6, borderRadius: 14 },
  saveBtnText: { fontFamily: "Poppins_500Medium", fontSize: 16 },
  
  logoutBtn: { marginTop: 16, borderRadius: 14, borderColor: "#fca5a5" },
  logoutBtnText: { fontFamily: "Poppins_500Medium", fontSize: 16 },
});