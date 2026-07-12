import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Card, Text, TextInput, ActivityIndicator } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from 'xlsx';
import Papa from "papaparse";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
  const [loadingList, setLoadingList] = useState(true);
  
  const [viewMode, setViewMode] = useState<"list" | "form">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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
  const [fotoKtpType, setFotoKtpType] = useState<"image" | "pdf" | null>(null);
  const [fotoKkType, setFotoKkType] = useState<"image" | "pdf" | null>(null);

  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const unsubscribe = subscribeToCollection("penduduk", (result) => {
      setData(result);
      setLoadingList(false);
    });
    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setEditId(null); setNik(""); setNama(""); setTempatLahir(""); setTanggalLahir("");
    setJenisKelamin("L"); setAgama(""); setPekerjaan(""); setAlamat(""); setNoHp("");
    setFotoKtpUri(null); setFotoKkUri(null); setFotoKtpUrl(""); setFotoKkUrl("");
    setFotoKtpType(null); setFotoKkType(null);
    setViewMode("list");
  };

  const handleExportExcel = async () => {
    if (data.length === 0) {
      Alert.alert("Info", "Tidak ada data penduduk untuk diekspor.");
      return;
    }
    setIsExporting(true);
    try {
      const excelData = data.map(item => ({
        NIK: item.nik,
        Nama: item.nama,
        Tempat_Lahir: item.tempatLahir,
        Tanggal_Lahir: item.tanggalLahir,
        Jenis_Kelamin: item.jenisKelamin,
        Agama: item.agama,
        Pekerjaan: item.pekerjaan,
        Alamat: item.alamat,
        No_HP: item.noHp
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      ws['!cols'] = [
        { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 15 },
        { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 40 }, { wch: 15 }
      ];

      if (ws['!ref']) {
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
          const nikCell = XLSX.utils.encode_cell({ r: R, c: 0 });
          if (ws[nikCell]) {
            ws[nikCell].t = 's';
            ws[nikCell].z = '@';
          }
          
          const hpCell = XLSX.utils.encode_cell({ r: R, c: 8 });
          if (ws[hpCell]) {
            ws[hpCell].t = 's';
            ws[hpCell].z = '@';
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, "Data Penduduk");

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
      
      if (!FileSystem.documentDirectory) {
        Alert.alert("Error", "Tidak dapat mengakses direktori penyimpanan.");
        setIsExporting(false);
        return;
      }
      
      const fileUri = `${FileSystem.documentDirectory}Data_Penduduk_Desa_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Simpan Data Penduduk (Excel)",
          UTI: "org.openxmlformats.spreadsheetml.sheet"
        });
      }

      Alert.alert(
        "✅ Export Excel Berhasil",
        "File Excel (.xlsx) telah disimpan.\n\nNIK dan No_HP sudah diformat sebagai TEXT."
      );
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal mengekspor data ke Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportExcel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel'
        ],
        copyToCacheDirectory: true
      });

      if (result.canceled) return;
      setIsImporting(true);

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64
      });

      const workbook = XLSX.read(fileContent, { type: 'base64' });
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as any[];
      
      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;

      for (const row of jsonData) {
        try {
          const rawNik = String(row.NIK || row.nik || "").trim();
          const rawNama = String(row.Nama || row.nama || "").trim();

          if (!rawNik || !rawNama) {
            errorCount++;
            continue;
          }

          let cleanNik = rawNik;
          if (rawNik.includes('E+') || rawNik.includes('e+')) {
            const parts = rawNik.toLowerCase().split('e+');
            if (parts.length === 2) {
              const base = parts[0].replace('.', '');
              const exp = parseInt(parts[1]);
              cleanNik = (base + '0'.repeat(Math.max(0, exp - (base.length - 1)))).substring(0, 16);
            }
          } else {
            cleanNik = rawNik.replace(/\D/g, '');
          }

          if (cleanNik.length !== 16) {
            console.warn(`NIK tidak valid: ${cleanNik}`);
            errorCount++;
            continue;
          }

          const rawHp = String(row.No_HP || row.no_hp || "").trim();
          let cleanHp = rawHp.replace(/\D/g, '');
          if (rawHp.includes('E+') || rawHp.includes('e+')) {
            const parts = rawHp.toLowerCase().split('e+');
            if (parts.length === 2) {
              const base = parts[0].replace('.', '');
              const exp = parseInt(parts[1]);
              cleanHp = (base + '0'.repeat(Math.max(0, exp - (base.length - 1)))).substring(0, 15);
            }
          }

          const exists = data.some(d => d.nik === cleanNik);
          if (exists) {
            skipCount++;
            continue;
          }

          const payload = {
            nik: cleanNik,
            nama: rawNama,
            tempatLahir: String(row.Tempat_Lahir || row.tempat_lahir || "").trim(),
            tanggalLahir: String(row.Tanggal_Lahir || row.tanggal_lahir || "").trim(),
            jenisKelamin: String(row.Jenis_Kelamin || row.jenis_kelamin || "L").trim(),
            agama: String(row.Agama || row.agama || "").trim(),
            pekerjaan: String(row.Pekerjaan || row.pekerjaan || "").trim(),
            alamat: String(row.Alamat || row.alamat || "").trim(),
            noHp: cleanHp,
            fotoKtpUrl: "",
            fotoKkUrl: "",
            createdAt: new Date().toISOString(),
          };

          await tambahData("penduduk", payload);
          successCount++;
        } catch (err) {
          console.error("Error processing row:", err);
          errorCount++;
        }
      }

      let message = `✅ Berhasil: ${successCount} warga\n`;
      if (skipCount > 0) message += `⚠️ Dilewati (duplikat): ${skipCount}\n`;
      if (errorCount > 0) message += `❌ Error/Invalid: ${errorCount}\n`;

      Alert.alert("Import Excel Selesai", message);
      setIsImporting(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal membaca file Excel.");
      setIsImporting(false);
    }
  };

  const pickImage = async (type: "ktp" | "kk") => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Izin Ditolak", "Izinkan akses galeri di pengaturan HP Anda.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      if (type === "ktp") { 
        setFotoKtpUri(result.assets[0].uri); 
        setFotoKtpUrl(""); 
        setFotoKtpType("image");
      } else { 
        setFotoKkUri(result.assets[0].uri); 
        setFotoKkUrl(""); 
        setFotoKkType("image");
      }
    }
  };

  const takePhoto = async (type: "ktp" | "kk") => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Izin Ditolak", "Aplikasi butuh izin untuk mengakses kamera.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      if (type === "ktp") { 
        setFotoKtpUri(result.assets[0].uri); 
        setFotoKtpUrl(""); 
        setFotoKtpType("image");
      } else { 
        setFotoKkUri(result.assets[0].uri); 
        setFotoKkUrl(""); 
        setFotoKkType("image");
      }
    }
  };

  const pickDocument = async (type: "ktp" | "kk") => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      const fileName = file.name || "";
      const isPdf = fileName.toLowerCase().endsWith('.pdf');

      if (type === "ktp") {
        setFotoKtpUri(file.uri);
        setFotoKtpUrl("");
        setFotoKtpType(isPdf ? "pdf" : "image");
      } else {
        setFotoKkUri(file.uri);
        setFotoKkUrl("");
        setFotoKkType(isPdf ? "pdf" : "image");
      }

      Alert.alert("✅ File Dipilih", `${fileName} berhasil dipilih.`);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal memilih file.");
    }
  };

  const handleBulkUploadKTPKK = async (type: "ktp" | "kk") => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
        multiple: true,
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setIsBulkUploading(true);
      const files = result.assets;
      const totalFiles = files.length;
      
      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;
      const notFoundNiks: string[] = [];

      setBulkProgress({ current: 0, total: totalFiles });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.name || "";
        
        setBulkProgress({ current: i + 1, total: totalFiles });

        try {
          const nikMatch = fileName.match(/^(\d{16})/);
          
          if (!nikMatch) {
            console.warn(`❌ Format nama file salah: ${fileName}`);
            errorCount++;
            continue;
          }

          const nik = nikMatch[1];
          const penduduk = data.find(d => d.nik === nik);
          
          if (!penduduk) {
            notFoundNiks.push(nik);
            skipCount++;
            continue;
          }

          const folder = type === "ktp" ? "esurat/ktp" : "esurat/kk";
          const uploadResult = await uploadToCloudinary(file.uri, folder);

          const fieldToUpdate = type === "ktp" 
            ? { fotoKtpUrl: uploadResult.url } 
            : { fotoKkUrl: uploadResult.url };

          await editData("penduduk", penduduk.id!, {
            ...penduduk,
            ...fieldToUpdate
          });

          successCount++;
        } catch (err) {
          console.error(`Error upload ${fileName}:`, err);
          errorCount++;
        }
      }

      let message = `✅ Berhasil: ${successCount} file\n`;
      if (skipCount > 0) {
        message += `⚠️ NIK tidak ditemukan: ${skipCount}\n`;
        if (notFoundNiks.length <= 5) {
          message += `   ${notFoundNiks.join(", ")}\n`;
        } else {
          message += `   ${notFoundNiks.slice(0, 5).join(", ")} dan ${notFoundNiks.length - 5} lainnya\n`;
        }
      }
      if (errorCount > 0) message += `❌ Error: ${errorCount}`;

      Alert.alert(
        `Upload ${type.toUpperCase()} Selesai`,
        message,
        [{ text: "OK" }]
      );

      setIsBulkUploading(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal melakukan bulk upload.");
      setIsBulkUploading(false);
    }
  };

  const handleSave = async () => {
    if (!nik || !nama || !alamat) {
      Alert.alert("Peringatan", "NIK, Nama, dan Alamat wajib diisi."); return;
    }
    setLoading(true);
    try {
      let ktpUrl = fotoKtpUrl; let kkUrl = fotoKkUrl;
      if (fotoKtpUri) {
        const result = await uploadToCloudinary(fotoKtpUri, "esurat/ktp");
        ktpUrl = result.url;
      }
      if (fotoKkUri) {
        const result = await uploadToCloudinary(fotoKkUri, "esurat/kk");
        kkUrl = result.url;
      }

      const payload = {
        nik, nama, tempatLahir, tanggalLahir, jenisKelamin, agama, pekerjaan, alamat, noHp,
        fotoKtpUrl: ktpUrl, fotoKkUrl: kkUrl, createdAt: new Date().toISOString(),
      };

      if (editId) {
        await editData("penduduk", editId, payload);
        Alert.alert("Sukses", "Data penduduk berhasil diperbarui.");
      } else {
        await tambahData("penduduk", payload);
        Alert.alert("Sukses", "Data penduduk baru berhasil ditambahkan.");
      }
      resetForm();
    } catch (error) {
      Alert.alert("Error", "Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditId(item.id); setNik(item.nik); setNama(item.nama); setTempatLahir(item.tempatLahir);
    setTanggalLahir(item.tanggalLahir); setJenisKelamin(item.jenisKelamin); setAgama(item.agama);
    setPekerjaan(item.pekerjaan); setAlamat(item.alamat); setNoHp(item.noHp);
    setFotoKtpUrl(item.fotoKtpUrl || ""); setFotoKkUrl(item.fotoKkUrl || "");
    setFotoKtpUri(null); setFotoKkUri(null);
    
    setFotoKtpType(item.fotoKtpUrl?.toLowerCase().includes('.pdf') ? "pdf" : item.fotoKtpUrl ? "image" : null);
    setFotoKkType(item.fotoKkUrl?.toLowerCase().includes('.pdf') ? "pdf" : item.fotoKkUrl ? "image" : null);
    
    setViewMode("form");
  };

  const handleDelete = (id: string | undefined) => {
    if (!id) return;
    Alert.alert("Hapus Data", "Yakin ingin menghapus data penduduk ini?", [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: async () => { await hapusData("penduduk", id); } },
    ]);
  };

  const filteredData = data.filter((item) => 
    item.nama.toLowerCase().includes(searchQuery.toLowerCase()) || item.nik.includes(searchQuery)
  );

  const handleOpenPdf = (url: string) => {
    Linking.openURL(url);
  };

  if (viewMode === "list") {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Data Penduduk</Text>
          <Text style={styles.subHeader}>Kelola master data warga desa</Text>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={24} color="#94a3b8" />
            <TextInput
              placeholder="Cari nama atau NIK..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
            />
            {searchQuery !== "" && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#cbd5e1" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.fabBtn} onPress={() => setViewMode("form")} activeOpacity={0.8}>
            <MaterialCommunityIcons name="account-plus-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.importExportRow}>
          <TouchableOpacity 
            style={[styles.importBtn, (isExporting || isImporting) && { opacity: 0.5 }]} 
            onPress={handleExportExcel} 
            disabled={isExporting || isImporting}
          >
            <MaterialCommunityIcons name="microsoft-excel" size={20} color="#16a34a" />
            <Text style={[styles.importBtnText, { color: "#16a34a" }]}>
              {isExporting ? "..." : "Export"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.exportBtn, (isExporting || isImporting) && { opacity: 0.5 }]} 
            onPress={handleImportExcel} 
            disabled={isExporting || isImporting}
          >
            <MaterialCommunityIcons name="database-import-outline" size={20} color="#9333ea" />
            <Text style={[styles.importBtnText, { color: "#9333ea" }]}>
              {isImporting ? "..." : "Import"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bulkUploadContainer}>
          <TouchableOpacity 
            style={styles.bulkUploadHeader}
            onPress={() => setShowBulkUpload(!showBulkUpload)}
            activeOpacity={0.7}
          >
            <View style={styles.bulkUploadHeaderLeft}>
              <MaterialCommunityIcons name="upload-multiple" size={20} color="#64748b" />
              <Text style={styles.bulkUploadHeaderText}>Bulk Upload Dokumen</Text>
            </View>
            <MaterialCommunityIcons 
              name={showBulkUpload ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#64748b" 
            />
          </TouchableOpacity>

          {showBulkUpload && (
            <View style={styles.bulkUploadContent}>
              <Text style={styles.bulkUploadDesc}>
                Format: <Text style={styles.bold}>NIK_ktp.jpg</Text> atau <Text style={styles.bold}>NIK_kk.pdf</Text>
              </Text>
              
              <View style={styles.bulkButtonRow}>
                <TouchableOpacity 
                  style={[styles.bulkBtn, styles.bulkBtnKtp, isBulkUploading && { opacity: 0.5 }]} 
                  onPress={() => handleBulkUploadKTPKK("ktp")} 
                  disabled={isBulkUploading}
                >
                  <MaterialCommunityIcons name="card-account-details" size={18} color="#ffffff" />
                  <Text style={styles.bulkBtnText}>
                    {isBulkUploading ? `${bulkProgress.current}/${bulkProgress.total}` : "Upload KTP"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.bulkBtn, styles.bulkBtnKk, isBulkUploading && { opacity: 0.5 }]} 
                  onPress={() => handleBulkUploadKTPKK("kk")} 
                  disabled={isBulkUploading}
                >
                  <MaterialCommunityIcons name="file-document-multiple" size={18} color="#ffffff" />
                  <Text style={styles.bulkBtnText}>Upload KK</Text>
                </TouchableOpacity>
              </View>

              {isBulkUploading && (
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }
                    ]} 
                  />
                </View>
              )}
            </View>
          )}
        </View>

        {loadingList ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#6200EE" />
          </View>
        ) : filteredData.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="account-search-outline" size={60} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Tidak Ada Data</Text>
            <Text style={styles.emptyText}>Data penduduk kosong atau tidak ditemukan.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
            <Text style={styles.totalText}>Total: {filteredData.length} Warga</Text>
            {filteredData.map((item) => (
              <Card key={item.id} style={styles.listCard}>
                <Card.Content>
                  <View style={styles.listHeader}>
                    <View style={styles.avatarBox}>
                      <MaterialCommunityIcons name={item.jenisKelamin === "L" ? "face-man-outline" : "face-woman-outline"} size={28} color="#6200EE" />
                    </View>
                    <View style={styles.listInfo}>
                      <Text style={styles.listName}>{item.nama}</Text>
                      <Text style={styles.listNik}>{item.nik}</Text>
                    </View>
                  </View>
                  <View style={styles.listAddressRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={16} color="#64748b" />
                    <Text style={styles.listAddress} numberOfLines={2}>{item.alamat}</Text>
                  </View>
                  <View style={styles.listActions}>
                    <Button mode="outlined" onPress={() => handleEdit(item)} style={styles.actionBtn} textColor="#0284c7" icon="pencil-outline">Edit</Button>
                    <View style={{ width: 10 }} />
                    <Button mode="outlined" onPress={() => handleDelete(item.id)} style={[styles.actionBtn, { borderColor: "#fca5a5" }]} textColor="#dc2626" icon="trash-can-outline">Hapus</Button>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
        
        <View style={styles.formHeaderRow}>
          <TouchableOpacity onPress={resetForm} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View>
            <Text style={styles.header}>{editId ? "Edit Penduduk" : "Tambah Warga"}</Text>
            <Text style={styles.subHeader}>Lengkapi biodata dengan benar</Text>
          </View>
        </View>

        <Card style={styles.formCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Identitas Utama</Text>
            
            <TextInput label="NIK (16 Digit)" mode="outlined" style={styles.input} keyboardType="numeric" maxLength={16} value={nik} onChangeText={setNik} theme={{ roundness: 12 }} activeOutlineColor="#6200EE" />
            <TextInput label="Nama Lengkap (Sesuai KTP)" mode="outlined" style={styles.input} value={nama} onChangeText={setNama} theme={{ roundness: 12 }} activeOutlineColor="#6200EE" />
            
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TextInput label="Tempat Lahir" mode="outlined" style={[styles.input, { flex: 1 }]} value={tempatLahir} onChangeText={setTempatLahir} theme={{ roundness: 12 }} activeOutlineColor="#6200EE" />
              <TextInput label="Tgl Lahir" placeholder="DD/MM/YYYY" mode="outlined" style={[styles.input, { flex: 1 }]} value={tanggalLahir} onChangeText={setTanggalLahir} theme={{ roundness: 12 }} activeOutlineColor="#6200EE" />
            </View>

            <Text style={styles.label}>Jenis Kelamin</Text>
            <View style={styles.genderRow}>
              <TouchableOpacity style={[styles.genderBtn, jenisKelamin === "L" && styles.genderBtnActive]} onPress={() => setJenisKelamin("L")} activeOpacity={0.8}>
                <MaterialCommunityIcons name="gender-male" size={20} color={jenisKelamin === "L" ? "#ffffff" : "#64748b"} />
                <Text style={[styles.genderText, jenisKelamin === "L" && { color: "#ffffff" }]}>Laki-laki</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.genderBtn, jenisKelamin === "P" && styles.genderBtnActive]} onPress={() => setJenisKelamin("P")} activeOpacity={0.8}>
                <MaterialCommunityIcons name="gender-female" size={20} color={jenisKelamin === "P" ? "#ffffff" : "#64748b"} />
                <Text style={[styles.genderText, jenisKelamin === "P" && { color: "#ffffff" }]}>Perempuan</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Data Tambahan</Text>
            
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TextInput label="Agama" mode="outlined" style={[styles.input, { flex: 1 }]} value={agama} onChangeText={setAgama} theme={{ roundness: 12 }} activeOutlineColor="#6200EE" />
              <TextInput label="Pekerjaan" mode="outlined" style={[styles.input, { flex: 1 }]} value={pekerjaan} onChangeText={setPekerjaan} theme={{ roundness: 12 }} activeOutlineColor="#6200EE" />
            </View>

            <TextInput label="Alamat Lengkap" mode="outlined" style={styles.input} value={alamat} onChangeText={setAlamat} multiline numberOfLines={3} theme={{ roundness: 12 }} activeOutlineColor="#6200EE" />
            <TextInput label="No. Handphone" mode="outlined" style={styles.input} keyboardType="phone-pad" value={noHp} onChangeText={setNoHp} theme={{ roundness: 12 }} activeOutlineColor="#6200EE" />

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Dokumen KTP</Text>
            <View style={styles.uploadCard}>
              <View style={styles.actionRow}>
                <Button mode="outlined" onPress={() => takePhoto("ktp")} icon="camera" style={styles.uploadBtn} textColor="#6200EE">Kamera</Button>
                <View style={{ width: 8 }} />
                <Button mode="outlined" onPress={() => pickImage("ktp")} icon="image" style={styles.uploadBtn} textColor="#6200EE">Galeri</Button>
                <View style={{ width: 8 }} />
                <Button mode="outlined" onPress={() => pickDocument("ktp")} icon="file-pdf-box" style={styles.uploadBtn} textColor="#6200EE">File</Button>
              </View>
              
              {(fotoKtpUri || fotoKtpUrl) ? (
                fotoKtpType === "pdf" ? (
                  <View style={styles.pdfPreview}>
                    <MaterialCommunityIcons name="file-pdf-box" size={60} color="#dc2626" />
                    <Text style={styles.pdfText}>File PDF Terupload</Text>
                    {fotoKtpUrl && (
                      <TouchableOpacity 
                        style={styles.viewPdfBtn}
                        onPress={() => handleOpenPdf(fotoKtpUrl)}
                      >
                        <MaterialCommunityIcons name="eye" size={16} color="#ffffff" />
                        <Text style={styles.viewPdfBtnText}>Lihat PDF</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <Image source={{ uri: fotoKtpUri || fotoKtpUrl }} style={styles.previewImage} />
                )
              ) : (
                <View style={styles.previewPlaceholder}>
                  <MaterialCommunityIcons name="card-account-details-outline" size={40} color="#cbd5e1" />
                  <Text style={styles.placeholderText}>Belum ada dokumen KTP</Text>
                </View>
              )}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Dokumen KK</Text>
            <View style={styles.uploadCard}>
              <View style={styles.actionRow}>
                <Button mode="outlined" onPress={() => takePhoto("kk")} icon="camera" style={styles.uploadBtn} textColor="#6200EE">Kamera</Button>
                <View style={{ width: 8 }} />
                <Button mode="outlined" onPress={() => pickImage("kk")} icon="image" style={styles.uploadBtn} textColor="#6200EE">Galeri</Button>
                <View style={{ width: 8 }} />
                <Button mode="outlined" onPress={() => pickDocument("kk")} icon="file-pdf-box" style={styles.uploadBtn} textColor="#6200EE">File</Button>
              </View>
              
              {(fotoKkUri || fotoKkUrl) ? (
                fotoKkType === "pdf" ? (
                  <View style={styles.pdfPreview}>
                    <MaterialCommunityIcons name="file-pdf-box" size={60} color="#dc2626" />
                    <Text style={styles.pdfText}>File PDF Terupload</Text>
                    {fotoKkUrl && (
                      <TouchableOpacity 
                        style={styles.viewPdfBtn}
                        onPress={() => handleOpenPdf(fotoKkUrl)}
                      >
                        <MaterialCommunityIcons name="eye" size={16} color="#ffffff" />
                        <Text style={styles.viewPdfBtnText}>Lihat PDF</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <Image source={{ uri: fotoKkUri || fotoKkUrl }} style={styles.previewImage} />
                )
              ) : (
                <View style={styles.previewPlaceholder}>
                  <MaterialCommunityIcons name="file-document-outline" size={40} color="#cbd5e1" />
                  <Text style={styles.placeholderText}>Belum ada dokumen KK</Text>
                </View>
              )}
            </View>

            <Button mode="contained" onPress={handleSave} loading={loading} disabled={loading} style={styles.saveBtn} buttonColor="#6200EE" labelStyle={{ fontFamily: "Poppins_500Medium", fontSize: 16 }}>
              {loading ? "Menyimpan..." : (editId ? "Update Data" : "Simpan Data")}
            </Button>
            
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  headerContainer: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  header: { fontSize: 28, fontFamily: "Poppins_500Medium", color: "#1e293b" },
  subHeader: { fontSize: 14, fontFamily: "Poppins", color: "#64748b", marginTop: -2 },
  
  searchRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, marginBottom: 12, gap: 12 },
  searchContainer: { 
    flex: 1, flexDirection: "row", alignItems: "center", 
    backgroundColor: "#ffffff", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4, 
    elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5 
  },
  searchInput: { flex: 1, backgroundColor: "transparent", fontSize: 14, fontFamily: "Poppins", height: 45 },
  fabBtn: { width: 50, height: 50, borderRadius: 16, backgroundColor: "#6200EE", justifyContent: "center", alignItems: "center", elevation: 3 },
  
  importExportRow: { flexDirection: "row", paddingHorizontal: 24, marginBottom: 16, gap: 12 },
  importBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#f0f9ff", borderWidth: 1, borderColor: "#7dd3fc", paddingVertical: 10, borderRadius: 12, gap: 6 },
  exportBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#86efac", paddingVertical: 10, borderRadius: 12, gap: 6 },
  importBtnText: { fontFamily: "Poppins_500Medium", fontSize: 13 },

  bulkUploadContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  bulkUploadHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  bulkUploadHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bulkUploadHeaderText: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#64748b",
  },
  bulkUploadContent: {
    marginTop: 8,
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  bulkUploadDesc: {
    fontSize: 11,
    fontFamily: "Poppins",
    color: "#64748b",
    marginBottom: 12,
    lineHeight: 18,
  },
  bold: {
    fontFamily: "Poppins_600SemiBold",
  },
  bulkButtonRow: {
    flexDirection: "row",
    gap: 8,
  },
  bulkBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  bulkBtnKtp: {
    backgroundColor: "#f59e0b",
  },
  bulkBtnKk: {
    backgroundColor: "#d97706",
  },
  bulkBtnText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#ffffff",
  },
  progressBarContainer: {
    marginTop: 12,
    height: 6,
    backgroundColor: "#fde68a",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#f59e0b",
    borderRadius: 3,
  },

  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  totalText: { fontFamily: "Poppins_500Medium", fontSize: 13, color: "#64748b", marginBottom: 12 },
  listCard: { backgroundColor: "#ffffff", borderRadius: 20, marginBottom: 16, elevation: 2 },
  listHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatarBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#f3e8ff", justifyContent: "center", alignItems: "center", marginRight: 16 },
  listInfo: { flex: 1 },
  listName: { fontSize: 16, fontFamily: "Poppins_500Medium", color: "#1e293b", marginBottom: 2 },
  listNik: { fontSize: 13, fontFamily: "Poppins", color: "#64748b" },
  listAddressRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginBottom: 16 },
  listAddress: { flex: 1, fontSize: 13, fontFamily: "Poppins", color: "#475569", lineHeight: 20 },
  listActions: { flexDirection: "row", justifyContent: "flex-end", borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 16 },
  actionBtn: { borderRadius: 10 },
  
  emptyCard: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  emptyTitle: { fontFamily: "Poppins_500Medium", fontSize: 18, color: "#334155", marginTop: 16, marginBottom: 8 },
  emptyText: { fontFamily: "Poppins", fontSize: 13, color: "#94a3b8", textAlign: "center" },

  formContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  formHeaderRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 24 },
  backButton: { marginRight: 16, marginTop: 4, padding: 8, backgroundColor: "#ffffff", borderRadius: 12, elevation: 1 },
  formCard: { backgroundColor: "#ffffff", borderRadius: 24, elevation: 2 },
  sectionTitle: { fontSize: 15, fontFamily: "Poppins_500Medium", color: "#1e293b", marginBottom: 12 },
  input: { marginBottom: 16, backgroundColor: "#ffffff", fontFamily: "Poppins", fontSize: 14 },
  
  label: { fontSize: 13, fontFamily: "Poppins", color: "#64748b", marginBottom: 8, marginLeft: 4 },
  genderRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  genderBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", gap: 8 },
  genderBtnActive: { backgroundColor: "#6200EE", borderColor: "#6200EE" },
  genderText: { fontFamily: "Poppins_500Medium", fontSize: 14, color: "#64748b" },
  
  uploadCard: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 16, padding: 16, marginBottom: 16 },
  actionRow: { flexDirection: "row", justifyContent: "space-between" },
  uploadBtn: { flex: 1, borderRadius: 10, borderColor: "#6200EE" },
  previewImage: { width: "100%", height: 200, borderRadius: 12, marginTop: 16, backgroundColor: "#f1f5f9" },
  previewPlaceholder: { width: "100%", height: 120, borderRadius: 12, marginTop: 16, backgroundColor: "#f8fafc", borderWidth: 2, borderColor: "#e2e8f0", borderStyle: "dashed", justifyContent: "center", alignItems: "center" },
  placeholderText: { fontFamily: "Poppins", fontSize: 13, color: "#94a3b8", marginTop: 8 },
  
  pdfPreview: { 
    width: "100%", 
    height: 150, 
    borderRadius: 12, 
    marginTop: 16, 
    backgroundColor: "#fef2f2", 
    borderWidth: 2, 
    borderColor: "#fecaca", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  pdfText: { 
    fontFamily: "Poppins_500Medium", 
    fontSize: 14, 
    color: "#991b1b", 
    marginTop: 8 
  },
  viewPdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dc2626",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 6
  },
  viewPdfBtnText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#ffffff"
  },
  
  saveBtn: { marginTop: 24, paddingVertical: 6, borderRadius: 14, elevation: 2 },
});