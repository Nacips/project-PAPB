import { useEffect, useState, useRef } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  Image,
  LayoutAnimation,
  UIManager,
} from "react-native";
import {
  Button,
  Card,
  Text,
  TextInput,
  Switch,
  ActivityIndicator,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import SignatureScreen from "react-native-signature-canvas";
import { WebView } from "react-native-webview";
import {
  subscribeToCollection,
  tambahData,
  editData,
  hapusData,
} from "../../services/firestoreService";
import { router } from "expo-router";
import { uploadToCloudinary } from "../../config/cloudinary";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { JenisSurat } from "../../types";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AdminJenisSurat() {
  const [data, setData] = useState<JenisSurat[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "form">("list");

  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [kodeSurat, setKodeSurat] = useState("");
  const [namaSurat, setNamaSurat] = useState("");
  const [persyaratan, setPersyaratan] = useState("");
  const [templateHtml, setTemplateHtml] = useState("");
  const [aktif, setAktif] = useState(true);

  const [stempelUri, setStempelUri] = useState<string | null>(null);
  const [stempelUrl, setStempelUrl] = useState("");
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [ttdBase64, setTtdBase64] = useState("");
  const [showPengaturan, setShowPengaturan] = useState(false);
  
  const [logoBase64, setLogoBase64] = useState("");
  const [stempelBase64, setStempelBase64] = useState("");
  
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  
  const signatureRef = useRef<any>(null);

  useEffect(() => {
    const unsubscribe = subscribeToCollection("jenis_surat", (result) => {
      setData(result);
      setLoadingList(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadPengaturan = async () => {
      try {
        const docSnap = await getDoc(doc(db, "pengaturan_desa", "config"));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setStempelUrl(data.stempelUrl || "");
          setTtdBase64(data.ttdKepalaBase64 || "");
          
          if (data.logoUrl) {
            const logoB64 = await convertUrlToBase64(data.logoUrl);
            setLogoBase64(logoB64);
          }
          
          if (data.stempelUrl) {
            const stempelB64 = await convertUrlToBase64(data.stempelUrl);
            setStempelBase64(stempelB64);
          }
        }
      } catch (error) {
        console.error("Error load pengaturan:", error);
      }
    };
    loadPengaturan();
  }, []);

  const convertUrlToBase64 = async (url: string): Promise<string> => {
    try {
      const fileExt = url.split('.').pop()?.toLowerCase().split('?')[0] || 'jpg';
      const localUri = `${FileSystem.cacheDirectory}temp_logo_${Date.now()}.${fileExt}`;
      
      const downloadResult = await FileSystem.downloadAsync(url, localUri);
      
      if (downloadResult.status !== 200) {
        return "";
      }
      
      const base64Data = await FileSystem.readAsStringAsync(downloadResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
      return `data:${mimeType};base64,${base64Data}`;
    } catch (error) {
      console.error("Error convert to base64:", error);
      return "";
    }
  };

  const resetForm = () => {
    setEditId(null);
    setKodeSurat("");
    setNamaSurat("");
    setPersyaratan("");
    setTemplateHtml("");
    setAktif(true);
    setViewMode("list");
  };

  const togglePengaturan = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowPengaturan(!showPengaturan);
  };

  const pickStempel = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Izin Ditolak", "Izinkan akses galeri untuk upload stempel.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1.0,
    });

    if (!result.canceled && result.assets[0]) {
      setStempelUri(result.assets[0].uri);
    }
  };

  const handleSignatureOK = async (signature: string) => {
    setTtdBase64(signature);
    setShowSignaturePad(false);
    Alert.alert("Berhasil", "Tanda tangan digital berhasil disimpan.");
  };

  const saveStempelDanTTD = async () => {
    setLoading(true);
    try {
      let finalStempelUrl = stempelUrl;

      if (stempelUri) {
        const uploadResult = await uploadToCloudinary(stempelUri, "esurat/assets");
        finalStempelUrl = uploadResult.url;
        setStempelUrl(finalStempelUrl);
        setStempelUri(null);
        
        const stempelB64 = await convertUrlToBase64(finalStempelUrl);
        setStempelBase64(stempelB64);
      }

      await setDoc(doc(db, "pengaturan_desa", "config"), {
        stempelUrl: finalStempelUrl,
        ttdKepalaBase64: ttdBase64,
      }, { merge: true });

      Alert.alert("Sukses", "Stempel dan Tanda Tangan berhasil disimpan ke database.");
      togglePengaturan();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal menyimpan stempel/TTD.");
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = () => {
    const template = templateHtml || getDefaultTemplate(namaSurat || "Contoh Surat");
    
    const sampleData: { [key: string]: string } = {
      LOGO_DESA_BASE64: logoBase64 || "",
      STEMPEL_DESA_BASE64: stempelBase64 || "",
      TTD_KEPALA_BASE64: ttdBase64 || "",
      KABUPATEN: "Kabupaten Cirebon",
      KECAMATAN: "Kedawung",
      NAMA_DESA: "Desa Kedawung",
      ALAMAT_DESA: "Jl. Srikaya No. 12, Rt2 Rw2 Blok Desa",
      NOMOR_SURAT: "140/001/SK/2026",
      NAMA_PEMOHON: "Ahmad Syahroni",
      NIK: "3210211109040003",
      KEPERLUAN: "Contoh keperluan surat ini",
      NAMA_KEPALA_DESA: "Ahmad Syahroni",
      NIP_KEPALA_DESA: "123456789",
      TANGGAL_SURAT: "11 Juli 2026",
    };

    let html = template;
    Object.keys(sampleData).forEach((key) => {
      const regex = new RegExp(`\\[${key}\\]`, 'g');
      html = html.replace(regex, sampleData[key]);
    });

    setPreviewHtml(html);
    setShowPreview(true);
  };

  const getDefaultTemplate = (nama: string) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 2cm; background: white; }
    body { 
      font-family: 'Times New Roman', Times, serif; 
      font-size: 12pt; 
      line-height: 1.6;
      color: #000;
      background: white;
    }
    .kop-surat {
      text-align: center;
      border-bottom: 3px solid #000;
      padding-bottom: 10px;
      margin-bottom: 30px;
      position: relative;
      min-height: 100px;
    }
    .logo-container {
      position: absolute;
      left: 0;
      top: 0;
      width: 80px;
      height: 80px;
      background: transparent;
    }
    .logo { width: 100%; height: 100%; object-fit: contain; background: transparent !important; }
    .kop-text { margin-left: 90px; text-align: center; }
    .pemerintah { font-size: 14pt; font-weight: bold; margin: 0; }
    .kecamatan { font-size: 12pt; margin: 2px 0; }
    .desa { font-size: 14pt; font-weight: bold; text-decoration: underline; margin: 2px 0; }
    .alamat { font-size: 10pt; margin: 2px 0; }
    .nomor-surat { text-align: right; margin-bottom: 20px; }
    .judul {
      text-align: center;
      font-size: 14pt;
      font-weight: bold;
      text-decoration: underline;
      margin: 30px 0 20px 0;
      text-transform: uppercase;
    }
    .isi { text-align: justify; margin-bottom: 30px; }
    .data-pemohon { margin: 20px 0; padding-left: 20px; }
    .data-row { margin: 8px 0; }
    .data-label { display: inline-block; width: 150px; font-weight: bold; }
    .penutup { margin-top: 30px; text-align: justify; }
    
    /* PENGATURAN TATA LETAK TTD & STEMPEL */
    .ttd-container {
      margin-top: 50px;
      float: right;
      width: 300px;
      text-align: center;
      position: relative;
    }
    .ttd-space { 
      height: 100px;
      position: relative;
    }
    .nama-ttd { font-weight: bold; text-decoration: underline; margin: 0; }
    .nip { margin: 5px 0 0 0; }
    
    .stempel-img {
      position: absolute;
      left: 10px;
      bottom: 25px;
      width: 100px;
      height: 100px;
      opacity: 0.85;
      z-index: 1;
      background: transparent !important;
    }
    .ttd-img {
      position: absolute;
      right: 20px;
      bottom: 40px;
      width: 160px;
      height: 70px;
      z-index: 2;
      background: transparent !important;
    }
    
    .clearfix::after {
      content: "";
      clear: both;
      display: table;
    }
  </style>
</head>
<body>
  <div class="kop-surat">
    <div class="logo-container">
      <img src="[LOGO_DESA_BASE64]" alt="Logo" class="logo" onerror="this.style.display='none'" />
    </div>
    <div class="kop-text">
      <p class="pemerintah">PEMERINTAH KABUPATEN [KABUPATEN]</p>
      <p class="kecamatan">KECAMATAN [KECAMATAN]</p>
      <p class="desa">DESA [NAMA_DESA]</p>
      <p class="alamat">[ALAMAT_DESA]</p>
    </div>
  </div>

  <div class="nomor-surat">Nomor: [NOMOR_SURAT]</div>

  <div class="judul">${nama.toUpperCase()}</div>

  <div class="isi">
    <p>Yang bertanda tangan di bawah ini Kepala Desa [NAMA_DESA], Kecamatan [KECAMATAN], Kabupaten [KABUPATEN], dengan ini menerangkan bahwa:</p>
    <div class="data-pemohon">
      <div class="data-row">
        <span class="data-label">Nama Lengkap</span><span>: [NAMA_PEMOHON]</span>
      </div>
      <div class="data-row">
        <span class="data-label">NIK</span><span>: [NIK]</span>
      </div>
      <div class="data-row">
        <span class="data-label">Keperluan</span><span>: [KEPERLUAN]</span>
      </div>
    </div>
    <p>Adalah benar warga desa kami dan surat keterangan ini diberikan untuk keperluan tersebut di atas.</p>
  </div>

  <div class="penutup">
    <p>Demikian surat keterangan ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
  </div>

  <div class="clearfix">
    <div class="ttd-container">
      <p style="margin: 0 0 5px 0;">[NAMA_DESA], [TANGGAL_SURAT]</p>
      <p style="margin: 0;">Kepala Desa [NAMA_DESA]</p>
      
      <div class="ttd-space">
        <img src="[STEMPEL_DESA_BASE64]" class="stempel-img" onerror="this.style.display='none'" />
        <img src="[TTD_KEPALA_BASE64]" class="ttd-img" onerror="this.style.display='none'" />
      </div>
      
      <p class="nama-ttd">[NAMA_KEPALA_DESA]</p>
      <p class="nip">NIP. [NIP_KEPALA_DESA]</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  };

  const handleSave = async () => {
    if (kodeSurat.trim() === "" || namaSurat.trim() === "") {
      Alert.alert("Peringatan", "Kode dan Nama Surat wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const persyaratanArray = persyaratan
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");

      const payload = {
        kodeSurat: kodeSurat.toUpperCase(),
        namaSurat,
        persyaratan: persyaratanArray,
        templateHtml: templateHtml || getDefaultTemplate(namaSurat),
        aktif,
        createdAt: new Date().toISOString(),
      };

      if (editId) {
        await editData("jenis_surat", editId, payload);
        Alert.alert("Sukses", "Jenis surat berhasil diperbarui.");
      } else {
        await tambahData("jenis_surat", payload);
        Alert.alert("Sukses", "Jenis surat baru berhasil ditambahkan.");
      }

      resetForm();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditId(item.id);
    setKodeSurat(item.kodeSurat || "");
    setNamaSurat(item.namaSurat || "");
    setPersyaratan(Array.isArray(item.persyaratan) ? item.persyaratan.join(", ") : "");
    setTemplateHtml(item.templateHtml || "");
    setAktif(item.aktif !== false);
    setViewMode("form");
  };

  const handleDelete = (id: string | undefined) => {
    if (!id) return;
    Alert.alert("Hapus Surat", "Yakin ingin menghapus jenis surat ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await hapusData("jenis_surat", id);
          } catch (error) {
            Alert.alert("Error", "Gagal menghapus data.");
          }
        },
      },
    ]);
  };

  if (viewMode === "list") {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.header}>Jenis Surat</Text>
            <Text style={styles.subHeader}>Kelola jenis surat yang dapat diajukan</Text>
          </View>
          <TouchableOpacity 
            style={styles.fabBtn} 
            onPress={() => setViewMode("form")}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        

        <Card style={styles.pengaturanCard}>
          <TouchableOpacity 
            onPress={togglePengaturan}
            activeOpacity={0.7}
          >
            <View style={styles.pengaturanHeader}>
              <View style={styles.pengaturanHeaderLeft}>
                <MaterialCommunityIcons name="shield-star-outline" size={22} color="#6200EE" />
                <Text style={styles.pengaturanTitle}>Stempel & Tanda Tangan Digital</Text>
              </View>
              <MaterialCommunityIcons 
                name={showPengaturan ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="#6200EE" 
              />
            </View>
            
            <View style={styles.statusIndicator}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: (stempelUrl && ttdBase64) ? "#10b981" : "#f59e0b" }
              ]} />
              <Text style={styles.statusIndicatorText}>
                {(stempelUrl && ttdBase64) ? "Sudah dikonfigurasi" : "Belum lengkap"}
              </Text>
            </View>
          </TouchableOpacity>

          {showPengaturan && (
            <Card.Content>
              <View style={styles.stempelSection}>
                <Text style={styles.label}>Stempel Desa (PNG Transparan)</Text>
                <View style={styles.stempelRow}>
                  {stempelUri || stempelUrl ? (
                    <Image 
                      source={{ uri: stempelUri || stempelUrl }} 
                      style={styles.stempelPreview}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.stempelPlaceholder}>
                      <MaterialCommunityIcons name="image-off" size={30} color="#cbd5e1" />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Button
                      mode="outlined"
                      onPress={pickStempel}
                      icon="upload"
                      style={{ marginBottom: 8 }}
                      textColor="#6200EE"
                    >
                      {stempelUrl ? "Ganti Stempel" : "Upload Stempel"}
                    </Button>
                    <Text style={styles.hintText}>
                      Gunakan gambar PNG dengan background transparan untuk hasil terbaik.
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.ttdSection}>
                <Text style={styles.label}>Tanda Tangan Kepala Desa</Text>
                <View style={styles.ttdRow}>
                  {ttdBase64 ? (
                    <Image 
                      source={{ uri: ttdBase64 }} 
                      style={styles.ttdPreview}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.ttdPlaceholder}>
                      <MaterialCommunityIcons name="draw" size={30} color="#cbd5e1" />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Button
                      mode="contained"
                      onPress={() => setShowSignaturePad(true)}
                      icon="signature"
                      style={{ marginBottom: 8, backgroundColor: "#6200EE" }}
                    >
                      {ttdBase64 ? "Buat Ulang TTD" : "Buat Tanda Tangan"}
                    </Button>
                    <Text style={styles.hintText}>
                      Tanda tangan akan langsung di-embed ke setiap PDF yang dihasilkan.
                    </Text>
                  </View>
                </View>
              </View>

              <Button
                mode="contained"
                onPress={saveStempelDanTTD}
                loading={loading}
                disabled={loading}
                style={styles.savePengaturanBtn}
                buttonColor="#10b981"
                icon="content-save"
              >
                Simpan Stempel & TTD
              </Button>
            </Card.Content>
          )}
        </Card>

        {loadingList ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#6200EE" />
          </View>
        ) : data.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="text-box-remove-outline" size={60} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Belum Ada Surat</Text>
            <Text style={styles.emptyText}>Tambahkan jenis surat pertama Anda.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
            {data.map((item) => (
              <Card key={item.id} style={styles.listCard}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.kodeSurat}</Text>
                    </View>
                    <View style={styles.cardHeaderRight}>
                      <Text style={styles.listName}>{item.namaSurat}</Text>
                      <View style={styles.statusRow}>
                        <MaterialCommunityIcons 
                          name={item.aktif ? "check-circle" : "close-circle"} 
                          size={14} 
                          color={item.aktif ? "#10b981" : "#ef4444"} 
                        />
                        <Text style={[styles.statusText, { color: item.aktif ? "#10b981" : "#ef4444" }]}>
                          {item.aktif ? "Aktif" : "Nonaktif"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.reqBox}>
                    <Text style={styles.reqTitle}>Syarat Dokumen:</Text>
                    {Array.isArray(item.persyaratan) && item.persyaratan.length > 0 ? (
                      item.persyaratan.map((req: string, idx: number) => (
                        <View key={idx} style={styles.reqRow}>
                          <MaterialCommunityIcons name="circle-small" size={16} color="#64748b" />
                          <Text style={styles.reqItem}>{req}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={[styles.reqItem, { marginLeft: 0 }]}>- Tidak ada persyaratan khusus</Text>
                    )}
                  </View>

                  <View style={styles.actionRow}>
                    <Button
                      mode="outlined"
                      onPress={() => handleEdit(item)}
                      textColor="#0284c7"
                      style={styles.actionBtn}
                      icon="pencil-outline"
                    >
                      Edit
                    </Button>
                    <View style={{ width: 10 }} />
                    <Button
                      mode="outlined"
                      onPress={() => handleDelete(item.id)}
                      textColor="#dc2626"
                      style={[styles.actionBtn, { borderColor: "#fca5a5" }]}
                      icon="trash-can-outline"
                    >
                      Hapus
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </ScrollView>
        )}

        <Modal visible={showSignaturePad} animationType="slide">
          <View style={styles.signatureModal}>
            <View style={styles.signatureHeader}>
              <Text style={styles.signatureTitle}>Buat Tanda Tangan</Text>
              <TouchableOpacity onPress={() => setShowSignaturePad(false)}>
                <MaterialCommunityIcons name="close" size={28} color="#64748b" />
              </TouchableOpacity>
            </View>
            <SignatureScreen
              ref={signatureRef}
              onOK={handleSignatureOK}
              onEmpty={() => Alert.alert("Peringatan", "Silakan buat tanda tangan terlebih dahulu.")}
              rotated={false}
              webStyle={`
                .m-signature-pad { 
                  box-shadow: none; 
                  border: 2px dashed #6200EE;
                  border-radius: 12px;
                }
              `}
              style={styles.signatureCanvas}
            />
            <View style={styles.signatureActions}>
              <Button
                mode="outlined"
                onPress={() => signatureRef.current?.clearSignature()}
                textColor="#ef4444"
                style={styles.signatureBtn}
                icon="eraser"
              >
                Hapus
              </Button>
              <Button
                mode="contained"
                onPress={() => signatureRef.current?.readSignature()}
                buttonColor="#10b981"
                style={styles.signatureBtn}
                icon="check"
              >
                Simpan
              </Button>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
        <View style={styles.formHeaderRow}>
          <TouchableOpacity onPress={resetForm} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View>
            <Text style={styles.header}>{editId ? "Edit Surat" : "Tambah Surat"}</Text>
            <Text style={styles.subHeader}>Atur detail dan template surat</Text>
          </View>
        </View>

        <Card style={styles.formCard}>
          <Card.Content>
            <TextInput
              label="Kode Surat (Cth: SKD, SKU)"
              mode="outlined"
              style={styles.input}
              value={kodeSurat}
              onChangeText={setKodeSurat}
              autoCapitalize="characters"
              theme={{ roundness: 12 }}
              activeOutlineColor="#6200EE"
            />

            <TextInput
              label="Nama Lengkap Surat"
              mode="outlined"
              style={styles.input}
              value={namaSurat}
              onChangeText={setNamaSurat}
              theme={{ roundness: 12 }}
              activeOutlineColor="#6200EE"
            />

            <TextInput
              label="Persyaratan Dokumen (Pisahkan dgn koma)"
              mode="outlined"
              style={styles.input}
              value={persyaratan}
              onChangeText={setPersyaratan}
              multiline
              placeholder="Cth: KTP, KK, Pengantar RT"
              theme={{ roundness: 12 }}
              activeOutlineColor="#6200EE"
            />

            <View style={styles.infoBox}>
              <MaterialCommunityIcons name="information-outline" size={16} color="#0284c7" />
              <Text style={styles.infoText}>
                Template HTML default sudah otomatis menyertakan placeholder untuk Logo, Stempel, dan TTD. 
                Kosongkan field ini untuk menggunakan template standar.
              </Text>
            </View>

            <TextInput
              label="Kustomisasi Template HTML (Opsional)"
              mode="outlined"
              style={[styles.input, styles.textArea]}
              value={templateHtml}
              onChangeText={setTemplateHtml}
              multiline
              numberOfLines={8}
              theme={{ roundness: 12 }}
              activeOutlineColor="#6200EE"
            />

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Status Layanan</Text>
                <Text style={styles.switchSubLabel}>{aktif ? "Warga bisa mengajukan" : "Disembunyikan dari warga"}</Text>
              </View>
              <Switch value={aktif} onValueChange={setAktif} color="#6200EE" />
            </View>

            <View style={styles.formActions}>
              <Button
                mode="outlined"
                onPress={generatePreview}
                style={[styles.previewButton, { marginRight: 8 }]}
                textColor="#6200EE"
                icon="eye"
                labelStyle={{ fontFamily: "Poppins_500Medium" }}
              >
                Preview
              </Button>
              
              <Button
                mode="contained"
                onPress={handleSave}
                loading={loading}
                disabled={loading}
                style={styles.saveButton}
                buttonColor="#6200EE"
                labelStyle={{ fontFamily: "Poppins_500Medium" }}
              >
                {editId ? "Update Data" : "Simpan Surat Baru"}
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <Modal
        visible={showPreview}
        animationType="slide"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Preview Template</Text>
            <View style={styles.previewActions}>
              <TouchableOpacity
                onPress={() => setShowPreview(false)}
                style={styles.closePreviewBtn}
              >
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
          
          <WebView
            originWhitelist={['*']}
            source={{ html: previewHtml }}
            style={styles.webView}
            startInLoadingState={true}
            scalesPageToFit={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  headerContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20 },
  headerTextWrap: { flex: 1 },
  header: { fontSize: 28, fontFamily: "Poppins_500Medium", color: "#1e293b" },
  subHeader: { fontSize: 14, fontFamily: "Poppins", color: "#64748b", marginTop: -2 },
  fabBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#6200EE", justifyContent: "center", alignItems: "center", elevation: 3 },
  
  pengaturanCard: { 
    marginHorizontal: 24, 
    marginBottom: 20, 
    backgroundColor: "#ffffff", 
    borderRadius: 20, 
    elevation: 2,
    overflow: "hidden"
  },
  pengaturanHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    padding: 16,
  },
  pengaturanHeaderLeft: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8,
    flex: 1
  },
  pengaturanTitle: { 
    fontSize: 16, 
    fontFamily: "Poppins_500Medium", 
    color: "#1e293b",
    flex: 1
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusIndicatorText: {
    fontSize: 12,
    fontFamily: "Poppins",
    color: "#64748b",
  },
  
  stempelSection: { marginBottom: 16 },
  ttdSection: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "#475569", marginBottom: 8 },
  
  stempelRow: { flexDirection: "row", alignItems: "center" },
  ttdRow: { flexDirection: "row", alignItems: "center" },
  
  stempelPreview: { width: 100, height: 100, borderRadius: 12, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  ttdPreview: { width: 150, height: 80, borderRadius: 12, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  
  stempelPlaceholder: { 
    width: 100, height: 100, borderRadius: 12, 
    backgroundColor: "#f8fafc", borderWidth: 2, borderColor: "#e2e8f0", borderStyle: "dashed",
    justifyContent: "center", alignItems: "center"
  },
  ttdPlaceholder: { 
    width: 150, height: 80, borderRadius: 12, 
    backgroundColor: "#f8fafc", borderWidth: 2, borderColor: "#e2e8f0", borderStyle: "dashed",
    justifyContent: "center", alignItems: "center"
  },
  
  hintText: { fontSize: 11, fontFamily: "Poppins", color: "#94a3b8", marginTop: 4 },
  savePengaturanBtn: { marginTop: 8, borderRadius: 12 },
  
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  listCard: { backgroundColor: "#ffffff", borderRadius: 20, marginBottom: 16, elevation: 2 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  badge: { backgroundColor: "#f3e8ff", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginRight: 12, borderWidth: 1, borderColor: "#e9d5ff" },
  badgeText: { color: "#7e22ce", fontFamily: "Poppins_500Medium", fontSize: 13 },
  cardHeaderRight: { flex: 1 },
  listName: { fontSize: 16, fontFamily: "Poppins_500Medium", color: "#1e293b" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  statusText: { fontSize: 12, fontFamily: "Poppins_500Medium" },
  
  reqBox: { backgroundColor: "#f8fafc", padding: 12, borderRadius: 12, marginBottom: 16 },
  reqTitle: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "#475569", marginBottom: 4 },
  reqRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 2 },
  reqItem: { fontSize: 13, fontFamily: "Poppins", color: "#64748b", flex: 1 },
  
  actionRow: { flexDirection: "row", justifyContent: "flex-end", borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 16 },
  actionBtn: { borderRadius: 10, flex: 1 },
  
  emptyCard: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  emptyTitle: { fontFamily: "Poppins_500Medium", fontSize: 18, color: "#334155", marginTop: 16, marginBottom: 8 },
  emptyText: { fontFamily: "Poppins", fontSize: 13, color: "#94a3b8", textAlign: "center" },

  formContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  formHeaderRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 24 },
  backButton: { marginRight: 16, marginTop: 4, padding: 8, backgroundColor: "#ffffff", borderRadius: 12, elevation: 1 },
  formCard: { backgroundColor: "#ffffff", borderRadius: 24, elevation: 2 },
  
  input: { marginBottom: 16, backgroundColor: "#ffffff", fontFamily: "Poppins", fontSize: 14 },
  textArea: { minHeight: 150 },
  
  infoBox: { flexDirection: "row", backgroundColor: "#f0f9ff", padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "#bae6fd", gap: 8 },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Poppins", color: "#0369a1", lineHeight: 18 },
  
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#f1f5f9", marginTop: 8, marginBottom: 16 },
  switchLabel: { fontSize: 15, fontFamily: "Poppins_500Medium", color: "#1e293b" },
  switchSubLabel: { fontSize: 12, fontFamily: "Poppins", color: "#64748b" },
  
  formActions: {
    flexDirection: "row",
    marginTop: 16,
    gap: 8,
  },
  previewButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
  },
  saveButton: { flex: 2, paddingVertical: 6, borderRadius: 14, elevation: 2 },

  previewContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  previewTitle: {
    fontSize: 20,
    fontFamily: "Poppins_500Medium",
    color: "#1e293b",
  },
  previewActions: {
    flexDirection: "row",
    gap: 8,
  },
  closePreviewBtn: {
    padding: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
  },
  webView: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  signatureModal: { flex: 1, backgroundColor: "#ffffff", paddingTop: 60, paddingHorizontal: 24 },
  signatureHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  signatureTitle: { fontSize: 20, fontFamily: "Poppins_500Medium", color: "#1e293b" },
  signatureCanvas: { flex: 1, borderRadius: 12, backgroundColor: "#ffffff" },
  signatureActions: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 20, gap: 12 },
  signatureBtn: { flex: 1, borderRadius: 12 },
});