export interface User {
  uid: string;
  nama: string;
  email: string;
  role: string;
}

export interface Penduduk {
  id?: string;
  nik: string;
  nama: string;
  alamat: string;
  noHp: string;
  fotoKTP?: string;
  fotoKK?: string;
}

export interface JenisSurat {
  id?: string;
  namaSurat: string;
  deskripsi: string;
}

export interface PermohonanSurat {
  id?: string;
  uid: string;
  jenisSurat: string;
  keperluan: string;
  status: string;
  tanggal: string;
}