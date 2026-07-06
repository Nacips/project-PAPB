import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Text,
  TextInput,
  Switch,
  Divider,
} from "react-native-paper";
import {
  subscribeToCollection,
  tambahData,
  editData,
  hapusData,
} from "../../services/firestoreService";
import { JenisSurat } from "../../types";

export default function AdminJenisSurat() {
  const [data, setData] = useState<JenisSurat[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [kodeSurat, setKodeSurat] = useState("");
  const [namaSurat, setNamaSurat] = useState("");
  const [persyaratan, setPersyaratan] = useState("");
  const [templateHtml, setTemplateHtml] = useState("");
  const [aktif, setAktif] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToCollection("jenis_surat", (result) => {
      setData(result);
    });
    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setKodeSurat("");
    setNamaSurat("");
    setPersyaratan("");
    setTemplateHtml("");
    setAktif(true);
  };

  const getDefaultTemplate = (nama: string) => {
    return `
<html>
  <head>
    <style>
      body { font-family: Arial; padding: 40px; }
      .header { text-align: center; border-bottom: 3px solid black; padding-bottom: 20px; }
      .kop { font-size: 24px; font-weight: bold; }
      .content { margin-top: 30px; line-height: 1.8; }
      .ttd { margin-top: 50px; text-align: right; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="kop">PEMERINTAH DESA</div>
      <div>Jl. Raya Desa No. 1</div>
    </div>
    <h2 style="text-align:center;">${nama.toUpperCase()}</h2>
    <p>Nomor: [NOMOR_SURAT]</p>
    <p>Yang bertanda tangan di bawah ini menerangkan bahwa:</p>
    <p>Nama: [NAMA_PEMOHON]</p>
    <p>NIK: [NIK]</p>
    <p>Keperluan: [KEPERLUAN]</p>
    <p>Demikian surat ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
    <div class="ttd">
      <p>Kepala Desa,</p>
      <br><br><br>
      <p><strong>(Nama Kepala Desa)</strong></p>
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
        Alert.alert("Sukses", "Jenis surat berhasil diupdate.");
      } else {
        await tambahData("jenis_surat", payload);
        Alert.alert("Sukses", "Jenis surat berhasil ditambahkan.");
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
    setPersyaratan(
      Array.isArray(item.persyaratan) ? item.persyaratan.join(", ") : ""
    );
    setTemplateHtml(item.templateHtml || "");
    setAktif(item.aktif !== false);
  };

  const handleDelete = (id: string | undefined) => {
    if (!id) return;
    Alert.alert("Konfirmasi", "Hapus jenis surat ini?", [
      { text: "Batal" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await hapusData("jenis_surat", id);
            if (editId === id) resetForm();
            Alert.alert("Sukses", "Jenis surat berhasil dihapus.");
          } catch (error) {
            Alert.alert("Error", "Gagal menghapus data.");
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>Manajemen Jenis Surat</Text>
      <Text style={styles.subHeader}>
        Kelola jenis surat yang bisa diajukan warga
      </Text>

      <Card style={styles.formCard}>
        <Card.Content>
          <Text style={styles.formTitle}>
            {editId ? "Edit Jenis Surat" : "Tambah Jenis Surat Baru"}
          </Text>

          <TextInput
            label="Kode Surat (contoh: SKD, SKU, SKTM)"
            mode="outlined"
            style={styles.input}
            value={kodeSurat}
            onChangeText={setKodeSurat}
            autoCapitalize="characters"
            left={<TextInput.Icon icon="tag" />}
          />

          <TextInput
            label="Nama Surat (contoh: Surat Keterangan Domisili)"
            mode="outlined"
            style={styles.input}
            value={namaSurat}
            onChangeText={setNamaSurat}
            left={<TextInput.Icon icon="file-document" />}
          />

          <TextInput
            label="Persyaratan (pisahkan dengan koma)"
            mode="outlined"
            style={styles.input}
            value={persyaratan}
            onChangeText={setPersyaratan}
            multiline
            placeholder="Contoh: KTP, KK, Surat Pengantar RT"
            left={<TextInput.Icon icon="clipboard-check" />}
          />
          <Text style={styles.hint}>
            💡 Pisahkan setiap persyaratan dengan tanda koma (,)
          </Text>

          <TextInput
            label="Template HTML (opsional - kosongkan untuk default)"
            mode="outlined"
            style={[styles.input, styles.textArea]}
            value={templateHtml}
            onChangeText={setTemplateHtml}
            multiline
            numberOfLines={6}
            left={<TextInput.Icon icon="code-tags" />}
          />
          <Text style={styles.hint}>
            💡 Gunakan placeholder: [NOMOR_SURAT], [NAMA_PEMOHON], [NIK],
            [KEPERLUAN]
          </Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Status Aktif</Text>
            <Switch value={aktif} onValueChange={setAktif} color="#6200ee" />
          </View>

          <Button
            mode="contained"
            onPress={handleSave}
            loading={loading}
            disabled={loading}
            style={styles.saveButton}
            buttonColor="#6200ee"
          >
            {editId ? "Update Jenis Surat" : "Simpan Jenis Surat"}
          </Button>

          {editId && (
            <Button
              mode="text"
              onPress={resetForm}
              textColor="#d32f2f"
              style={{ marginTop: 8 }}
            >
              Batal Edit
            </Button>
          )}
        </Card.Content>
      </Card>

      <Divider style={{ marginVertical: 10 }} />

      <Text style={styles.listTitle}>
        Daftar Jenis Surat ({data.length} Jenis)
      </Text>

      {data.length === 0 ? (
        <Card style={styles.listCard}>
          <Card.Content>
            <Text style={{ textAlign: "center", color: "#94a3b8" }}>
              Belum ada jenis surat. Tambahkan jenis surat pertama Anda.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        data.map((item) => (
          <Card key={item.id} style={styles.listCard}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.kodeSurat}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listName}>{item.namaSurat}</Text>
                  <Text style={styles.statusText}>
                    {item.aktif ? "✅ Aktif" : "❌ Nonaktif"}
                  </Text>
                </View>
              </View>

              <Text style={styles.label}>Persyaratan:</Text>
              {Array.isArray(item.persyaratan) &&
              item.persyaratan.length > 0 ? (
                item.persyaratan.map((req: string, idx: number) => (
                  <Text key={idx} style={styles.reqItem}>
                    • {req}
                  </Text>
                ))
              ) : (
                <Text style={styles.reqItem}>Tidak ada persyaratan</Text>
              )}

              <View style={styles.actionRow}>
                <Button
                  mode="contained-tonal"
                  onPress={() => handleEdit(item)}
                  textColor="#0284c7"
                  style={styles.actionBtn}
                  icon="pencil"
                >
                  Edit
                </Button>
                <Button
                  mode="contained-tonal"
                  onPress={() => handleDelete(item.id)}
                  textColor="#d32f2f"
                  style={styles.actionBtn}
                  icon="delete"
                >
                  Hapus
                </Button>
              </View>
            </Card.Content>
          </Card>
        ))
      )}

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "center",
    marginTop: 10,
  },
  subHeader: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
  },
  formCard: {
    backgroundColor: "#ffffff",
    elevation: 2,
    marginBottom: 15,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#6200ee",
  },
  input: {
    marginBottom: 12,
    backgroundColor: "#ffffff",
  },
  textArea: {
    height: 120,
  },
  hint: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 12,
    fontStyle: "italic",
    marginLeft: 4,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
    paddingHorizontal: 8,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
  },
  saveButton: {
    marginTop: 8,
    paddingVertical: 4,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 12,
    marginTop: 10,
  },
  listCard: {
    marginBottom: 12,
    backgroundColor: "#ffffff",
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  badge: {
    backgroundColor: "#6200ee",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  badgeText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 13,
  },
  listName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
  },
  statusText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginTop: 8,
    marginBottom: 4,
  },
  reqItem: {
    fontSize: 13,
    color: "#64748b",
    marginLeft: 8,
    marginBottom: 2,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 8,
  },
  actionBtn: {
    marginRight: 0,
  },
});