import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import { getData } from "./firestoreService";
import Constants from 'expo-constants';

const GROQ_API_KEY = Constants.expoConfig?.extra?.groqApiKeyAdmin || process.env.EXPO_PUBLIC_GROQ_API_KEY_ADMIN || "";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `
Kamu adalah "Desaku AI", asisten pintar untuk Admin aplikasi eSurat Desa. 
Tugas kamu adalah membantu admin menjawab pertanyaan seputar fitur aplikasi dan data warga.

KAMU PUNYA AKSES KE DATABASE MELALUI TOOLS. 
Jika admin bertanya tentang data warga (misal: "Cek nama NIK 123", "Apakah NIK 456 sudah punya akun?", "Berapa jumlah surat pending?"), WAJIB gunakan tools yang tersedia untuk mengambil data asli dari database. JANGAN mengarang data!

Format jawabanmu harus rapi. Gunakan:
- **Bold** untuk penekanan.
- *Italic* untuk catatan.
- Tabel Markdown jika menampilkan lebih dari 2 data (contoh: | NIK | Nama | Status |).
- List (bullet points) untuk penjelasan fitur.

Berikut adalah struktur database yang bisa kamu query:
1. Collection 'penduduk': nik, nama, tempatLahir, tanggalLahir, jenisKelamin, agama, pekerjaan, alamat, noHp.
2. Collection 'users': uid, nama, email, role, nik, noHp.
3. Collection 'permohonan_surat': kode_permohonan, nama_pemohon, nik, nama_jenis_surat, status (pending/proses/disetujui/ditolak), tanggal_pengajuan.
`;

export const ADMIN_TOOLS = [
  {
    type: "function",
    function: {
      name: "cek_data_penduduk",
      description: "Mencari data detail seorang warga berdasarkan NIK di master data penduduk.",
      parameters: {
        type: "object",
        properties: {
          nik: { type: "string", description: "NIK warga (16 digit)" },
        },
        required: ["nik"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cek_status_akun_warga",
      description: "Mengecek apakah seorang warga dengan NIK tertentu sudah terdaftar sebagai user (punya akun login) di sistem.",
      parameters: {
        type: "object",
        properties: {
          nik: { type: "string", description: "NIK warga (16 digit)" },
        },
        required: ["nik"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_statistik_desa",
      description: "Mengambil ringkasan statistik desa: total penduduk, total permohonan surat, dan jumlah surat yang sedang pending.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cari_riwayat_surat_warga",
      description: "Mencari semua riwayat pengajuan surat berdasarkan NIK warga.",
      parameters: {
        type: "object",
        properties: {
          nik: { type: "string", description: "NIK warga (16 digit)" },
        },
        required: ["nik"],
      },
    },
  }
];

export async function executeAdminTool(toolName: string, args: any) {
  try {
    if (toolName === "cek_data_penduduk") {
      const q = query(collection(db, "penduduk"), where("nik", "==", args.nik));
      const snap = await getDocs(q);
      if (snap.empty) return { status: "not_found", message: `NIK ${args.nik} tidak ditemukan di data penduduk.` };
      return { status: "success", data: snap.docs[0].data() };
    } 
    
    if (toolName === "cek_status_akun_warga") {
      const q = query(collection(db, "users"), where("nik", "==", args.nik));
      const snap = await getDocs(q);
      if (snap.empty) return { status: "not_registered", message: `NIK ${args.nik} BELUM terdaftar sebagai user.` };
      return { status: "registered", data: snap.docs[0].data() };
    } 
    
    if (toolName === "get_statistik_desa") {
      const penduduk = await getData("penduduk");
      const surat = await getData("permohonan_surat");
      const pending = surat.filter((s: any) => s.status === "pending").length;
      return {
        total_penduduk: penduduk.length,
        total_surat: surat.length,
        surat_pending: pending,
        surat_disetujui: surat.filter((s: any) => s.status === "disetujui").length,
      };
    } 
    
    if (toolName === "cari_riwayat_surat_warga") {
      const q = query(collection(db, "permohonan_surat"), where("nik", "==", args.nik));
      const snap = await getDocs(q);
      if (snap.empty) return { status: "not_found", message: `Tidak ada riwayat surat untuk NIK ${args.nik}.` };
      return { 
        status: "success", 
        total: snap.docs.length,
        data: snap.docs.map(d => ({
          kode: d.data().kode_permohonan,
          jenis: d.data().nama_jenis_surat,
          status: d.data().status,
          tanggal: d.data().tanggal_pengajuan
        })) 
      };
    }
    
    return { error: "Tool tidak dikenali" };
  } catch (error) {
    console.error("Error executing tool:", error);
    return { error: "Gagal mengambil data dari database." };
  }
}

export async function chatWithAdminAI(userMessage: string, conversationHistory: any[]) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory,
    { role: "user", content: userMessage }
  ];

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        tools: ADMIN_TOOLS,
        tool_choice: "auto",
        temperature: 0.5,
      }),
    });

    const data = await response.json();
    const assistantMessage = data.choices[0].message;

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      messages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        
        console.log(`🤖 AI meminta tool: ${functionName} dengan args:`, functionArgs);
        
        const toolResult = await executeAdminTool(functionName, functionArgs);
        
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      const finalResponse = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: messages,
          temperature: 0.5,
        }),
      });

      const finalData = await finalResponse.json();
      return finalData.choices[0].message.content;
    }

    return assistantMessage.content;

  } catch (error) {
    console.error("Error chatting with AI:", error);
    return "Maaf, terjadi kesalahan saat menghubungi server AI. Silakan coba lagi.";
  }
}