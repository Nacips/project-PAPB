import { router } from "expo-router";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../config/firebase";
import * as Print from "expo-print";
import * as MailComposer from "expo-mail-composer";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function LaporAkun() {
  const [nik, setNik] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [configDesa, setConfigDesa] = useState<any>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docSnap = await getDoc(doc(db, "pengaturan_desa", "config"));
        if (docSnap.exists()) {
          setConfigDesa(docSnap.data());
        }
      } catch (error) {
        console.log(error);
      }
    };
    fetchConfig();
  }, []);

  const handleBukaPeta = () => {
    Linking.openURL("https://maps.app.goo.gl/SYBb4RQQswBrZdtr9");
  };

  const handleBuatLaporan = async () => {
    if (!nik.trim() || !email.trim()) {
      Alert.alert("Peringatan", "NIK dan Email wajib diisi.");
      return;
    }

    if (nik.length !== 16) {
      Alert.alert("Peringatan", "NIK harus 16 digit.");
      return;
    }

    setLoading(true);
    try {
      const qPenduduk = query(collection(db, "penduduk"), where("nik", "==", nik));
      const snapPenduduk = await getDocs(qPenduduk);

      if (snapPenduduk.empty) {
        Alert.alert("Ditolak", "NIK tidak ditemukan di data penduduk. Pastikan NIK Anda benar.");
        setLoading(false);
        return;
      }

      const dataAsli = snapPenduduk.docs[0].data();
      const namaDesa = configDesa?.namaDesa || "Kedawung";
      const alamatDesa = configDesa?.alamatDesa || "Jl. Raya Desa Kedawung";
      const teleponDesa = configDesa?.telepon || "(021) 1234567";
      const emailDesa = configDesa?.email || "admin@desakedawung.id";

      const htmlPDF = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman&display=swap');
            body { 
              font-family: 'Times New Roman', Times, serif; 
              padding: 40px; 
              font-size: 12pt;
              line-height: 1.6;
              color: #000;
            }
            .kop-surat { 
              text-align: center; 
              border-bottom: 3px solid #000; 
              padding-bottom: 15px; 
              margin-bottom: 30px; 
            }
            .kop-surat h1 {
              margin: 0;
              font-size: 18pt;
              font-weight: bold;
              text-transform: uppercase;
            }
            .kop-surat h2 {
              margin: 5px 0;
              font-size: 14pt;
              font-weight: bold;
            }
            .kop-surat p {
              margin: 3px 0;
              font-size: 11pt;
            }
            .judul { 
              text-align: center; 
              margin: 30px 0 20px 0;
              text-decoration: underline; 
              font-weight: bold; 
              font-size: 14pt;
              text-transform: uppercase;
            }
            .nomor-surat {
              text-align: center;
              margin-bottom: 30px;
              font-size: 11pt;
            }
            .isi { 
              text-align: justify;
              margin-bottom: 20px;
            }
            .data-pelapor {
              margin: 20px 0;
              padding: 15px;
              background-color: #f5f5f5;
              border-left: 4px solid #2563eb;
            }
            table { 
              width: 100%; 
              margin-top: 10px;
              border-collapse: collapse;
            }
            td { 
              padding: 8px 5px;
              vertical-align: top;
            }
            td:first-child {
              width: 35%;
            }
            .lampiran {
              margin: 30px 0;
              padding: 20px;
              border: 2px solid #000;
              background-color: #fffef0;
            }
            .lampiran h3 {
              margin-top: 0;
              text-decoration: underline;
              font-size: 12pt;
            }
            .lampiran ul {
              margin: 10px 0;
              padding-left: 25px;
            }
            .lampiran li {
              margin: 8px 0;
            }
            .keterangan {
              margin: 20px 0;
              padding: 15px;
              background-color: #e0f2fe;
              border-left: 4px solid #0284c7;
              font-size: 11pt;
            }
            .ttd { 
              margin-top: 50px; 
              text-align: right; 
            }
            .ttd-box {
              display: inline-block;
              text-align: center;
              min-width: 200px;
            }
            .ttd-box .nama {
              margin-top: 80px;
              font-weight: bold;
              text-decoration: underline;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 1px solid #999;
              font-size: 10pt;
              text-align: center;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="kop-surat">
            <h1>PEMERINTAH KABUPATEN ${configDesa?.kabupaten?.toUpperCase() || "CONTOH"}</h1>
            <h2>DESA ${namaDesa.toUpperCase()}</h2>
            <p>${alamatDesa}</p>
            <p>Telp: ${teleponDesa} | Email: ${emailDesa}</p>
          </div>

          <div class="judul">SURAT PERMOHONAN RESET AKUN SISTEM INFORMASI DESA</div>
          <div class="nomor-surat">
            Nomor: ___ / ___ / ___ / ${new Date().getFullYear()}
          </div>

          <div class="isi">
            <p>Kepada Yth.,</p>
            <p><strong>Administrator Sistem Informasi Desa ${namaDesa}</strong><br>
            di<br>
            Tempat</p>
          </div>

          <div class="isi">
            <p>Dengan hormat,</p>
            <p>Saya yang bertanda tangan di bawah ini:</p>
          </div>

          <div class="data-pelapor">
            <table>
              <tr>
                <td>Nama Lengkap</td>
                <td>: <strong>${dataAsli.nama}</strong></td>
              </tr>
              <tr>
                <td>NIK</td>
                <td>: ${nik}</td>
              </tr>
              <tr>
                <td>Tempat, Tanggal Lahir</td>
                <td>: ${dataAsli.tempatLahir || '-'}, ${dataAsli.tanggalLahir ? new Date(dataAsli.tanggalLahir.seconds * 1000).toLocaleDateString('id-ID') : '-'}</td>
              </tr>
              <tr>
                <td>Alamat</td>
                <td>: ${dataAsli.alamat || '-'}</td>
              </tr>
              <tr>
                <td>No. Telepon</td>
                <td>: ${dataAsli.noTelepon || '-'}</td>
              </tr>
              <tr>
                <td>Email Pemulihan</td>
                <td>: <strong>${email}</strong></td>
              </tr>
            </table>
          </div>

          <div class="isi">
            <p>Dengan ini menyampaikan bahwa <strong>NIK saya telah didaftarkan oleh pihak yang tidak bertanggung jawab</strong> ke dalam aplikasi Sistem Informasi Desa (E-Surat). Akibatnya, saya tidak dapat melakukan pendaftaran akun untuk mengakses layanan surat menyurat online.</p>
            <p>Oleh karena itu, saya <strong>memohon dengan hormat</strong> agar Administrator Sistem Informasi Desa ${namaDesa} dapat:</p>
            <ol style="margin: 15px 0; padding-left: 30px;">
              <li>Menghapus akun yang menggunakan NIK saya secara tidak sah</li>
              <li>Melakukan reset data akun saya</li>
              <li>Memungkinkan saya untuk melakukan pendaftaran ulang</li>
            </ol>
          </div>

          <div class="lampiran">
            <h3>📋 DOKUMEN YANG HARUS DILAMPIRKAN:</h3>
            <p>Untuk memproses permohonan ini, harap melampirkan dokumen-dokumen berikut:</p>
            <ul>
              <li><strong>Fotokopi KTP</strong> (Kartu Tanda Penduduk) yang masih berlaku</li>
              <li><strong>Fotokopi KK</strong> (Kartu Keluarga)</li>
              <li><strong>Surat Keterangan Kehilangan</strong> (jika KTP hilang)</li>
              <li><strong>Pas Foto</strong> ukuran 3x4 (2 lembar)</li>
              <li><strong>Mengisi Formulir Permohonan</strong> yang tersedia di Kantor Desa</li>
            </ul>
          </div>

          <div class="keterangan">
            <strong>⚠️ CATATAN PENTING:</strong><br>
            <ol style="margin: 10px 0; padding-left: 25px;">
              <li>Surat ini harus dicetak dan ditandatangani di atas materai Rp10.000</li>
              <li>Bawa dokumen asli (KTP & KK) untuk verifikasi</li>
              <li>Datang langsung ke Kantor Desa ${namaDesa} pada jam kerja (Senin-Jumat, 08.00-15.00 WIB)</li>
              <li>Proses verifikasi memakan waktu 3-5 hari kerja</li>
              <li>Hubungi ${teleponDesa} untuk informasi lebih lanjut</li>
            </ol>
          </div>

          <div class="isi">
            <p>Demikian surat permohonan ini saya buat dengan sebenar-benarnya. Atas perhatian dan bantuan Bapak/Ibu, saya ucapkan terima kasih.</p>
          </div>

          <div class="ttd">
            <div class="ttd-box">
              <p>${namaDesa}, ${new Date().toLocaleDateString('id-ID', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}</p>
              <p>Pemohon,</p>
              <div class="nama">${dataAsli.nama}</div>
            </div>
          </div>

          <div class="footer">
            <p>Surat ini dicetak secara otomatis dari Sistem Informasi Desa ${namaDesa}</p>
            <p>Verifikasi keaslian surat: ${emailDesa}</p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlPDF, base64: false });

      const emailHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container {
              background-color: #ffffff;
              margin: 20px;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .header p {
              margin: 10px 0 0 0;
              font-size: 14px;
              opacity: 0.9;
            }
            .content {
              padding: 30px 20px;
            }
            .greeting {
              font-size: 16px;
              margin-bottom: 20px;
              color: #1f2937;
            }
            .info-box {
              background-color: #eff6ff;
              border-left: 4px solid #2563eb;
              padding: 20px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .info-box h3 {
              margin-top: 0;
              color: #1e40af;
              font-size: 16px;
            }
            .info-box ul {
              margin: 10px 0;
              padding-left: 20px;
            }
            .info-box li {
              margin: 8px 0;
              font-size: 14px;
            }
            .detail-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              background-color: #f9fafb;
              border-radius: 6px;
              overflow: hidden;
            }
            .detail-table td {
              padding: 12px 15px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 14px;
            }
            .detail-table td:first-child {
              font-weight: 600;
              color: #4b5563;
              width: 40%;
            }
            .detail-table tr:last-child td {
              border-bottom: none;
            }
            .cta-button {
              display: inline-block;
              background-color: #2563eb;
              color: white;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 6px;
              margin: 25px 0;
              font-weight: 600;
              text-align: center;
            }
            .warning-box {
              background-color: #fef3c7;
              border: 1px solid #f59e0b;
              border-radius: 6px;
              padding: 20px;
              margin: 20px 0;
            }
            .warning-box strong {
              color: #92400e;
              display: block;
              margin-bottom: 10px;
              font-size: 15px;
            }
            .footer {
              background-color: #f9fafb;
              padding: 25px 20px;
              text-align: center;
              border-top: 1px solid #e5e7eb;
              font-size: 13px;
              color: #6b7280;
            }
            .footer strong {
              color: #2563eb;
            }
            .social-links {
              margin: 15px 0;
            }
            .social-links a {
              display: inline-block;
              margin: 0 8px;
              color: #2563eb;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏛️ Sistem Informasi Desa ${namaDesa}</h1>
              <p>Konfirmasi Laporan Reset Akun</p>
            </div>
            
            <div class="content">
              <div class="greeting">
                Yth. Bapak/Ibu <strong>${dataAsli.nama}</strong>,
              </div>

              <p>Terima kasih telah melaporkan masalah akun Anda. Kami telah menerima permohonan reset akun untuk NIK: <strong>${nik}</strong></p>

              <div class="info-box">
                <h3>📋 Langkah Selanjutnya:</h3>
                <ul>
                  <li>Cetak surat PDF yang terlampir dalam email ini</li>
                  <li>Tandatangani di atas materai Rp10.000</li>
                  <li>Siapkan fotokopi KTP dan KK</li>
                  <li>Datang ke Kantor Desa ${namaDesa} dengan membawa dokumen asli</li>
                  <li>Verifikasi akan dilakukan oleh petugas</li>
                </ul>
              </div>

              <div class="detail-table">
                <table>
                  <tr>
                    <td>Nama Lengkap</td>
                    <td>${dataAsli.nama}</td>
                  </tr>
                  <tr>
                    <td>NIK</td>
                    <td>${nik}</td>
                  </tr>
                  <tr>
                    <td>Email</td>
                    <td>${email}</td>
                  </tr>
                  <tr>
                    <td>Tanggal Laporan</td>
                    <td>${new Date().toLocaleDateString('id-ID', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</td>
                  </tr>
                  <tr>
                    <td>Nomor Laporan</td>
                    <td>LAP-${Date.now().toString().slice(-8)}</td>
                  </tr>
                </table>
              </div>

              <div class="warning-box">
                <strong>⚠️ Penting untuk Diketahui:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Proses verifikasi membutuhkan waktu <strong>3-5 hari kerja</strong></li>
                  <li>Pastikan semua dokumen lengkap dan valid</li>
                  <li>Jam operasional kantor: <strong>Senin - Jumat, 08.00 - 15.00 WIB</strong></li>
                  <li>Hubungi kami di <strong>${teleponDesa}</strong> jika ada pertanyaan</li>
                </ul>
              </div>

              <div style="text-align: center;">
                <a href="https://maps.app.goo.gl/SYBb4RQQswBrZdtr9" class="cta-button">
                  📍 Lihat Lokasi Kantor Desa
                </a>
              </div>

              <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                Hormat kami,<br>
                <strong>Administrator Sistem Informasi Desa</strong><br>
                Desa ${namaDesa}
              </p>
            </div>

            <div class="footer">
              <div class="social-links">
                <a href="#">Website</a> • 
                <a href="#">Facebook</a> • 
                <a href="#">Instagram</a> • 
                <a href="mailto:${emailDesa}">Email</a>
              </div>
              <p>
                <strong>${namaDesa}</strong><br>
                ${alamatDesa}<br>
                Telp: ${teleponDesa} | Email: ${emailDesa}
              </p>
              <p style="margin-top: 15px; font-size: 12px;">
                © ${new Date().getFullYear()} Pemerintah Desa ${namaDesa}. All rights reserved.<br>
                Email ini dikirim secara otomatis, mohon tidak membalas email ini.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const isAvailable = await MailComposer.isAvailableAsync();
      if (isAvailable) {
        await MailComposer.composeAsync({
        subject: `📄 Konfirmasi Laporan Reset Akun - ${dataAsli.nama} (NIK: ${nik})`,
        body: `Yth. Administrator Desa ${namaDesa},\n\nSaya yang bertanda tangan di bawah ini:\n\nNama: ${dataAsli.nama}\nNIK: ${nik}\nEmail: ${email}\n\nDengan ini melaporkan bahwa NIK saya telah didaftarkan oleh pihak yang tidak bertanggung jawab. Bersama email ini, saya lampirkan surat permohonan resmi dalam format PDF.\n\nMohon bantuan Bapak/Ibu untuk memproses permohonan ini.\n\nTerima kasih.\n\nHormat saya,\n${dataAsli.nama}`,
        attachments: [uri],
        recipients: [emailDesa],
        });

        Alert.alert(
          "✅ Email Siap Dikirim",
          "Aplikasi Email telah dibuka dengan:\n\n✓ Surat PDF terlampir\n✓ Format email profesional\n✓ Tujuan: Admin Desa\n\nSilakan tekan 'Kirim' di aplikasi Email Anda."
        );
      } else {
        Alert.alert(
          "⚠️ Tidak Ada Aplikasi Email", 
          "Perangkat Anda tidak memiliki aplikasi Email yang dikonfigurasi. Silakan install Gmail atau aplikasi email lainnya."
        );
      }

    } catch (error) {
      console.log("Error:", error);
      Alert.alert("Error", "Gagal memproses surat laporan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground source={require('../assets/images/bg-2.jpeg')} style={styles.bgImage}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#ffffff" />
              </TouchableOpacity>

              <View style={styles.header}>
                <MaterialCommunityIcons name="file-document-check-outline" size={56} color="#60a5fa" style={{ marginBottom: 16 }} />
                <Text style={styles.title}>Laporan Akun Ganda</Text>
                <Text style={styles.subtitle}>
                  Sistem akan membuat surat resmi dengan kop desa dan mengirimkannya via email profesional ke Admin Desa
                </Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.infoCard}>
                  <MaterialCommunityIcons name="information-outline" size={20} color="#60a5fa" style={{ marginRight: 10 }} />
                  <Text style={styles.infoText}>
                    Surat akan dicetak dan ditandatangani, lalu dibawa ke kantor desa untuk verifikasi
                  </Text>
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>NIK Anda (16 digit)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Contoh: 3201234567890123"
                    placeholderTextColor="#8E8E93"
                    keyboardType="numeric"
                    maxLength={16}
                    value={nik}
                    onChangeText={setNik}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Email Aktif Anda</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="nama@email.com"
                    placeholderTextColor="#8E8E93"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.btn, loading && { opacity: 0.7 }]} 
                  onPress={handleBuatLaporan} 
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <Text style={styles.btnText}>⏳ Memproses...</Text>
                  ) : (
                    <>
                    <MaterialCommunityIcons name="email-arrow-right-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                      <Text style={styles.btnText}>Buat & Kirim Laporan</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.mapsContainer}>
                  <Text style={styles.mapsTitle}>📍 Kantor Desa {configDesa?.namaDesa || "Kedawung"}</Text>
                  <Text style={styles.mapsDesc}>
                    Datang langsung dengan membawa:
                  </Text>
                  <View style={styles.checklist}>
                    <Text style={styles.checkItem}>✓ Fotokopi KTP & KK</Text>
                    <Text style={styles.checkItem}>✓ Surat yang sudah dicetak</Text>
                    <Text style={styles.checkItem}>✓ Materai Rp10.000</Text>
                    <Text style={styles.checkItem}>✓ Dokumen asli untuk verifikasi</Text>
                  </View>
                  <TouchableOpacity style={styles.mapsBtn} onPress={handleBukaPeta}>
                    <MaterialCommunityIcons name="google-maps" size={18} color="#6200EE" />
                    <Text style={styles.mapsBtnText}>Buka Petunjuk Arah</Text>
                  </TouchableOpacity>
                </View>

              </View>

            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A12" },
  bgImage: { flex: 1, width: "100%", height: "100%" },
  overlay: { flex: 1, backgroundColor: "rgba(10, 10, 18, 0.90)" },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 40 },
  
  backBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: "rgba(255,255,255,0.1)", 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: 20 
  },
  
  header: { marginBottom: 30, alignItems: "center" },
  title: { 
    fontSize: 26, 
    fontFamily: "Poppins_600SemiBold", 
    color: "#ffffff", 
    marginBottom: 10, 
    textAlign: "center" 
  },
  subtitle: { 
    fontSize: 13, 
    fontFamily: "Poppins", 
    color: "#9CA3AF", 
    textAlign: "center", 
    lineHeight: 20,
    paddingHorizontal: 10 
  },
  
  infoCard: {
    flexDirection: "row",
    backgroundColor: "rgba(96, 165, 250, 0.1)",
    borderLeftWidth: 4,
    borderLeftColor: "#60a5fa",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins",
    color: "#93C5FD",
    lineHeight: 20,
  },
  
  formContainer: { width: "100%" },
  inputWrapper: { marginBottom: 20 },
  label: { 
    color: "#D1D1D6", 
    fontFamily: "Poppins_500Medium", 
    fontSize: 13, 
    marginBottom: 8, 
    marginLeft: 4 
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.08)", 
    borderWidth: 1, 
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16, 
    paddingHorizontal: 16, 
    paddingVertical: 16, 
    color: "#ffffff", 
    fontFamily: "Poppins",
    fontSize: 14,
  },
  
  btn: { 
    flexDirection: "row", 
    backgroundColor: "#2563eb", 
    paddingVertical: 18, 
    borderRadius: 16, 
    alignItems: "center", 
    justifyContent: "center", 
    marginTop: 10,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  btnText: { 
    color: "#ffffff", 
    fontFamily: "Poppins_600SemiBold", 
    fontSize: 16 
  },

  mapsContainer: { 
    marginTop: 30, 
    padding: 20, 
    backgroundColor: "rgba(255,255,255,0.05)", 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: "rgba(255,255,255,0.1)" 
  },
  mapsTitle: { 
    fontSize: 15, 
    fontFamily: "Poppins_600SemiBold", 
    color: "#ffffff", 
    marginBottom: 8 
  },
  mapsDesc: { 
    fontSize: 12, 
    fontFamily: "Poppins", 
    color: "#9CA3AF", 
    marginBottom: 12, 
    lineHeight: 18 
  },
  checklist: {
    marginBottom: 16,
  },
  checkItem: {
    fontSize: 12,
    fontFamily: "Poppins",
    color: "#9CA3AF",
    marginBottom: 6,
    paddingLeft: 8,
  },
  mapsBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#ffffff", 
    paddingVertical: 14, 
    borderRadius: 12, 
    gap: 10,
    marginTop: 8,
  },
  mapsBtnText: { 
    fontSize: 14, 
    fontFamily: "Poppins_600SemiBold", 
    color: "#6200EE" 
  },
});