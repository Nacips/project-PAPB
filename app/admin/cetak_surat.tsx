import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Button, Chip, ActivityIndicator } from "react-native-paper";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

type Permohonan = {
  id: string;
  kode_permohonan: string;
  nama_pemohon: string;
  nik: string;
  nama_jenis_surat: string;
  keperluan: string;
  status: string;
  nomor_surat?: string;
  tanggal_pengajuan: string;
  tanggal_verifikasi?: string;
};

export default function CetakSurat() {
  const [data, setData] = useState<Permohonan[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "permohonan_surat"),
      where("status", "==", "disetujui")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const hasil = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Permohonan[];
        
        hasil.sort((a, b) => 
          new Date(b.tanggal_verifikasi || b.tanggal_pengajuan).getTime() - 
          new Date(a.tanggal_verifikasi || a.tanggal_pengajuan).getTime()
        );
        
        setData(hasil);
        setLoading(false);
      },
      (error) => {
        console.error("Error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const generatePDF = async (item: Permohonan) => {
    setPrinting(item.id);
    
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              margin: 0;
            }
            .kop-surat {
              text-align: center;
              border-bottom: 3px solid #000;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .kop-surat h1 {
              margin: 0;
              font-size: 24px;
              text-transform: uppercase;
            }
            .kop-surat h2 {
              margin: 5px 0;
              font-size: 18px;
            }
            .kop-surat p {
              margin: 5px 0;
              font-size: 14px;
            }
            .nomor-surat {
              text-align: right;
              margin-bottom: 20px;
              font-size: 14px;
            }
            .judul-surat {
              text-align: center;
              margin: 30px 0;
              text-decoration: underline;
              font-size: 18px;
              font-weight: bold;
            }
            .isi-surat {
              text-align: justify;
              line-height: 1.8;
              margin-bottom: 30px;
            }
            .isi-surat p {
              margin: 10px 0;
            }
            .data-pemohon {
              margin: 20px 0;
              padding-left: 20px;
            }
            .data-pemohon table {
              width: 100%;
            }
            .data-pemohon td {
              padding: 5px;
              vertical-align: top;
            }
            .data-pemohon td:first-child {
              width: 30%;
            }
            .penutup {
              margin-top: 40px;
              text-align: justify;
            }
            .ttd {
              margin-top: 60px;
              text-align: right;
              padding-right: 50px;
            }
            .ttd p {
              margin: 5px 0;
            }
            .ttd .nama {
              font-weight: bold;
              text-decoration: underline;
              margin-top: 80px;
            }
            .footer {
              margin-top: 50px;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="kop-surat">
            <h1>PEMERINTAH DESA</h1>
            <h2>DESA CONTOH</h2>
            <p>Kecamatan Contoh, Kabupaten Contoh</p>
            <p>Alamat: Jl. Contoh No. 1, Kode Pos 12345</p>
          </div>

          <div class="nomor-surat">
            <p>Nomor: ${item.nomor_surat || "-"}</p>
          </div>

          <div class="judul-surat">
            ${item.nama_jenis_surat.toUpperCase()}
          </div>

          <div class="isi-surat">
            <p>Yang bertanda tangan di bawah ini menerangkan dengan sesungguhnya bahwa:</p>
            
            <div class="data-pemohon">
              <table>
                <tr>
                  <td>Nama</td>
                  <td>: ${item.nama_pemohon}</td>
                </tr>
                <tr>
                  <td>NIK</td>
                  <td>: ${item.nik}</td>
                </tr>
                <tr>
                  <td>Keperluan</td>
                  <td>: ${item.keperluan}</td>
                </tr>
              </table>
            </div>

            <p>Adalah benar warga desa kami dan keterangan ini diberikan untuk keperluan tersebut di atas.</p>
          </div>

          <div class="penutup">
            <p>Demikian surat keterangan ini dibuat dengan sesungguhnya untuk dipergunakan sebagaimana mestinya.</p>
          </div>

          <div class="ttd">
            <p>Desa Contoh, ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
            <p>Kepala Desa</p>
            <p class="nama">(Nama Kepala Desa)</p>
          </div>

          <div class="footer">
            <p>Dokumen ini dicetak secara digital pada ${new Date().toLocaleString("id-ID")}</p>
            <p>Kode Permohonan: ${item.kode_permohonan}</p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Surat Keterangan",
      });

      Alert.alert("Berhasil", "Surat berhasil dicetak dan dibagikan.");
    } catch (error) {
      console.error("Error printing:", error);
      Alert.alert("Error", "Gagal mencetak surat.");
    } finally {
      setPrinting(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Memuat data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Cetak Surat</Text>
      <Text style={styles.subHeader}>
        Surat yang sudah disetujui dan siap dicetak
      </Text>

      {data.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyIcon}></Text>
            <Text style={styles.emptyText}>Belum ada surat yang disetujui</Text>
            <Text style={styles.emptySubText}>
              Surat yang sudah diverifikasi akan muncul di sini
            </Text>
          </Card.Content>
        </Card>
      ) : (
        data.map((item) => (
          <Card key={item.id} style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.kodeSurat}>{item.kode_permohonan}</Text>
                  <Text style={styles.jenisSurat}>{item.nama_jenis_surat}</Text>
                </View>
                <Chip style={[styles.statusChip, { backgroundColor: "#10b981" }]} textStyle={styles.statusChipText}>
                  DISETUJUI
                </Chip>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Pemohon:</Text>
                <Text style={styles.infoValue}>{item.nama_pemohon}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>NIK:</Text>
                <Text style={styles.infoValue}>{item.nik}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>No. Surat:</Text>
                <Text style={[styles.infoValue, { color: "#10b981", fontWeight: "600" }]}>
                  {item.nomor_surat || "-"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tanggal Verifikasi:</Text>
                <Text style={styles.infoValue}>
                  {item.tanggal_verifikasi 
                    ? new Date(item.tanggal_verifikasi).toLocaleDateString("id-ID")
                    : "-"}
                </Text>
              </View>

              <Button
                mode="contained"
                onPress={() => generatePDF(item)}
                loading={printing === item.id}
                disabled={printing !== null}
                style={styles.printButton}
                buttonColor="#6200ee"
                icon="printer"
              >
                {printing === item.id ? "Mencetak..." : "Cetak PDF"}
              </Button>
            </Card.Content>
          </Card>
        ))
      )}

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  loadingText: { fontSize: 16, color: "#64748b", marginTop: 10 },
  header: { fontSize: 24, fontWeight: "bold", color: "#1e293b", marginTop: 20 },
  subHeader: { fontSize: 14, color: "#64748b", marginBottom: 20 },
  emptyCard: { backgroundColor: "#ffffff", padding: 20, elevation: 2 },
  emptyIcon: { fontSize: 48, textAlign: "center", marginBottom: 10 },
  emptyText: { fontSize: 18, fontWeight: "bold", textAlign: "center", color: "#1e293b" },
  emptySubText: { fontSize: 14, textAlign: "center", color: "#64748b", marginTop: 8 },
  card: { backgroundColor: "#ffffff", marginBottom: 16, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  kodeSurat: { fontSize: 12, color: "#6200ee", fontWeight: "600", marginBottom: 4 },
  jenisSurat: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  statusChip: { height: 28 },
  statusChipText: { color: "#ffffff", fontSize: 11, fontWeight: "bold" },
  infoRow: { flexDirection: "row", marginBottom: 8 },
  infoLabel: { fontSize: 14, color: "#64748b", width: 120 },
  infoValue: { fontSize: 14, color: "#1e293b", flex: 1 },
  printButton: { marginTop: 16 },
});