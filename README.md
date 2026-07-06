# DAFTAR REVISI & PENINGKATAN SISTEM (E-SURAT)

## 1.UI/UX Global & Tata Letak
* **Bottom Navigation Bar (Warga & Admin):** Desain saat ini kurang menarik dan tidak efisien. Diperlukan perombakan UI (*custom tab bar*) agar terlihat lebih modern, responsif, dan hemat ruang.
* **Keyboard Overlap:** Terdapat isu *KeyboardAvoidingView* di hampir semua form (Register, Pengajuan Surat Warga, Data Penduduk Admin, Jenis Surat). Layar harus bisa di- *scroll* otomatis saat keyboard muncul agar form tidak tertutup.
* **Akses Kamera:** Modul unggah dokumen (Profil, Pengajuan Surat, KTP/KK) harus mendukung opsi jepret langsung dari kamera (*direct capture*), tidak hanya mengambil dari galeri.

## 2.Modul Autentikasi & Onboarding
* **Splash Screen & Onboarding:** Pembuatan animasi interaktif dan layar *onboarding* model *carousel* (bisa di-*swipe* 2-3 halaman pengenalan) sebelum pengguna diarahkan ke halaman Login.
* **Peningkatan UI Form:** Perombakan desain halaman Login, Register, dan Lupa Password agar terlihat lebih profesional.
* **Validasi Register Pintar (Krusial):** 
  * Sistem pendaftaran harus melakukan *cross-check* NIK dan Nama Lengkap ke database master `penduduk` milik Admin.
  * Jika cocok dan belum terdaftar: Berhasil register.
  * Jika tidak ada di database: Ditolak.
  * Jika data sudah dipakai orang lain: Arahkan pengguna dengan instruksi untuk datang ke balai desa guna mengurus "Permohonan Perubahan Akun".
* **Optimasi Lupa Password (Firebase Auth):** 
  * Mengatasi masalah email masuk ke folder SPAM.
  * Mendesain ulang *template* email bawaan Firebase dan halaman web *reset password* agar sesuai dengan *branding* E-Surat.

## 3.Modul Warga (User)
* **Dashboard Warga:** 
  * Penyempurnaan daftar menu layanan agar lebih lengkap.
  * Perbaikan Header: Teks statis "Halo Warga" diganti menjadi dinamis memanggil nama asli pengguna dari database.
  * Perbaikan tombol Logout yang *error* / tidak merespons.
* **Form Pengajuan Surat:**
  * Ubah pilihan "Jenis Surat" menjadi model *Dropdown* agar halaman tidak terlalu panjang ke bawah.
  * Dukungan format file tambahan (PDF) untuk unggah dokumen persyaratan, selain gambar.

## 4.Modul Admin (Dashboard & Master Data)
* **Dashboard Admin:** Perbaikan tombol Logout yang hilang/error dan perombakan desain secara keseluruhan.
* **Manajemen Penduduk:**
  * Pemisahan halaman: Form "Tambah/Edit Penduduk" dan "Daftar Penduduk" dipisah ke layar yang berbeda agar UI lebih bersih dan lega.
* **Manajemen Jenis Surat:**
  * Pemisahan halaman: Form penambahan surat dan tabel daftar surat dibuat terpisah.
  * Diperlukan panduan/UI yang lebih jelas mengenai cara penggunaan "Template HTML" untuk masing-masing surat.

## 5.Modul Admin (Proses Bisnis)
* **Verifikasi Surat:**
  * Perbaikan UX: Saat tombol "Lihat Detail" atau "Proses" diklik, form aksi muncul di bawah sehingga memaksa admin melakukan *scroll*. Harus diubah menjadi modal *pop-up* di tengah layar atau pindah halaman.
  * *Feature Request:* Penambahan fitur *Bulk Approve* (Setujui Semua) untuk memproses banyak surat secara otomatis sekaligus.
* **Laporan Bulanan:**
  * Perbaikan kontras warna dan UI agar tabel mudah dibaca.
  * Perbaikan *Bug* Data: Nama pemohon di laporan PDF selalu tertulis "Warga", bukan nama asli dari database.
* **Pengaturan Desa:**
  * Perbaikan UI form agar tidak kaku.
  * Integrasi data: Memastikan input dari pengaturan ini benar-benar tersambung dan merender Kop Surat di PDF.
* **Cetak Surat:**
  * Penambahan fitur *Search Bar* untuk mencari surat yang disetujui.
  * Perbaikan *Bug* Cetak: Mengatasi masalah nama menjadi "Warga", NIK menjadi "undefined", dan data Kepala Desa/Kop Surat yang tidak muncul.


    * Perbaikan *Bug* Cetak: Mengatasi masalah nama menjadi "Warga", NIK menjadi "undefined", dan data Kepala Desa/Kop Surat yang tidak muncul.