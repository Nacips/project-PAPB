import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput } from "react-native-paper";
import { uploadToCloudinary } from "../../config/cloudinary";
import {
    editData,
    hapusData,
    subscribeToCollection,
    tambahData,
} from "../../services/firestoreService";
import { Penduduk } from "../../types";

export default function AdminPenduduk() {
  const [data, setData] = useState<Penduduk[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [nik, setNik] = useState("");
  const [nama, setNama] = useState("");
  const [tempatLahir, setTempatLahir] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState("");
  const [jenisKelamin, setJenisKelamin] = useState<"L" | "P">("L");
  const [agama, setAgama] = useState("");
  const [pekerjaan, setPekerjaan] = useState("");
  const [alamat, setAlamat] = useState("");
  const [noHp, setNoHp] = useState("");

  const [fotoKtpUri, setFotoKtpUri] = useState<string | null>(null);
  const [fotoKkUri, setFotoKkUri] = useState<string | null>(null);
  const [fotoKtpUrl, setFotoKtpUrl] = useState("");
  const [fotoKkUrl, setFotoKkUrl] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToCollection("penduduk", (result) => {
      setData(result);
    });
    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setNik("");
    setNama("");
    setTempatLahir("");
    setTanggalLahir("");
    setJenisKelamin("L");
    setAgama("");
    setPekerjaan("");
    setAlamat("");
    setNoHp("");
    setFotoKtpUri(null);
    setFotoKkUri(null);
    setFotoKtpUrl("");
    setFotoKkUrl("");
  };

  const pickImage = async (type: "ktp" | "kk") => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Permission",
        "Izin akses galeri ditolak. Silakan izinkan di pengaturan HP.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === "ktp") {
        setFotoKtpUri(result.assets[0].uri);
      } else {
        setFotoKkUri(result.assets[0].uri);
      }
    }
  };

  const handleSave = async () => {
    if (!nik || !nama || !alamat) {
      Alert.alert("Peringatan", "NIK, Nama, dan Alamat wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      let ktpUrl = fotoKtpUrl;
      let kkUrl = fotoKkUrl;

      if (fotoKtpUri && !fotoKtpUrl) {
        const result = await uploadToCloudinary(fotoKtpUri, "esurat/ktp");
        ktpUrl = result.url;
      }

      if (fotoKkUri && !fotoKkUrl) {
        const result = await uploadToCloudinary(fotoKkUri, "esurat/kk");
        kkUrl = result.url;
      }

      const payload = {
        nik,
        nama,
        tempatLahir,
        tanggalLahir,
        jenisKelamin,
        agama,
        pekerjaan,
        alamat,
        noHp,
        fotoKtpUrl: ktpUrl,
        fotoKkUrl: kkUrl,
        createdAt: new Date().toISOString(),
      };

      if (editId) {
        await editData("penduduk", editId, payload);
        Alert.alert("Sukses", "Data penduduk berhasil diupdate.");
      } else {
        await tambahData("penduduk", payload);
        Alert.alert("Sukses", "Data penduduk berhasil ditambahkan.");
      }

      resetForm();
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error",
        "Gagal menyimpan data. Cek koneksi atau konfigurasi Cloudinary.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditId(item.id);
    setNik(item.nik);
    setNama(item.nama);
    setTempatLahir(item.tempatLahir);
    setTanggalLahir(item.tanggalLahir);
    setJenisKelamin(item.jenisKelamin);
    setAgama(item.agama);
    setPekerjaan(item.pekerjaan);
    setAlamat(item.alamat);
    setNoHp(item.noHp);
    setFotoKtpUrl(item.fotoKtpUrl || "");
    setFotoKkUrl(item.fotoKkUrl || "");
    setFotoKtpUri(null);
    setFotoKkUri(null);
  };

  const handleDelete = (id: string | undefined) => {
    if (!id) return;

    Alert.alert("Konfirmasi", "Yakin ingin menghapus data penduduk ini?", [
      { text: "Batal" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          await hapusData("penduduk", id);
          Alert.alert("Sukses", "Data berhasil dihapus.");
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Manajemen Data Penduduk</Text>

      <Card style={styles.formCard}>
        <Card.Content>
          <Text style={styles.formTitle}>
            {editId ? "Edit Data Penduduk" : "Tambah Data Baru"}
          </Text>

          <TextInput
            label="NIK (16 Digit)"
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            maxLength={16}
            value={nik}
            onChangeText={setNik}
          />
          <TextInput
            label="Nama Lengkap"
            mode="outlined"
            style={styles.input}
            value={nama}
            onChangeText={setNama}
          />
          <TextInput
            label="Tempat Lahir"
            mode="outlined"
            style={styles.input}
            value={tempatLahir}
            onChangeText={setTempatLahir}
          />
          <TextInput
            label="Tanggal Lahir (DD/MM/YYYY)"
            mode="outlined"
            style={styles.input}
            value={tanggalLahir}
            onChangeText={setTanggalLahir}
          />

          <View style={styles.row}>
            <Button
              mode={jenisKelamin === "L" ? "contained" : "outlined"}
              onPress={() => setJenisKelamin("L")}
              style={styles.genderBtn}
            >
              <Text>Laki-laki</Text>
            </Button>
            <Button
              mode={jenisKelamin === "P" ? "contained" : "outlined"}
              onPress={() => setJenisKelamin("P")}
              style={styles.genderBtn}
            >
              <Text>Perempuan</Text>
            </Button>
          </View>

          <TextInput
            label="Agama"
            mode="outlined"
            style={styles.input}
            value={agama}
            onChangeText={setAgama}
          />
          <TextInput
            label="Pekerjaan"
            mode="outlined"
            style={styles.input}
            value={pekerjaan}
            onChangeText={setPekerjaan}
          />
          <TextInput
            label="Alamat Lengkap"
            mode="outlined"
            style={styles.input}
            value={alamat}
            onChangeText={setAlamat}
            multiline
            numberOfLines={3}
          />
          <TextInput
            label="No. HP"
            mode="outlined"
            style={styles.input}
            keyboardType="phone-pad"
            value={noHp}
            onChangeText={setNoHp}
          />

          <Text style={styles.label}>Foto KTP</Text>
          <Button
            mode="outlined"
            onPress={() => pickImage("ktp")}
            icon="camera"
          >
            <Text>Pilih Foto KTP</Text>
          </Button>
          {fotoKtpUri && (
            <Image source={{ uri: fotoKtpUri }} style={styles.preview} />
          )}
          {fotoKtpUrl && !fotoKtpUri && (
            <Image source={{ uri: fotoKtpUrl }} style={styles.preview} />
          )}

          <Text style={styles.label}>Foto Kartu Keluarga (KK)</Text>
          <Button mode="outlined" onPress={() => pickImage("kk")} icon="camera">
            <Text>Pilih Foto KK</Text>
          </Button>
          {fotoKkUri && (
            <Image source={{ uri: fotoKkUri }} style={styles.preview} />
          )}
          {fotoKkUrl && !fotoKkUri && (
            <Image source={{ uri: fotoKkUrl }} style={styles.preview} />
          )}

          <Button
            mode="contained"
            onPress={handleSave}
            loading={loading}
            disabled={loading}
            style={styles.saveBtn}
            buttonColor="#6200ee"
          >
            <Text>{editId ? "Update Data" : "Simpan Data"}</Text>
          </Button>
          {editId && (
            <Button mode="text" onPress={resetForm} textColor="#d32f2f">
              <Text>Batal Edit</Text>
            </Button>
          )}
        </Card.Content>
      </Card>

      <Text style={styles.listTitle}>
        Daftar Penduduk ({data.length} Orang)
      </Text>
      {data.length === 0 ? (
        <Card style={styles.listCard}>
          <Card.Content>
            <Text style={{ textAlign: "center", color: "#94a3b8" }}>
              Belum ada data penduduk.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        data.map((item) => (
          <Card key={item.id} style={styles.listCard}>
            <Card.Content>
              <Text style={styles.listName}>{item.nama}</Text>
              <Text>NIK: {item.nik}</Text>
              <Text>Alamat: {item.alamat}</Text>
              <View style={styles.actionRow}>
                <Button
                  mode="contained-tonal"
                  onPress={() => handleEdit(item)}
                  textColor="#0284c7"
                >
                  <Text>Edit</Text>
                </Button>
                <Button
                  mode="contained-tonal"
                  onPress={() => handleDelete(item.id)}
                  textColor="#d32f2f"
                >
                  <Text>Hapus</Text>
                </Button>
              </View>
            </Card.Content>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 20,
    textAlign: "center",
  },
  formCard: { marginBottom: 20, backgroundColor: "#ffffff", elevation: 2 },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#6200ee",
  },
  input: { marginBottom: 12, backgroundColor: "#ffffff" },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  genderBtn: { flex: 1, marginHorizontal: 5 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginTop: 12,
    marginBottom: 8,
  },
  preview: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: "#e2e8f0",
  },
  saveBtn: { marginTop: 16, paddingVertical: 4 },
  listTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 12,
  },
  listCard: { marginBottom: 12, backgroundColor: "#ffffff", elevation: 1 },
  listName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
});