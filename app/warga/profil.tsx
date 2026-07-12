import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, View, KeyboardAvoidingView, Platform } from "react-native";
import { Button, Card, Text, TextInput, ActivityIndicator, Divider } from "react-native-paper";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { db, auth } from "../../config/firebase";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function ProfilScreen() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [noHp, setNoHp] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  
  const [email, setEmail] = useState("");
  const [nama, setNama] = useState("");
  const [nik, setNik] = useState("");
  const [ttl, setTtl] = useState("");
  const [jenisKelamin, setJenisKelamin] = useState("");
  const [agama, setAgama] = useState("");
  const [pekerjaan, setPekerjaan] = useState("");
  const [alamat, setAlamat] = useState("");
  const [fotoKtp, setFotoKtp] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      try {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setEmail(userData.email || "");
          setNoHp(userData.noHp || "");
          setNik(userData.nik || "");
          setNama(userData.nama || "");

          if (userData.nik) {
            const qPenduduk = query(collection(db, "penduduk"), where("nik", "==", userData.nik));
            const snapPenduduk = await getDocs(qPenduduk);
            
            if (!snapPenduduk.empty) {
              const penData = snapPenduduk.docs[0].data();
              setNama(penData.nama || userData.nama);
              setTtl(`${penData.tempatLahir || "-"}, ${penData.tanggalLahir || "-"}`);
              setJenisKelamin(penData.jenisKelamin === "L" ? "Laki-laki" : penData.jenisKelamin === "P" ? "Perempuan" : "-");
              setAgama(penData.agama || "-");
              setPekerjaan(penData.pekerjaan || "-");
              setAlamat(penData.alamat || "-");
              setFotoKtp(penData.fotoKtpUrl || "");
            }
          }
        }
      } catch (error) {
        console.error("Gagal menarik data user:", error);
      } finally {
        setFetching(false);
      }
    };
    fetchUserData();
  }, []);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        noHp: noHp,
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

      Alert.alert("Sukses", "Data kontak dan keamanan berhasil diperbarui.");
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert("Keamanan", "Sesi Anda sudah terlalu lama. Silakan logout dan login kembali untuk mengganti kata sandi.");
      } else {
        Alert.alert("Error", "Gagal memperbarui profil. Periksa koneksi Anda.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Menyiapkan identitas digital...</Text>
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
            <Text style={styles.header}>Identitas Warga</Text>
            <Text style={styles.subHeader}>Terkoneksi langsung dengan master data desa</Text>
          </View>

          <Card style={styles.card}>
            
            <View style={styles.photoSection}>
              <View style={styles.avatarContainer}>
                {fotoKtp ? (
                  <Image source={{ uri: fotoKtp }} style={styles.avatar} />
                ) : (
                  <MaterialCommunityIcons name="card-account-details-outline" size={50} color="#cbd5e1" />
                )}
              </View>
              <View style={styles.badgeInfo}>
                <MaterialCommunityIcons name="shield-check" size={16} color="#10b981" />
                <Text style={styles.badgeText}>Terverifikasi Sistem Desa</Text>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Biodata Resmi (Sesuai KTP)</Text>
              <Text style={styles.infoLock}>Data di bawah ini tidak dapat diubah sendiri. Hubungi admin balai desa jika terdapat kesalahan.</Text>
              
              <TextInput 
                label="NIK" mode="outlined" value={nik} disabled style={styles.input} theme={{ roundness: 12 }}
                left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="smart-card-outline" size={20} color="#94a3b8" />} />}
              />
              <TextInput 
                label="Nama Lengkap" mode="outlined" value={nama} disabled style={styles.input} theme={{ roundness: 12 }}
                left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="account-outline" size={20} color="#94a3b8" />} />}
              />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TextInput 
                  label="TTL" mode="outlined" value={ttl} disabled style={[styles.input, { flex: 1 }]} theme={{ roundness: 12 }}
                />
                <TextInput 
                  label="Jenis Kelamin" mode="outlined" value={jenisKelamin} disabled style={[styles.input, { flex: 1 }]} theme={{ roundness: 12 }}
                />
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TextInput 
                  label="Agama" mode="outlined" value={agama} disabled style={[styles.input, { flex: 1 }]} theme={{ roundness: 12 }}
                />
                <TextInput 
                  label="Pekerjaan" mode="outlined" value={pekerjaan} disabled style={[styles.input, { flex: 1 }]} theme={{ roundness: 12 }}
                />
              </View>
              <TextInput 
                label="Alamat Lengkap" mode="outlined" value={alamat} disabled multiline numberOfLines={2} style={styles.input} theme={{ roundness: 12 }}
                left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="map-marker-outline" size={20} color="#94a3b8" />} />}
              />
            </View>

            <Divider style={styles.divider} />

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Kontak & Keamanan</Text>
              
              <TextInput 
                label="Alamat Email (Login)" mode="outlined" value={email} disabled style={styles.input} theme={{ roundness: 12 }}
                left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="email-outline" size={20} color="#94a3b8" />} />}
              />
              
              <TextInput 
                label="Nomor Handphone (Bisa Diubah)" 
                mode="outlined" 
                value={noHp} 
                onChangeText={setNoHp} 
                keyboardType="phone-pad" 
                style={styles.input}
                theme={{ roundness: 12 }}
                activeOutlineColor="#6200EE"
                outlineColor="#cbd5e1"
                left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="phone-outline" size={20} color="#6200EE" />} />}
              />
              
              <TextInput 
                label="Kata Sandi Baru (Opsional)" 
                mode="outlined" 
                value={passwordBaru} 
                onChangeText={setPasswordBaru} 
                secureTextEntry 
                style={styles.input} 
                theme={{ roundness: 12 }}
                activeOutlineColor="#6200EE"
                outlineColor="#cbd5e1"
                placeholder="Kosongkan jika tidak ingin diubah"
                placeholderTextColor="#cbd5e1"
                left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="key-outline" size={20} color="#6200EE" />} />}
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
              {loading ? "Menyimpan Data..." : "Simpan Perubahan Kontak"}
            </Button>
          </Card>
          
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
  
  photoSection: { alignItems: "center", marginBottom: 24, marginTop: 10 },
  avatarContainer: {
    width: 140, height: 100, borderRadius: 12, 
    backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#e2e8f0", marginBottom: 12, overflow: "hidden"
  },
  avatar: { width: "100%", height: "100%", resizeMode: "cover" },
  badgeInfo: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0fdf4", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: "#bbf7d0", gap: 6 },
  badgeText: { fontFamily: "Poppins_500Medium", fontSize: 12, color: "#166534", marginTop: 2 },
  
  formSection: { marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Poppins_500Medium", color: "#334155", marginBottom: 4 },
  infoLock: { fontSize: 11, fontFamily: "Poppins", color: "#ef4444", marginBottom: 16, lineHeight: 16 },
  
  input: { marginBottom: 16, backgroundColor: "#ffffff", fontFamily: "Poppins", fontSize: 14 },
  divider: { height: 1, backgroundColor: "#e2e8f0", marginBottom: 24 },
  
  saveBtn: { marginTop: 10, paddingVertical: 6, borderRadius: 14 },
  saveBtnText: { fontFamily: "Poppins_500Medium", fontSize: 15 },
});