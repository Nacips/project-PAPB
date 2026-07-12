import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../config/firebase";
import Constants from 'expo-constants';

const GROQ_API_KEY_WARGA = Constants.expoConfig?.extra?.groqApiKeyWarga || process.env.EXPO_PUBLIC_GROQ_API_KEY_WARGA || "";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT_WARGA = `
Kamu adalah "Desaku AI", asisten virtual yang ramah untuk warga Desa. 
Tugas kamu adalah membantu warga memahami cara menggunakan aplikasi e-Surat Desa, memberikan informasi syarat pengajuan surat, dan mengecek status pengajuan surat mereka sendiri.

ATURAN KERAS (WAJIB DIPATUHI):
1. KAMU TIDAK PUNYA AKSES ke data penduduk lain, data admin, statistik desa, atau informasi internal balai desa.
2. Jika ada yang bertanya tentang data warga lain, NIK orang lain, atau cara menggunakan fitur admin, JAWAB dengan sopan bahwa kamu tidak memiliki akses ke informasi tersebut dan hanya bisa membantu urusan pribadi mereka.
3. Gunakan format Markdown (seperti **Bold**, *Italic*, List, atau Tabel) agar jawabanmu rapi dan mudah dibaca.

KAMU PUNYA AKSES KE TOOLS BERIKUT:
- cek_status_pengajuan_saya: Untuk melihat daftar status surat yang sedang/diajukan oleh user yang sedang login.
- cek_syarat_surat: Untuk melihat syarat dokumen apa saja yang dibutuhkan untuk jenis surat tertentu.
`;

export const WARGA_TOOLS = [
  {
    type: "function",
    function: {
      name: "cek_status_pengajuan_saya",
      description: "Melihat daftar status pengajuan surat terbaru milik user yang sedang login saat ini.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "cek_syarat_surat",
      description: "Mencari informasi syarat dokumen yang diperlukan untuk mengajukan jenis surat tertentu (misal: Surat Keterangan Usaha, Domisili, dll).",
      parameters: {
        type: "object",
        properties: {
          nama_surat: { type: "string", description: "Nama atau kata kunci jenis surat (contoh: 'Usaha', 'Domisili', 'Kematian')" },
        },
        required: ["nama_surat"],
      },
    },
  }
];

export async function executeWargaTool(toolName: string, args: any) {
  const currentUser = auth.currentUser;
  if (!currentUser) return { error: "User belum login." };

  try {
    if (toolName === "cek_status_pengajuan_saya") {
      const q = query(
        collection(db, "permohonan_surat"), 
        where("user_uid", "==", currentUser.uid)
      );
      const snap = await getDocs(q);
      if (snap.empty) return { status: "kosong", message: "Anda belum memiliki pengajuan surat apapun." };
      
      return {
        status: "success",
        total: snap.docs.length,
        data: snap.docs.map(d => ({
          kode: d.data().kode_permohonan,
          jenis: d.data().nama_jenis_surat,
          status: d.data().status,
          tanggal: d.data().tanggal_pengajuan,
          catatan: d.data().catatan_admin || "-"
        }))
      };
    } 
    
    if (toolName === "cek_syarat_surat") {
      const snapshot = await getDocs(collection(db, "jenis_surat"));
      const semuaSurat = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const keyword = args.nama_surat.toLowerCase();
      const hasil = semuaSurat.filter((s: any) => s.namaSurat.toLowerCase().includes(keyword));
      
      if (hasil.length === 0) return { status: "not_found", message: `Jenis surat dengan kata kunci "${args.nama_surat}" tidak ditemukan.` };
      
      return {
        status: "success",
        data: hasil.map((s: any) => ({
          nama: s.namaSurat,
          kode: s.kodeSurat,
          persyaratan: s.persyaratan || ["Tidak ada persyaratan dokumen khusus (hanya mengisi keperluan)"]
        }))
      };
    }
    
    return { error: "Tool tidak dikenali" };
  } catch (error) {
    console.error("Error executing warga tool:", error);
    return { error: "Gagal mengambil data." };
  }
}

export async function chatWithWargaAI(userMessage: string, conversationHistory: any[]) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT_WARGA },
    ...conversationHistory,
    { role: "user", content: userMessage }
  ];

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY_WARGA}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        tools: WARGA_TOOLS,
        tool_choice: "auto",
        temperature: 0.6,
      }),
    });

    const data = await response.json();
    const assistantMessage = data.choices[0].message;

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      messages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        
        const toolResult = await executeWargaTool(functionName, functionArgs);
        
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
          "Authorization": `Bearer ${GROQ_API_KEY_WARGA}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: messages,
          temperature: 0.6,
        }),
      });

      const finalData = await finalResponse.json();
      return finalData.choices[0].message.content;
    }

    return assistantMessage.content;

  } catch (error) {
    console.error("Error chatting with Warga AI:", error);
    return "Maaf, sistem sedang mengalami gangguan. Silakan coba lagi nanti.";
  }
}