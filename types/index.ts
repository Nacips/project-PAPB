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

export interface DokumenLampiran {
  nama: string;
  url: string;
  tipe: 'image' | 'pdf' | 'link';
}

export interface PermohonanSurat {
  id?: string;
  kode_permohonan: string;
  user_uid: string;
  nama_pemohon: string;
  nik: string;
  jenis_surat_id: string;
  nama_jenis_surat: string;
  keperluan: string;
  dokumen_lampiran: DokumenLampiran[];
  status: 'pending' | 'proses' | 'disetujui' | 'ditolak';
  nomor_surat?: string;
  catatan_admin?: string;
  surat_pdf_url?: string;
  tanggal_pengajuan: string;
  tanggal_verifikasi?: string;
  diverifikasi_oleh?: string;
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