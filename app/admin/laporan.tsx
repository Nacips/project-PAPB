import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text, DataTable, ActivityIndicator } from "react-native-paper";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { db } from "../../config/firebase";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export default function LaporanAdmin() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const namaBulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  useEffect(() => {
    loadLaporan();
  }, []);

  const loadLaporan = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "permohonan_surat"),
        where("status", "==", "disetujui")
      );
      const snapshot = await getDocs(q);
      
        const hasil = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...(doc.data() as any) 
        }));

      const filteredData = hasil.filter(item => {
        const tgl = new Date(item.tanggal_verifikasi || item.tanggal_pengajuan);
        return tgl.getMonth() === currentMonth && tgl.getFullYear() === currentYear;
      });

      setData(filteredData);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal memuat data laporan.");
    } finally {
      setLoading(false);
    }
  };

  const cetakLaporan = async () => {
    setPrinting(true);
    try {
      const configDoc = await getDoc(doc(db, "pengaturan_desa", "config"));
      const config = configDoc.exists() ? configDoc.data() : { namaDesa: "Desa", kecamatan: "Kecamatan", kabupaten: "Kabupaten" };

      const rowsHtml = data.map((item, index) => `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.nomor_surat || '-'}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.nama_pemohon}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.nama_jenis_surat}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${new Date(item.tanggal_verifikasi).toLocaleDateString('id-ID')}</td>
        </tr>
      `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; }
            h2, h3 { text-align: center; margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h2>LAPORAN PENERBITAN SURAT DESA</h2>
          <h3>${config.namaDesa.toUpperCase()}</h3>
          <p style="text-align: center;">Periode: ${namaBulan[currentMonth]} ${currentYear}</p>
          
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Nomor Surat</th>
                <th>Nama Pemohon</th>
                <th>Jenis Surat</th>
                <th>Tanggal Verifikasi</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="5" style="text-align:center; padding:10px;">Tidak ada data bulan ini</td></tr>'}
            </tbody>
          </table>
          <p style="margin-top:40px; text-align:right;">Dicetak pada: ${new Date().toLocaleDateString('id-ID')}</p>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Laporan Bulanan" });
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal mencetak laporan.");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Laporan Bulanan</Text>
      <Text style={styles.subHeader}>Rekap surat disetujui periode {namaBulan[currentMonth]} {currentYear}</Text>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.actionRow}>
            <Text style={styles.totalText}>Total: {data.length} Surat</Text>
            <Button 
              mode="contained" 
              icon="printer" 
              onPress={cetakLaporan} 
              loading={printing} 
              disabled={printing || data.length === 0}
              buttonColor="#6200ee"
            >
              Cetak PDF
            </Button>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 20 }} />
          ) : (
            <ScrollView horizontal style={{ marginTop: 15 }}>
              <DataTable style={{ width: 600 }}>
                <DataTable.Header>
                  <DataTable.Title style={{ flex: 2 }}>Nomor Surat</DataTable.Title>
                  <DataTable.Title style={{ flex: 3 }}>Pemohon</DataTable.Title>
                  <DataTable.Title style={{ flex: 3 }}>Jenis</DataTable.Title>
                  <DataTable.Title style={{ flex: 2 }}>Tanggal</DataTable.Title>
                </DataTable.Header>

                {data.length === 0 && (
                  <Text style={{ textAlign: 'center', marginTop: 10, color: '#94a3b8' }}>Belum ada surat bulan ini.</Text>
                )}

                {data.map((item) => (
                  <DataTable.Row key={item.id}>
                    <DataTable.Cell style={{ flex: 2 }}>{item.nomor_surat || '-'}</DataTable.Cell>
                    <DataTable.Cell style={{ flex: 3 }}>{item.nama_pemohon}</DataTable.Cell>
                    <DataTable.Cell style={{ flex: 3 }}>{item.nama_jenis_surat}</DataTable.Cell>
                    <DataTable.Cell style={{ flex: 2 }}>
                      {new Date(item.tanggal_verifikasi).toLocaleDateString('id-ID')}
                    </DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>
            </ScrollView>
          )}
        </Card.Content>
      </Card>
      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  header: { fontSize: 24, fontWeight: "bold", color: "#1e293b", marginTop: 20 },
  subHeader: { fontSize: 14, color: "#64748b", marginBottom: 20 },
  card: { backgroundColor: "#ffffff", elevation: 2 },
  actionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  totalText: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
});