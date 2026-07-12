import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Button,
  Card,
  Text,
  TextInput,
  ActivityIndicator,
} from "react-native-paper";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, auth } from "../../config/firebase";
import * as FileSystem from "expo-file-system/legacy";
import { uploadToCloudinary } from "../../config/cloudinary";
import * as Print from "expo-print";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const escapeHtml = (unsafe: string | undefined | null): string => {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

type DokumenLampiran = {
  nama: string;
  url: string;
  tipe: "image" | "pdf" | "link";
};

type PermohonanSurat = {
  id: string;
  kode_permohonan: string;
  user_uid: string;
  nama_pemohon: string;
  nik: string;
  jenis_surat_id: string;
  nama_jenis_surat: string;
  keperluan: string;
  dokumen_lampiran: DokumenLampiran[];
  status: "pending" | "proses" | "disetujui" | "ditolak";
  catatan_admin?: string;
  nomor_surat?: string;
  tanggal_pengajuan: string;
  tanggal_verifikasi?: string;
  diverifikasi_oleh?: string;
  surat_pdf_url?: string;
};

export default function VerifikasiSurat() {
  const [data, setData] = useState<PermohonanSurat[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [showStempelSection, setShowStempelSection] = useState(false);

  const [selectedItem, setSelectedItem] = useState<PermohonanSurat | null>(null);
  const [catatan, setCatatan] = useState("");
  const [nomorSurat, setNomorSurat] = useState("");

  const [namaLengkapPemohon, setNamaLengkapPemohon] = useState("");
  const [nikPemohon, setNikPemohon] = useState("");

  const [logoBase64, setLogoBase64] = useState("");
  const [stempelBase64, setStempelBase64] = useState("");
  const [ttdBase64, setTtdBase64] = useState("");

  useEffect(() => {
    loadData();
    loadPengaturanDesa();
  }, [filterStatus]);

  const loadPengaturanDesa = async () => {
  try {
    console.log("🔄 Loading pengaturan desa...");
    const configDoc = await getDoc(doc(db, "pengaturan_desa", "config"));
    if (configDoc.exists()) {
      const config = configDoc.data();
      console.log(" Config loaded:", config);

      if (config.logoUrl) {
        console.log("🖼️ Converting logo...");
        const logoB64 = await convertUrlToBase64(config.logoUrl);
        setLogoBase64(logoB64);
      }

      if (config.stempelUrl) {
        console.log("🔖 Converting stempel...");
        const stempelB64 = await convertUrlToBase64(config.stempelUrl);
        setStempelBase64(stempelB64);
      }

      if (config.ttdKepalaBase64) {
        console.log("✍️ Loading TTD...");
        setTtdBase64(config.ttdKepalaBase64);
      }
      
      console.log("✅ Pengaturan desa loaded successfully");
    } else {
      console.log("⚠️ Config doc not found");
    }
  } catch (error) {
    console.error("❌ Error load pengaturan:", error);
  }
};

  const convertUrlToBase64 = async (url: string): Promise<string> => {
  try {
    if (!url) {
      console.log("️ URL kosong");
      return "";
    }

    console.log("🔄 Converting URL to base64:", url.substring(0, 50) + "...");
    
    const fileExt = url.split(".").pop()?.toLowerCase().split("?")[0] || "jpg";
    const localUri = `${FileSystem.cacheDirectory}temp_image_${Date.now()}.${fileExt}`;
    
    console.log("📥 Downloading to:", localUri);
    const downloadResult = await FileSystem.downloadAsync(url, localUri);
    
    console.log("✅ Download status:", downloadResult.status);
    
    if (downloadResult.status !== 200) {
      console.error("❌ Download gagal:", downloadResult);
      return "";
    }
    
    console.log("📝 Converting to base64...");
    const base64Data = await FileSystem.readAsStringAsync(downloadResult.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
    const base64String = `data:${mimeType};base64,${base64Data}`;
    
    console.log("✅ Base64 generated, length:", base64String.length);
    return base64String;
  } catch (error) {
    console.error("❌ Error convert to base64:", error);
    return "";
  }
};

  const fetchUserData = async (userUid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userUid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setNamaLengkapPemohon(userData?.nama || "");
        setNikPemohon(userData?.nik || "");
        return { nama: userData?.nama || "", nik: userData?.nik || "" };
      }
      return { nama: "", nik: "" };
    } catch (error) {
      console.error("Error fetch user data:", error);
      return { nama: "", nik: "" };
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let q;
      if (filterStatus === "semua") {
        q = query(collection(db, "permohonan_surat"));
      } else {
        q = query(
          collection(db, "permohonan_surat"),
          where("status", "==", filterStatus)
        );
      }

      const snapshot = await getDocs(q);
      const hasil: PermohonanSurat[] = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...(docItem.data() as any),
      }));

      hasil.sort((a, b) => {
        return (
          new Date(b.tanggal_pengajuan).getTime() -
          new Date(a.tanggal_pengajuan).getTime()
        );
      });

      setData(hasil);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Gagal memuat data permohonan.");
    } finally {
      setLoading(false);
    }
  };

  const generateNomorSurat = () => {
    const tanggal = new Date();
    const tahun = tanggal.getFullYear();
    const bulan = (tanggal.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `${tahun}.${bulan}.${random}`;
  };

  const bukaDetail = async (item: PermohonanSurat) => {
    setSelectedItem(item);
    setCatatan(item.catatan_admin || "");
    setNomorSurat(item.nomor_surat || generateNomorSurat());

    const userData = await fetchUserData(item.user_uid);
    if (!userData.nama && !userData.nik) {
      setNamaLengkapPemohon(item.nama_pemohon || "Tidak diketahui");
      setNikPemohon(item.nik || "-");
    }
  };

  const generateAndUploadPDF = async (
  item: PermohonanSurat,
  noSurat: string
) => {
  let config: any = {
    namaDesa: "Desa Tidak Diketahui",
    alamatDesa: "",
    kecamatan: "",
    kabupaten: "",
    namaKepalaDesa: "Kepala Desa",
    nipKepalaDesa: "",
  };

  const configDoc = await getDoc(doc(db, "pengaturan_desa", "config"));
  if (configDoc.exists()) {
    config = configDoc.data();
  }

  let templateHtml = "";
  const jenisSuratDoc = await getDoc(
    doc(db, "jenis_surat", item.jenis_surat_id)
  );
  if (jenisSuratDoc.exists()) {
    const jenisSuratData = jenisSuratDoc.data();
    templateHtml = jenisSuratData?.templateHtml || getDefaultTemplate(item.nama_jenis_surat);
  }

  if (!templateHtml) {
    templateHtml = getDefaultTemplate(item.nama_jenis_surat);
  }

  const namaFinal = namaLengkapPemohon || item.nama_pemohon || "Warga";
  const nikFinal = nikPemohon || item.nik || "-";

  const amanNama = escapeHtml(namaFinal);
  const amanKeperluan = escapeHtml(item.keperluan);
  const amanNik = escapeHtml(nikFinal);
  const tanggalSurat = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  console.log("📝 Generating PDF with data:", {
    logoBase64: logoBase64 ? "✅ loaded" : "❌ empty",
    stempelBase64: stempelBase64 ? "✅ loaded" : "❌ empty",
    ttdBase64: ttdBase64 ? "✅ loaded" : "❌ empty",
  });

  let html = templateHtml
    .replace(/\[LOGO_DESA_BASE64\]/g, logoBase64 || "")
    .replace(/\[STEMPEL_DESA_BASE64\]/g, stempelBase64 || "")
    .replace(/\[TTD_KEPALA_BASE64\]/g, ttdBase64 || "")
    .replace(/\[KABUPATEN\]/g, escapeHtml(config.kabupaten || "KABUPATEN"))
    .replace(/\[KECAMATAN\]/g, escapeHtml(config.kecamatan || "KECAMATAN"))
    .replace(/\[NAMA_DESA\]/g, escapeHtml(config.namaDesa || "DESA"))
    .replace(/\[ALAMAT_DESA\]/g, escapeHtml(config.alamatDesa || ""))
    .replace(/\[NOMOR_SURAT\]/g, escapeHtml(noSurat))
    .replace(/\[NAMA_PEMOHON\]/g, amanNama)
    .replace(/\[NIK\]/g, amanNik)
    .replace(/\[KEPERLUAN\]/g, amanKeperluan)
    .replace(/\[NAMA_KEPALA_DESA\]/g, escapeHtml(config.namaKepalaDesa || "Kepala Desa"))
    .replace(/\[NIP_KEPALA_DESA\]/g, escapeHtml(config.nipKepalaDesa || "-"))
    .replace(/\[TANGGAL_SURAT\]/g, tanggalSurat)
    .replace(/\[TTL\]/g, "-")
    .replace(/\[ALAMAT_PEMOHON\]/g, "-")
    .replace(/\[TANGGAL_HARI_INI\]/g, tanggalSurat);

  console.log("📄 HTML generated, length:", html.length);
  
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  console.log("📄 PDF created at:", uri);
  
  return await uploadToCloudinary(uri, "esurat/surat_pdf");
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
      font-family: 'Times New Roman', serif; 
      font-size: 12pt; 
      line-height: 1.6;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
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
    .logo { 
      width: 100%; 
      height: 100%; 
      object-fit: contain;
      background: transparent !important;
    }
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
    .nama-ttd { font-weight: bold; text-decoration: underline; }
    .nip { margin-top: 5px; }
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
      <p class="pemerintah">[KABUPATEN]</p>
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

  const handleApproveWithPDF = async () => {
    if (!selectedItem) return;
    if (!nomorSurat.trim()) {
      Alert.alert("Peringatan", "Nomor surat wajib diisi.");
      return;
    }

    try {
      setProcessing(true);
      const pdfUploadResult = await generateAndUploadPDF(selectedItem, nomorSurat);
      
      let pdfUrl = "";
      if (typeof pdfUploadResult === "object" && pdfUploadResult !== null) {
        pdfUrl = (pdfUploadResult as any).url || "";
      } else if (typeof pdfUploadResult === "string") {
        pdfUrl = pdfUploadResult;
      }

      if (!pdfUrl) {
        throw new Error("Gagal mendapatkan URL PDF");
      }

      await updateDoc(doc(db, "permohonan_surat", selectedItem.id), {
        status: "disetujui",
        catatan_admin: catatan,
        nomor_surat: nomorSurat,
        tanggal_verifikasi: new Date().toISOString(),
        diverifikasi_oleh: auth.currentUser?.uid || "",
        surat_pdf_url: pdfUrl,
      });

      Alert.alert(
        "Berhasil",
        `Surat ${selectedItem.kode_permohonan} telah disetujui dengan stempel & TTD.`
      );
      setSelectedItem(null);
      loadData();
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "Gagal memproses surat.");
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateStatusProses = async () => {
    if (!selectedItem) return;

    Alert.alert(
      "Konfirmasi",
      'Tandai permohonan ini sebagai "Sedang Diproses"? Warga akan melihat status ini.',
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Proses",
          onPress: async () => {
            try {
              setProcessing(true);
              await updateDoc(doc(db, "permohonan_surat", selectedItem.id), {
                status: "proses",
                catatan_admin: catatan || "Permohonan sedang diproses oleh admin.",
                tanggal_verifikasi: new Date().toISOString(),
                diverifikasi_oleh: auth.currentUser?.uid || "",
              });
              Alert.alert(
                "Berhasil",
                `Surat ${selectedItem.kode_permohonan} ditandai sebagai sedang diproses.`
              );
              setSelectedItem(null);
              loadData();
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Gagal mengubah status.");
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleKembalikanKePending = async () => {
    if (!selectedItem) return;

    Alert.alert(
      "Konfirmasi",
      "Kembalikan status permohonan ke Pending?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Kembalikan",
          onPress: async () => {
            try {
              setProcessing(true);
              await updateDoc(doc(db, "permohonan_surat", selectedItem.id), {
                status: "pending",
                catatan_admin: catatan || "Dikembalikan ke pending oleh admin.",
              });
              Alert.alert("Berhasil", "Status dikembalikan ke pending.");
              setSelectedItem(null);
              loadData();
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Gagal mengubah status.");
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!selectedItem) return;
    if (!catatan.trim()) {
      Alert.alert("Peringatan", "Catatan alasan penolakan wajib diisi.");
      return;
    }

    Alert.alert("Konfirmasi Tolak", "Yakin ingin menolak permohonan ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Ya, Tolak",
        style: "destructive",
        onPress: async () => {
          try {
            setProcessing(true);
            await updateDoc(doc(db, "permohonan_surat", selectedItem.id), {
              status: "ditolak",
              catatan_admin: catatan,
              tanggal_verifikasi: new Date().toISOString(),
              diverifikasi_oleh: auth.currentUser?.uid || "",
            });
            Alert.alert(
              "Berhasil",
              `Surat ${selectedItem.kode_permohonan} telah ditolak.`
            );
            setSelectedItem(null);
            loadData();
          } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal menolak surat.");
          } finally {
            setProcessing(false);
          }
        },
      },
    ]);
  };

  const handleBulkApprove = async () => {
    const pendingItems = data.filter((item) => item.status === "pending");
    if (pendingItems.length === 0) {
      Alert.alert("Info", "Tidak ada surat dengan status pending.");
      return;
    }

    Alert.alert(
      "Setujui Semua",
      `Terdapat ${pendingItems.length} surat pending. Sistem akan menghasilkan nomor urut secara otomatis dan men-generate PDF dengan stempel & TTD. Lanjutkan?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Proses Semua",
          onPress: async () => {
            setProcessing(true);
            let successCount = 0;
            for (const item of pendingItems) {
              try {
                const autoNoSurat = generateNomorSurat();
                const pdfUrl = await generateAndUploadPDF(item, autoNoSurat);
                await updateDoc(doc(db, "permohonan_surat", item.id), {
                  status: "disetujui",
                  catatan_admin: "Disetujui otomatis oleh sistem.",
                  nomor_surat: autoNoSurat,
                  tanggal_verifikasi: new Date().toISOString(),
                  diverifikasi_oleh: auth.currentUser?.uid || "",
                  surat_pdf_url: pdfUrl,
                });
                successCount++;
              } catch (err) {
                console.error(
                  `Gagal memproses item ${item.kode_permohonan}:`,
                  err
                );
              }
            }
            setProcessing(false);
            Alert.alert(
              "Selesai",
              `Berhasil menyetujui ${successCount} dari ${pendingItems.length} surat.`
            );
            loadData();
          },
        },
      ]
    );
  };

  const getStatusTheme = (status: string) => {
    switch (status) {
      case "pending":
        return { bg: "#fef3c7", text: "#d97706", icon: "clock-outline" };
      case "proses":
        return { bg: "#dbeafe", text: "#2563eb", icon: "sync" };
      case "disetujui":
        return { bg: "#dcfce7", text: "#16a34a", icon: "check-circle-outline" };
      case "ditolak":
        return { bg: "#fee2e2", text: "#dc2626", icon: "close-circle-outline" };
      default:
        return { bg: "#f1f5f9", text: "#64748b", icon: "help-circle-outline" };
    }
  };

  const formatTanggal = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderDokumenPreview = (dok: DokumenLampiran, index: number) => {
    if (dok.tipe === "image") {
      return (
        <View key={`image-${index}`} style={styles.dokumenItem}>
          <Image source={{ uri: dok.url }} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.dokumenFooter}>
            <View style={styles.dokumenInfo}>
              <MaterialCommunityIcons name="image" size={14} color="#10b981" />
              <Text style={styles.dokumenNama} numberOfLines={1}>
                {dok.nama || `Dokumen ${index + 1}`}
              </Text>
            </View>
            <TouchableOpacity onPress={() => Linking.openURL(dok.url)} style={styles.bukaLinkBtn}>
              <MaterialCommunityIcons name="open-in-new" size={14} color="#0284c7" />
              <Text style={styles.bukaLinkText}>Buka</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (dok.tipe === "pdf") {
      return (
        <View key={`pdf-${index}`} style={styles.dokumenItem}>
          <TouchableOpacity onPress={() => Linking.openURL(dok.url)} style={styles.pdfPreviewBox}>
            <MaterialCommunityIcons name="file-pdf-box" size={48} color="#ef4444" />
            <Text style={styles.pdfLabel}>Dokumen PDF</Text>
            <Text style={styles.pdfSubLabel}>Tap untuk membuka</Text>
          </TouchableOpacity>
          <View style={styles.dokumenFooter}>
            <View style={styles.dokumenInfo}>
              <MaterialCommunityIcons name="file-document" size={14} color="#ef4444" />
              <Text style={styles.dokumenNama} numberOfLines={1}>
                {dok.nama || `PDF ${index + 1}`}
              </Text>
            </View>
            <TouchableOpacity onPress={() => Linking.openURL(dok.url)} style={styles.bukaLinkBtn}>
              <MaterialCommunityIcons name="open-in-new" size={14} color="#0284c7" />
              <Text style={styles.bukaLinkText}>Buka</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (dok.tipe === "link") {
      return (
        <View key={`link-${index}`} style={styles.dokumenItem}>
          <TouchableOpacity onPress={() => Linking.openURL(dok.url)} style={styles.linkPreviewBox}>
            <MaterialCommunityIcons name="link" size={24} color="#0284c7" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.linkLabel}>{dok.nama || "Link Dokumen"}</Text>
              <Text style={styles.linkUrl} numberOfLines={1}>
                {dok.url}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Verifikasi Surat</Text>
          <Text style={styles.subHeader}>Tinjau dan proses permohonan warga</Text>
        </View>

        <TouchableOpacity
          style={styles.stempelHeader}
          onPress={() => setShowStempelSection(!showStempelSection)}
          activeOpacity={0.7}
        >
          <View style={styles.stempelHeaderLeft}>
            <MaterialCommunityIcons name="certificate" size={20} color="#6200EE" />
            <Text style={styles.stempelHeaderText}>Stempel & TTD Digital</Text>
          </View>
          <MaterialCommunityIcons
            name={showStempelSection ? "chevron-up" : "chevron-down"}
            size={20}
            color="#64748b"
          />
        </TouchableOpacity>

        {showStempelSection && (
          <Card style={styles.stempelCard}>
            <Card.Content style={styles.stempelCardContent}>
              <View style={styles.stempelRow}>
                <View style={styles.stempelItem}>
                  <Text style={styles.stempelLabel}>Stempel Desa</Text>
                  {stempelBase64 ? (
                    <Image source={{ uri: stempelBase64 }} style={styles.stempelPreview} />
                  ) : (
                    <View style={styles.stempelPlaceholder}>
                      <MaterialCommunityIcons name="certificate" size={30} color="#cbd5e1" />
                    </View>
                  )}
                </View>
                <View style={styles.stempelItem}>
                  <Text style={styles.stempelLabel}>Tanda Tangan</Text>
                  {ttdBase64 ? (
                    <Image source={{ uri: ttdBase64 }} style={styles.ttdPreview} />
                  ) : (
                    <View style={styles.stempelPlaceholder}>
                      <MaterialCommunityIcons name="signature" size={30} color="#cbd5e1" />
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.stempelNote}>✓ Otomatis ter-embed ke PDF saat persetujuan</Text>
            </Card.Content>
          </Card>
        )}

        <View style={styles.filterWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
            {["pending", "proses", "disetujui", "ditolak", "semua"].map((status) => {
              const isSelected = filterStatus === status;
              return (
                <TouchableOpacity
                  key={status}
                  activeOpacity={0.7}
                  onPress={() => setFilterStatus(status)}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                >
                  <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                    {status === "semua" ? "Semua Data" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.listHeaderRow}>
          <Text style={styles.listTitle}>
            Terdapat <Text style={{ color: "#6200EE" }}>{data.length}</Text> Permohonan
          </Text>

          {filterStatus === "pending" && data.length > 0 && (
            <TouchableOpacity style={styles.bulkBtn} onPress={handleBulkApprove} disabled={processing}>
              <MaterialCommunityIcons name="check-all" size={16} color="#ffffff" />
              <Text style={styles.bulkBtnText}>Setujui Semua</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#6200EE" />
            <Text style={styles.loadingText}>Memuat permohonan...</Text>
          </View>
        ) : data.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="file-search-outline" size={60} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Tidak Ada Data</Text>
            <Text style={styles.emptyText}>Belum ada permohonan dengan status "{filterStatus}".</Text>
          </View>
        ) : (
          data.map((item) => {
            const theme = getStatusTheme(item.status);
            return (
              <Card key={item.id} style={styles.card}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.kodeSurat}>{item.kode_permohonan}</Text>
                      <Text style={styles.namaPemohon}>{item.nama_pemohon || "Warga"}</Text>
                      <Text style={styles.nik}>NIK: {item.nik || "-"}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: theme.bg }]}>
                      <MaterialCommunityIcons name={theme.icon as any} size={14} color={theme.text} />
                      <Text style={[styles.statusBadgeText, { color: theme.text }]}>
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>Jenis Surat:</Text>
                    <Text style={styles.detailValue}>{item.nama_jenis_surat}</Text>

                    <Text style={styles.detailLabel}>Keperluan:</Text>
                    <Text style={styles.detailValue}>{item.keperluan}</Text>

                    <Text style={styles.detailLabel}>Diajukan Pada:</Text>
                    <Text style={styles.detailValue}>{formatTanggal(item.tanggal_pengajuan)}</Text>

                    {item.dokumen_lampiran && item.dokumen_lampiran.length > 0 && (
                      <>
                        <Text style={styles.detailLabel}>Dokumen:</Text>
                        <View style={styles.dokumenCountRow}>
                          <MaterialCommunityIcons name="paperclip" size={14} color="#6200EE" />
                          <Text style={styles.dokumenCountText}>
                            {item.dokumen_lampiran.length} file terlampir
                          </Text>
                        </View>
                      </>
                    )}
                  </View>

                  <Button
                    mode="contained"
                    onPress={() => bukaDetail(item)}
                    style={styles.detailButton}
                    buttonColor={item.status === "pending" || item.status === "proses" ? "#6200EE" : "#f1f5f9"}
                    textColor={item.status === "pending" || item.status === "proses" ? "#ffffff" : "#475569"}
                    icon={item.status === "pending" || item.status === "proses" ? "pencil" : "eye"}
                    labelStyle={{ fontFamily: "Poppins_500Medium" }}
                  >
                    {item.status === "pending"
                      ? "Proses Pengajuan"
                      : item.status === "proses"
                      ? "Lanjutkan Proses"
                      : "Lihat Rincian"}
                  </Button>
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!selectedItem} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalKeyboardWrapper}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedItem?.status === "pending"
                    ? "Proses Surat"
                    : selectedItem?.status === "proses"
                    ? "Lanjutkan Proses"
                    : "Rincian Surat"}
                </Text>
                <TouchableOpacity onPress={() => !processing && setSelectedItem(null)} style={styles.closeBtn}>
                  <MaterialCommunityIcons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: "85%" }}>
                <View style={styles.infoSummaryBox}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Pemohon:</Text>
                    <Text style={styles.summaryValue}>
                      {namaLengkapPemohon || selectedItem?.nama_pemohon || "Warga"}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>NIK:</Text>
                    <Text style={styles.summaryValue}>
                      {nikPemohon || selectedItem?.nik || "-"}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Surat:</Text>
                    <Text style={styles.summaryValue}>{selectedItem?.nama_jenis_surat}</Text>
                  </View>
                </View>

                <Text style={styles.label}>Tujuan Keperluan:</Text>
                <Text style={styles.valueText}>{selectedItem?.keperluan}</Text>

                {selectedItem?.dokumen_lampiran && selectedItem.dokumen_lampiran.length > 0 && (
                  <>
                    <Text style={[styles.label, { marginTop: 16 }]}>
                      Dokumen Persyaratan ({selectedItem.dokumen_lampiran.length}):
                    </Text>
                    <View style={styles.dokumenList}>
                      {selectedItem.dokumen_lampiran.map((dok, index) => renderDokumenPreview(dok, index))}
                    </View>
                  </>
                )}

                {selectedItem?.status === "pending" && (
                  <View style={styles.formArea}>
                    <Text style={[styles.label, { color: "#1e293b" }]}>Isi Nomor Surat (Untuk Disetujui)</Text>
                    <TextInput
                      mode="outlined"
                      value={nomorSurat}
                      onChangeText={setNomorSurat}
                      style={styles.input}
                      theme={{ roundness: 12 }}
                      activeOutlineColor="#10b981"
                    />

                    <Text style={[styles.label, { color: "#1e293b", marginTop: 8 }]}>
                      Catatan (Wajib Jika Ditolak)
                    </Text>
                    <TextInput
                      mode="outlined"
                      value={catatan}
                      onChangeText={setCatatan}
                      style={styles.input}
                      multiline
                      numberOfLines={3}
                      placeholder="Tulis catatan untuk pemohon..."
                      theme={{ roundness: 12 }}
                      activeOutlineColor="#6200EE"
                    />

                    <View style={styles.buttonRow}>
                      <Button
                        mode="contained"
                        onPress={handleUpdateStatusProses}
                        loading={processing}
                        disabled={processing}
                        style={[styles.actionButton, { backgroundColor: "#2563eb" }]}
                        icon="sync"
                        contentStyle={{ paddingVertical: 2 }}
                      >
                        Proses
                      </Button>
                    </View>

                    <View style={styles.buttonRow}>
                      <Button
                        mode="contained"
                        onPress={handleReject}
                        loading={processing}
                        disabled={processing}
                        style={[styles.actionButton, { backgroundColor: "#ef4444" }]}
                        icon="close-circle-outline"
                      >
                        Tolak
                      </Button>
                      <View style={{ width: 8 }} />
                      <Button
                        mode="contained"
                        onPress={handleApproveWithPDF}
                        loading={processing}
                        disabled={processing || !nomorSurat.trim()}
                        style={[styles.actionButton, { backgroundColor: "#10b981" }]}
                        icon="check-circle-outline"
                      >
                        Setujui
                      </Button>
                    </View>
                  </View>
                )}

                {selectedItem?.status === "proses" && (
                  <View style={styles.formArea}>
                    <View
                      style={[
                        styles.infoBox,
                        { backgroundColor: "#dbeafe", borderColor: "#93c5fd", marginBottom: 16, flexDirection: "row", alignItems: "center" },
                      ]}
                    >
                      <MaterialCommunityIcons name="information" size={20} color="#2563eb" />
                      <Text style={[styles.infoValue, { color: "#1e40af", marginLeft: 8, flex: 1 }]}>
                        Surat sedang diproses. Lanjutkan ke persetujuan atau kembalikan ke pending?
                      </Text>
                    </View>

                    <Text style={[styles.label, { color: "#1e293b" }]}>Nomor Surat</Text>
                    <TextInput
                      mode="outlined"
                      value={nomorSurat}
                      onChangeText={setNomorSurat}
                      style={styles.input}
                      theme={{ roundness: 12 }}
                      activeOutlineColor="#10b981"
                    />

                    <Text style={[styles.label, { color: "#1e293b", marginTop: 8 }]}>Catatan Tambahan</Text>
                    <TextInput
                      mode="outlined"
                      value={catatan}
                      onChangeText={setCatatan}
                      style={styles.input}
                      multiline
                      numberOfLines={3}
                      placeholder="Catatan untuk pemohon..."
                      theme={{ roundness: 12 }}
                      activeOutlineColor="#6200EE"
                    />

                    <View style={styles.buttonRow}>
                      <Button
                        mode="outlined"
                        onPress={handleKembalikanKePending}
                        loading={processing}
                        disabled={processing}
                        style={[styles.actionButton, { borderColor: "#f59e0b" }]}
                        textColor="#d97706"
                        icon="arrow-left"
                      >
                        Kembalikan
                      </Button>
                    </View>

                    <View style={styles.buttonRow}>
                      <Button
                        mode="contained"
                        onPress={handleReject}
                        loading={processing}
                        disabled={processing}
                        style={[styles.actionButton, { backgroundColor: "#ef4444" }]}
                        icon="close-circle-outline"
                      >
                        Tolak
                      </Button>
                      <View style={{ width: 8 }} />
                      <Button
                        mode="contained"
                        onPress={handleApproveWithPDF}
                        loading={processing}
                        disabled={processing || !nomorSurat.trim()}
                        style={[styles.actionButton, { backgroundColor: "#10b981" }]}
                        icon="check-circle-outline"
                      >
                        Setujui
                      </Button>
                    </View>
                  </View>
                )}

                {(selectedItem?.status === "disetujui" || selectedItem?.status === "ditolak") && (
                  <View style={styles.readOnlyArea}>
                    {selectedItem?.nomor_surat && (
                      <View style={[styles.infoBox, { backgroundColor: "#f0fdf4", borderColor: "#86efac" }]}>
                        <Text style={[styles.infoLabel, { color: "#15803d" }]}>Nomor Surat Resmi:</Text>
                        <Text style={[styles.infoValue, { color: "#166534" }]}>{selectedItem.nomor_surat}</Text>
                      </View>
                    )}

                    {selectedItem?.surat_pdf_url && (
                      <Button
                        mode="contained"
                        onPress={() => {
                          let finalUrl = "";
                          if (typeof selectedItem.surat_pdf_url === "object" && selectedItem.surat_pdf_url !== null) {
                            finalUrl = (selectedItem.surat_pdf_url as any).url || "";
                          } else if (typeof selectedItem.surat_pdf_url === "string") {
                            finalUrl = selectedItem.surat_pdf_url;
                          }

                          if (finalUrl) {
                            Linking.openURL(finalUrl);
                          } else {
                            Alert.alert("Error", "URL PDF tidak valid");
                          }
                        }}
                        style={{ marginTop: 12, backgroundColor: "#10b981", borderRadius: 12 }}
                        icon="file-pdf-box"
                      >
                        Lihat PDF Surat
                      </Button>
                    )}

                    {selectedItem?.catatan_admin && (
                      <View
                        style={[
                          styles.infoBox,
                          {
                            backgroundColor: selectedItem.status === "ditolak" ? "#fef2f2" : "#f0fdf4",
                            borderColor: selectedItem.status === "ditolak" ? "#fca5a5" : "#86efac",
                            marginTop: 12,
                          },
                        ]}
                      >
                        <Text style={[styles.infoLabel, { color: selectedItem.status === "ditolak" ? "#b91c1c" : "#15803d" }]}>
                          Catatan Admin:
                        </Text>
                        <Text
                          style={[styles.infoValue, { color: selectedItem.status === "ditolak" ? "#991b1b" : "#166534" }]}
                        >
                          {selectedItem.catatan_admin}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {processing && !selectedItem && (
        <View style={styles.fullScreenLoading}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.fullScreenLoadingText}>Memproses Surat dengan Stempel & TTD...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 40 },
  loadingText: { marginTop: 12, fontFamily: "Poppins", fontSize: 13, color: "#64748b" },
  headerContainer: { marginBottom: 20 },
  header: { fontSize: 28, fontFamily: "Poppins_500Medium", color: "#1e293b" },
  subHeader: { fontSize: 14, fontFamily: "Poppins", color: "#64748b", marginTop: -2 },
  stempelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e7ff",
    borderStyle: "dashed",
  },
  stempelHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  stempelHeaderText: { fontSize: 14, fontFamily: "Poppins_500Medium", color: "#1e293b" },
  stempelCard: { backgroundColor: "#ffffff", borderRadius: 12, marginBottom: 16, elevation: 1 },
  stempelCardContent: { padding: 12 },
  stempelRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 8 },
  stempelItem: { alignItems: "center", flex: 1 },
  stempelLabel: { fontSize: 11, fontFamily: "Poppins", color: "#64748b", marginBottom: 6 },
  stempelPreview: { width: 60, height: 60, borderRadius: 8, backgroundColor: "#f8fafc" },
  ttdPreview: { width: 80, height: 40, borderRadius: 8, backgroundColor: "#f8fafc" },
  stempelPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  stempelNote: { fontSize: 11, fontFamily: "Poppins", color: "#16a34a", textAlign: "center", marginTop: 4 },
  filterWrapper: { marginBottom: 24 },
  filterContainer: { paddingRight: 24, gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterChipActive: { backgroundColor: "#6200EE", borderColor: "#6200EE" },
  filterText: { fontFamily: "Poppins_500Medium", fontSize: 13, color: "#64748b" },
  filterTextActive: { color: "#ffffff" },
  listHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  listTitle: { fontSize: 15, fontFamily: "Poppins_500Medium", color: "#475569" },
  bulkBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    elevation: 2,
  },
  bulkBtnText: { color: "#ffffff", fontFamily: "Poppins_500Medium", fontSize: 12 },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  emptyTitle: { fontFamily: "Poppins_500Medium", fontSize: 16, color: "#334155", marginTop: 16, marginBottom: 4 },
  emptyText: { fontFamily: "Poppins", fontSize: 13, color: "#94a3b8", textAlign: "center" },
  card: { backgroundColor: "#ffffff", borderRadius: 20, marginBottom: 16, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  kodeSurat: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#6200EE", marginBottom: 4 },
  namaPemohon: { fontSize: 16, fontFamily: "Poppins_500Medium", color: "#1e293b", marginBottom: 2 },
  nik: { fontSize: 12, fontFamily: "Poppins", color: "#64748b" },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
  statusBadgeText: { fontSize: 10, fontFamily: "Poppins_500Medium", marginTop: 1 },
  detailBox: { backgroundColor: "#f8fafc", padding: 12, borderRadius: 12, marginBottom: 16 },
  detailLabel: { fontSize: 11, fontFamily: "Poppins", color: "#64748b" },
  detailValue: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "#334155", marginBottom: 8 },
  dokumenCountRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  dokumenCountText: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#6200EE" },
  detailButton: { borderRadius: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "center", alignItems: "center" },
  modalKeyboardWrapper: { width: "100%", alignItems: "center" },
  modalContent: { width: "90%", backgroundColor: "#ffffff", borderRadius: 24, padding: 24, maxHeight: "95%", elevation: 10 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontFamily: "Poppins_500Medium", color: "#1e293b" },
  closeBtn: { padding: 4, backgroundColor: "#f1f5f9", borderRadius: 20 },
  infoSummaryBox: { backgroundColor: "#f8fafc", padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  summaryItem: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  summaryLabel: { fontSize: 13, fontFamily: "Poppins", color: "#64748b" },
  summaryValue: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "#1e293b", flex: 1, textAlign: "right", paddingLeft: 10 },
  label: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "#475569", marginBottom: 4 },
  valueText: { fontSize: 14, fontFamily: "Poppins", color: "#334155", lineHeight: 22 },
  dokumenList: { marginTop: 8 },
  dokumenItem: { marginBottom: 12, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#ffffff" },
  previewImage: { width: "100%", height: 180, backgroundColor: "#f1f5f9" },
  dokumenFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#f8fafc",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  dokumenInfo: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  dokumenNama: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#334155", flex: 1 },
  bukaLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  bukaLinkText: { fontFamily: "Poppins_500Medium", fontSize: 11, color: "#0284c7" },
  pdfPreviewBox: { height: 120, backgroundColor: "#fef2f2", justifyContent: "center", alignItems: "center" },
  pdfLabel: { marginTop: 8, fontFamily: "Poppins_500Medium", color: "#dc2626", fontSize: 13 },
  pdfSubLabel: { fontFamily: "Poppins", color: "#991b1b", fontSize: 11, marginTop: 2 },
  linkPreviewBox: { flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: "#f0f9ff" },
  linkLabel: { fontFamily: "Poppins_500Medium", color: "#0c4a6e", fontSize: 13 },
  linkUrl: { fontFamily: "Poppins", color: "#0284c7", fontSize: 11, marginTop: 2 },
  formArea: { marginTop: 24, borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 20 },
  input: { marginBottom: 12, backgroundColor: "#ffffff", fontFamily: "Poppins", fontSize: 14 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  actionButton: { flex: 1, borderRadius: 12 },
  readOnlyArea: { marginTop: 20 },
  infoBox: { padding: 14, borderRadius: 12, borderWidth: 1 },
  infoLabel: { fontSize: 12, fontFamily: "Poppins_500Medium", marginBottom: 4 },
  infoValue: { fontSize: 14, fontFamily: "Poppins_500Medium" },
  fullScreenLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  fullScreenLoadingText: { color: "#ffffff", fontFamily: "Poppins_500Medium", marginTop: 12, fontSize: 16 },
});