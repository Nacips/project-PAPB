import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  ActivityIndicator,
} from "react-native";
import {
  Button,
  Card,
  Text,
  TextInput,
  Chip,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import { WebView } from "react-native-webview";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import Constants from 'expo-constants';

const GROQ_API_KEY = Constants.expoConfig?.extra?.groqApiKeyAdmin || process.env.EXPO_PUBLIC_GROQ_API_KEY_ADMIN || "";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const AVAILABLE_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
];

export default function GenerateTemplateAI() {
  const [loading, setLoading] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState("");
  
  const [jenisSurat, setJenisSurat] = useState("");
  const [tujuanSurat, setTujuanSurat] = useState("");
  const [dataDiperlukan, setDataDiperlukan] = useState("");
  const [tambahanInfo, setTambahanInfo] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<"formal" | "semi-formal" | "simple">("formal");
  
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  
  const [logoBase64, setLogoBase64] = useState("");
  const [stempelBase64, setStempelBase64] = useState("");
  const [ttdBase64, setTtdBase64] = useState("");

  useEffect(() => {
    const loadPengaturan = async () => {
      try {
        const docSnap = await getDoc(doc(db, "pengaturan_desa", "config"));
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          if (data.logoUrl) {
            const logoB64 = await convertUrlToBase64(data.logoUrl);
            setLogoBase64(logoB64);
          }
          
          if (data.stempelUrl) {
            const stempelB64 = await convertUrlToBase64(data.stempelUrl);
            setStempelBase64(stempelB64);
          }
          
          if (data.ttdKepalaBase64) {
            setTtdBase64(data.ttdKepalaBase64);
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
      const localUri = `${FileSystem.cacheDirectory}temp_ai_${Date.now()}.${fileExt}`;
      
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

  const generateTemplate = async () => {
    if (!jenisSurat.trim()) {
      Alert.alert("Peringatan", "Jenis surat wajib diisi!");
      return;
    }

    setLoading(true);
    
    try {
const prompt = `Buatkan template HTML untuk surat resmi desa dengan spesifikasi berikut:

Jenis Surat: ${jenisSurat}
Tujuan/Keperluan: ${tujuanSurat || "Umum"}
Data yang Diperlukan: ${dataDiperlukan || "Nama, NIK, Keperluan"}
Gaya Template: ${selectedTemplate}
Informasi Tambahan: ${tambahanInfo || "Tidak ada"}

STRUKTUR HTML YANG HARUS DIGUNAKAN (WAJIB IKUTI FORMAT INI):

<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 2cm; }
    body { 
      font-family: 'Times New Roman', Times, serif; 
      font-size: 12pt; 
      line-height: 1.6; 
      margin: 0;
      padding: 0;
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
    }
    .logo { 
      width: 100%; 
      height: 100%; 
      object-fit: contain; 
    }
    .kop-text { 
      margin-left: 90px; 
      text-align: center; 
    }
    .pemerintah { 
      font-size: 14pt; 
      font-weight: bold; 
      margin: 0; 
    }
    .kecamatan { 
      font-size: 12pt; 
      margin: 2px 0; 
    }
    .desa { 
      font-size: 14pt; 
      font-weight: bold; 
      text-decoration: underline; 
      margin: 2px 0; 
    }
    .alamat { 
      font-size: 10pt; 
      margin: 2px 0; 
    }
    .nomor-surat { 
      text-align: right; 
      margin-bottom: 20px; 
    }
    .judul {
      text-align: center;
      font-size: 14pt;
      font-weight: bold;
      text-decoration: underline;
      margin: 30px 0 20px 0;
      text-transform: uppercase;
    }
    .isi { 
      text-align: justify; 
      margin-bottom: 30px; 
    }
    .data-pemohon { 
      margin: 20px 0; 
      padding-left: 20px; 
    }
    .data-row { 
      margin: 8px 0; 
    }
    .data-label { 
      display: inline-block; 
      width: 150px; 
      font-weight: bold; 
    }
    .penutup { 
      margin-top: 30px; 
      text-align: justify; 
    }
    .ttd-container { 
      margin-top: 50px; 
      float: right; 
      width: 300px; 
      text-align: center; 
      position: relative; 
    }
    .ttd-space { 
      height: 80px; 
      margin: 10px 0; 
      position: relative;
    }
    .nama-ttd { 
      font-weight: bold; 
      text-decoration: underline; 
      margin: 0; 
    }
    .nip { 
      margin: 5px 0 0 0; 
    }
    .stempel-img {
      position: absolute;
      left: 10px;
      bottom: 25px;
      width: 100px;
      height: 100px;
      opacity: 0.85;
      z-index: 1;
    }
    .ttd-img {
      position: absolute;
      right: 20px;
      bottom: 40px;
      width: 160px;
      height: 70px;
      z-index: 2;
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
      <img src="[LOGO_DESA_BASE64]" alt="Logo" class="logo" />
    </div>
    <div class="kop-text">
      <p class="pemerintah">PEMERINTAH KABUPATEN [KABUPATEN]</p>
      <p class="kecamatan">KECAMATAN [KECAMATAN]</p>
      <p class="desa">DESA [NAMA_DESA]</p>
      <p class="alamat">[ALAMAT_DESA]</p>
    </div>
  </div>

  <div class="nomor-surat">Nomor: [NOMOR_SURAT]</div>

  <div class="judul">[JUDUL_SURAT]</div>

  <div class="isi">
    <p>[PEMBUKA]</p>
    
    <div class="data-pemohon">
      <div class="data-row">
        <span class="data-label">[LABEL_1]</span><span>: [VALUE_1]</span>
      </div>
      <div class="data-row">
        <span class="data-label">[LABEL_2]</span><span>: [VALUE_2]</span>
      </div>
      <div class="data-row">
        <span class="data-label">[LABEL_3]</span><span>: [VALUE_3]</span>
      </div>
    </div>
    
    <p>[ISI_SURAT]</p>
  </div>

  <div class="penutup">
    <p>Demikian surat keterangan ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
  </div>

  <div class="clearfix">
    <div class="ttd-container">
      <p style="margin: 0 0 5px 0;">[NAMA_DESA], [TANGGAL_SURAT]</p>
      <p style="margin: 0;">Kepala Desa [NAMA_DESA]</p>
      
      <div class="ttd-space">
        <img src="[STEMPEL_DESA_BASE64]" class="stempel-img" />
        <img src="[TTD_KEPALA_BASE64]" class="ttd-img" />
      </div>
      
      <p class="nama-ttd">[NAMA_KEPALA_DESA]</p>
      <p class="nip">NIP. [NIP_KEPALA_DESA]</p>
    </div>
  </div>
</body>
</html>

INSTRUKSI:
1. Ganti [JUDUL_SURAT] dengan judul yang sesuai (uppercase, underline)
2. Sesuaikan [PEMBUKA] dengan jenis surat (contoh: "Yang bertanda tangan di bawah ini..." atau "Dengan ini kami beritahukan...")
3. Ganti [LABEL_1], [VALUE_1], dll dengan placeholder yang sesuai (gunakan [NAMA_PEMOHON], [NIK], [KEPERLUAN])
4. Sesuaikan [ISI_SURAT] dengan konten yang relevan
5. JANGAN UBAH STRUKTUR HTML DAN CSS
6. Gunakan placeholder yang tersedia: [LOGO_DESA_BASE64], [NAMA_DESA], [ALAMAT_DESA], [KECAMATAN], [KABUPATEN], [NOMOR_SURAT], [NAMA_PEMOHON], [NIK], [KEPERLUAN], [STEMPEL_DESA_BASE64], [TTD_KEPALA_BASE64], [NAMA_KEPALA_DESA], [NIP_KEPALA_DESA], [TANGGAL_SURAT]

Berikan hanya kode HTML lengkap tanpa penjelasan.`;

      let response = null;
      let lastError = null;
      
      for (const model of AVAILABLE_MODELS) {
        console.log(`🔄 Mencoba model: ${model}`);
        
        try {
          response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model: model,
              messages: [
                {
                  role: "system",
                  content: "Anda adalah ahli pembuat template surat resmi Indonesia. Buat template HTML yang profesional dan siap pakai. Berikan hanya kode HTML tanpa penjelasan tambahan."
                },
                {
                  role: "user",
                  content: prompt
                }
              ],
              temperature: 0.7,
              max_tokens: 4096,
            }),
          });

          if (response.ok) {
            console.log(`✅ Berhasil dengan model: ${model}`);
            break;
          } else {
            const errorData = await response.json();
            console.error(`❌ Model ${model} gagal:`, errorData);
            lastError = errorData;
          }
        } catch (err) {
          console.error(`❌ Error dengan model ${model}:`, err);
          lastError = err;
        }
      }

      if (!response || !response.ok) {
        const errorMessage = lastError?.error?.message || 
                           lastError?.message || 
                           "Gagal generate template dengan semua model";
        
        console.error("❌ Error detail:", lastError);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("✅ Response dari API:", data);
      
      const template = data.choices[0]?.message?.content || "";

      if (!template) {
        throw new Error("Template kosong dari API");
      }

      const cleanTemplate = template
        .replace(/```html/g, "")
        .replace(/```/g, "")
        .trim();

      setGeneratedTemplate(cleanTemplate);
      Alert.alert("Berhasil!", "Template berhasil digenerate oleh AI");
      
    } catch (error: any) {
      console.error("❌ Error generating template:", error);
      
      let errorMessage = error.message || "Terjadi kesalahan";
      
      if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
        errorMessage = "API Key tidak valid. Silakan periksa konfigurasi API Key.";
      } else if (errorMessage.includes("400")) {
        errorMessage = "Request tidak valid. Silakan coba lagi atau hubungi support.";
      } else if (errorMessage.includes("429")) {
        errorMessage = "Rate limit tercapai. Silakan tunggu beberapa saat dan coba lagi.";
      } else if (errorMessage.includes("500") || errorMessage.includes("503")) {
        errorMessage = "Server GROQ sedang bermasalah. Silakan coba beberapa saat lagi.";
      }
      
      Alert.alert("Error Generate", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedTemplate) {
      Alert.alert("Peringatan", "Tidak ada template untuk disalin!");
      return;
    }
    
    try {
      await Clipboard.setStringAsync(generatedTemplate);
      Alert.alert("✅ Berhasil Disalin!", "Template telah disalin ke clipboard. Silakan paste di halaman Jenis Surat.");
    } catch (error) {
      console.error("Error copy to clipboard:", error);
      Alert.alert("Error", "Gagal menyalin template ke clipboard.");
    }
  };

  const generatePreview = () => {
    if (!generatedTemplate) {
      Alert.alert("Peringatan", "Generate template terlebih dahulu!");
      return;
    }

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

    let html = generatedTemplate;
    Object.keys(sampleData).forEach((key) => {
      const regex = new RegExp(`\\[${key}\\]`, 'g');
      html = html.replace(regex, sampleData[key]);
    });

    setPreviewHtml(html);
    setShowPreview(true);
  };

  const saveToJenisSurat = () => {
    router.back();
    Alert.alert("Info", "Silakan copy template dan paste di halaman Jenis Surat");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View>
            <Text style={styles.header}>Generate Template AI</Text>
            <Text style={styles.subHeader}>Buat template surat otomatis dengan AI</Text>
          </View>
        </View>

        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="robot-happy" size={24} color="#6200EE" />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>AI Template Generator</Text>
                <Text style={styles.infoDescription}>
                  Isi detail surat yang diinginkan, AI akan membuatkan template HTML profesional secara otomatis.
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.formCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Detail Surat</Text>

            <TextInput
              label="Jenis Surat *"
              mode="outlined"
              value={jenisSurat}
              onChangeText={setJenisSurat}
              placeholder="Contoh: Surat Keterangan Usaha"
              style={styles.input}
              theme={{ roundness: 12 }}
              activeOutlineColor="#6200EE"
            />

            <TextInput
              label="Tujuan/Keperluan Surat"
              mode="outlined"
              value={tujuanSurat}
              onChangeText={setTujuanSurat}
              placeholder="Contoh: Untuk pengajuan kredit bank"
              style={styles.input}
              multiline
              numberOfLines={2}
              theme={{ roundness: 12 }}
              activeOutlineColor="#6200EE"
            />

            <TextInput
              label="Data yang Diperlukan"
              mode="outlined"
              value={dataDiperlukan}
              onChangeText={setDataDiperlukan}
              placeholder="Contoh: Nama, NIK, Alamat, Usaha"
              style={styles.input}
              theme={{ roundness: 12 }}
              activeOutlineColor="#6200EE"
            />

            <Text style={styles.label}>Gaya Template:</Text>
            <View style={styles.chipContainer}>
              <Chip
                selected={selectedTemplate === "formal"}
                onPress={() => setSelectedTemplate("formal")}
                style={[styles.chip, selectedTemplate === "formal" && styles.chipSelected]}
                textStyle={selectedTemplate === "formal" ? styles.chipTextSelected : styles.chipText}
              >
                Formal
              </Chip>
              <Chip
                selected={selectedTemplate === "semi-formal"}
                onPress={() => setSelectedTemplate("semi-formal")}
                style={[styles.chip, selectedTemplate === "semi-formal" && styles.chipSelected]}
                textStyle={selectedTemplate === "semi-formal" ? styles.chipTextSelected : styles.chipText}
              >
                Semi-Formal
              </Chip>
              <Chip
                selected={selectedTemplate === "simple"}
                onPress={() => setSelectedTemplate("simple")}
                style={[styles.chip, selectedTemplate === "simple" && styles.chipSelected]}
                textStyle={selectedTemplate === "simple" ? styles.chipTextSelected : styles.chipText}
              >
                Simple
              </Chip>
            </View>

            <TextInput
              label="Informasi Tambahan (Opsional)"
              mode="outlined"
              value={tambahanInfo}
              onChangeText={setTambahanInfo}
              placeholder="Contoh: Sertakan bagian untuk lampiran"
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={3}
              theme={{ roundness: 12 }}
              activeOutlineColor="#6200EE"
            />

            <Button
              mode="contained"
              onPress={generateTemplate}
              loading={loading}
              disabled={loading}
              style={styles.generateButton}
              buttonColor="#6200EE"
              icon="robot"
              labelStyle={{ fontFamily: "Poppins_500Medium", fontSize: 16 }}
            >
              {loading ? "Sedang Generate..." : "Generate Template dengan AI"}
            </Button>
          </Card.Content>
        </Card>

        {generatedTemplate ? (
          <Card style={styles.resultCard}>
            <Card.Content>
              <View style={styles.resultHeader}>
                <Text style={styles.resultTitle}>Template Hasil Generate</Text>
                <View style={styles.resultActions}>
                  <TouchableOpacity onPress={copyToClipboard} style={styles.actionBtn}>
                    <MaterialCommunityIcons name="content-copy" size={20} color="#6200EE" />
                    <Text style={styles.actionBtnText}>Copy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={generatePreview} style={[styles.actionBtn, styles.previewBtn]}>
                    <MaterialCommunityIcons name="eye" size={20} color="#ffffff" />
                    <Text style={[styles.actionBtnText, styles.previewBtnText]}>Preview</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.codeContainer}>
                  <Text style={styles.codeText} selectable={true}>{generatedTemplate}</Text>
                </View>
              </ScrollView>
            </Card.Content>
          </Card>
        ) : null}

        <Card style={styles.exampleCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Contoh Penggunaan:</Text>
            <View style={styles.exampleItem}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#10b981" />
              <Text style={styles.exampleText}>Jenis: Surat Keterangan Usaha</Text>
            </View>
            <View style={styles.exampleItem}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#10b981" />
              <Text style={styles.exampleText}>Jenis: Surat Pengantar KTP</Text>
            </View>
            <View style={styles.exampleItem}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#10b981" />
              <Text style={styles.exampleText}>Jenis: Surat Keterangan Tidak Mampu</Text>
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
  scrollContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  
  headerContainer: { flexDirection: "row", alignItems: "flex-start", marginBottom: 24 },
  backButton: { marginRight: 16, marginTop: 4, padding: 8, backgroundColor: "#ffffff", borderRadius: 12, elevation: 1 },
  header: { fontSize: 26, fontFamily: "Poppins_500Medium", color: "#1e293b" },
  subHeader: { fontSize: 13, fontFamily: "Poppins", color: "#64748b", marginTop: -2 },
  
  infoCard: { backgroundColor: "#f3e8ff", marginBottom: 20, borderWidth: 1, borderColor: "#e9d5ff" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoText: { flex: 1 },
  infoTitle: { fontSize: 15, fontFamily: "Poppins_500Medium", color: "#6200EE", marginBottom: 4 },
  infoDescription: { fontSize: 12, fontFamily: "Poppins", color: "#7c3aed", lineHeight: 18 },
  
  formCard: { backgroundColor: "#ffffff", borderRadius: 20, marginBottom: 20, elevation: 2 },
  sectionTitle: { fontSize: 16, fontFamily: "Poppins_500Medium", color: "#1e293b", marginBottom: 16 },
  label: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "#475569", marginBottom: 8, marginTop: 8 },
  input: { marginBottom: 16, backgroundColor: "#ffffff", fontFamily: "Poppins", fontSize: 14 },
  textArea: { minHeight: 100 },
  
  chipContainer: { flexDirection: "row", gap: 8, marginBottom: 16 },
  chip: { flex: 1, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  chipSelected: { backgroundColor: "#6200EE", borderColor: "#6200EE" },
  chipText: { fontFamily: "Poppins", color: "#64748b" },
  chipTextSelected: { fontFamily: "Poppins_500Medium", color: "#ffffff" },
  
  generateButton: { marginTop: 8, paddingVertical: 8, borderRadius: 14, elevation: 2 },
  
  resultCard: { backgroundColor: "#ffffff", borderRadius: 20, marginBottom: 20, elevation: 2, borderWidth: 2, borderColor: "#10b981" },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  resultTitle: { fontSize: 15, fontFamily: "Poppins_500Medium", color: "#1e293b" },
  resultActions: { flexDirection: "row", gap: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#f3e8ff", borderRadius: 8 },
  actionBtnText: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#6200EE" },
  previewBtn: { backgroundColor: "#10b981" },
  previewBtnText: { color: "#ffffff" },
  codeContainer: { backgroundColor: "#f8fafc", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  codeText: { fontFamily: "monospace", fontSize: 11, color: "#334155" },
  
  exampleCard: { backgroundColor: "#ffffff", borderRadius: 20, elevation: 2 },
  exampleItem: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  exampleText: { fontSize: 13, fontFamily: "Poppins", color: "#475569" },
  
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
});