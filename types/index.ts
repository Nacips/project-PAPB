
export interface User {
  uid: string;
  nama: string;
  email: string;
  role: 'admin' | 'warga';
  nik?: string;
  noHp?: string;
  fotoProfileUrl?: string;
  createdAt: string;
}

export interface Penduduk {
  id?: string;
  nik: string;
  nama: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: 'L' | 'P';
  agama: string;
  pekerjaan: string;
  alamat: string;
  noHp: string;
  fotoKtpUrl?: string;
  fotoKkUrl?: string;
  createdAt: string;
}

export interface JenisSurat {
  id?: string;
  kodeSurat: string;
  namaSurat: string;
  persyaratan: string[];
  templateHtml: string;
  aktif: boolean;
  createdAt: string;
}

export interface PermohonanSurat {
  id?: string;
  kodePermohonan: string;
  userId: string;
  jenisSuratId: string;
  namaPemohon: string;
  nik: string;
  keperluan: string;
  dokumenUrls: string[];
  status: 'pending' | 'proses' | 'disetujui' | 'ditolak';
  nomorSurat?: string;
  catatanAdmin?: string;
  suratPdfUrl?: string;
  tanggalPengajuan: string;
  tanggalVerifikasi?: string;
  diverifikasiOleh?: string;
}

export interface PengaturanDesa {
  id: string;
  namaDesa: string;
  alamatDesa: string;
  kecamatan: string;
  kabupaten: string;
  namaKepalaDesa: string;
  nipKepalaDesa: string;
  logoUrl: string;
}