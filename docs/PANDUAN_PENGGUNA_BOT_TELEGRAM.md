# Telegram User Bot - Complete User Guide

## Panduan Lengkap Penggunaan Bot User Cicero Telegram

### Daftar Isi
1. [Pengenalan](#pengenalan)
2. [Cara Memulai](#cara-memulai)
3. [Proses Penautan Akun](#proses-penautan-akun)
4. [Mengakses Menu](#mengakses-menu)
5. [Update Data](#update-data)
6. [FAQ](#faq)

---

## Pengenalan

Bot User Cicero membantu Anda mengelola data pribadi Anda melalui Telegram. Untuk menggunakan bot ini, Anda harus terlebih dahulu menautkan akun Telegram Anda dengan NRP/NIP yang terdaftar di sistem.

### Fitur Utama
- 🔐 Penautan akun yang aman dengan kode persetujuan
- 👤 Lihat data pribadi Anda
- ✏️ Update data pribadi (Nama, Pangkat, Satfung, dll)
- 📱 Akses mudah dari Telegram

---

## Cara Memulai

### 1. Temukan Bot
Cari bot Cicero di Telegram atau gunakan link yang diberikan oleh administrator.

### 2. Mulai Percakapan
Ketik perintah `/start`

**Contoh Respons:**
```
🤖 Selamat datang di Bot User Cicero!

Bot ini dapat membantu Anda mengakses dan mengelola data pribadi Anda.

Untuk memulai, tautkan akun Telegram Anda:
/link NRP_ANDA

Contoh: /link 081235114745

Perintah lainnya:
/help - Tampilkan bantuan lengkap

Pastikan Anda menggunakan NRP/NIP yang terdaftar di sistem.
```

### 3. Dapatkan Bantuan (Opsional)
Ketik `/help` untuk melihat panduan lengkap

---

## Proses Penautan Akun

### Langkah 1: Mulai Penautan

**Perintah:**
```
/link NRP_ANDA
```

**Contoh:**
```
/link 081235114745
```

**Respons Bot:**
```
✅ Permintaan Penautan Berhasil Dibuat

Akun Telegram Anda akan ditautkan dengan:
Nama: BRIPKA JOHN DOE
NRP/NIP: 081235114745
Satfung: SUBBID PENMAS

Kode Persetujuan: 123456

Untuk menyelesaikan penautan, ketik:
/approve KODE_ANDA

Contoh: /approve 123456

Kode akan kedaluwarsa dalam 24 jam.
```

### Langkah 2: Setujui Penautan

**Perintah:**
```
/approve KODE_ANDA
```

**Contoh:**
```
/approve 123456
```

**Respons Bot:**
```
✅ Penautan Berhasil!

Akun Telegram Anda telah berhasil ditautkan dengan:
Nama: BRIPKA JOHN DOE
NRP/NIP: 081235114745

Sekarang Anda dapat mengakses menu user dengan perintah:
/menu
```

### ⚠️ Penting!
- Kode persetujuan berlaku selama 24 jam
- Jika kode kedaluwarsa, ulangi proses `/link` untuk mendapatkan kode baru
- Setiap akun Telegram hanya dapat ditautkan dengan satu NRP/NIP

---

## Mengakses Menu

### Buka Menu Utama

**Perintah:**
```
/menu
```

**Respons Bot:**
```
Selamat Siang, Bapak/Ibu
👤 Identitas Anda

Nama Polres: POLRES SURABAYA
Nama     : BRIPKA JOHN DOE
Pangkat  : BRIPKA
NRP/NIP  : 081235114745
Satfung  : SUBBID PENMAS
Jabatan  : ANGGOTA
Instagram: @johndoe_official
TikTok   : johndoe123
Status   : 🟢 AKTIF

📋 Menu User Cicero

1. Lihat Data Saya
2. Update Data
3. Keluar

Pilih menu (1-3):
```

### Pilihan Menu

#### Option 1: Lihat Data Saya
Menampilkan informasi lengkap profil Anda

**Cara Menggunakan:**
- Ketik `1` setelah menu muncul
- Bot akan menampilkan data lengkap Anda

#### Option 2: Update Data
Mengubah informasi profil Anda

**Cara Menggunakan:**
- Ketik `2` setelah menu muncul
- Pilih field yang ingin diubah
- Masukkan nilai baru

#### Option 3: Keluar
Menutup menu

**Cara Menggunakan:**
- Ketik `3` atau `batal`

---

## Update Data

### Langkah 1: Pilih Menu Update

**Input:**
```
2
```

**Respons Bot:**
```
✏️ Pilih field yang ingin diupdate:
1. Nama
2. Pangkat
3. Satfung
4. Jabatan
5. Instagram
6. TikTok

Balas angka field di atas atau batal untuk keluar.
```

### Langkah 2: Pilih Field

**Contoh: Update Instagram**

**Input:**
```
5
```

**Respons Bot:**
```
✏️ Ketik nilai baru untuk field Instagram (masukkan link profil atau username Instagram).

Balas dengan angka atau nama pada daftar, atau ketik batal untuk membatalkan:
```

### Langkah 3: Masukkan Nilai Baru

**Input:**
```
@johndoe_new
```

**Atau:**
```
https://www.instagram.com/johndoe_new
```

**Respons Bot:**
```
✅ Data instagram untuk NRP 081235114745 berhasil diupdate menjadi @johndoe_new.

Ketik /menu untuk kembali ke menu utama.
```

### Field yang Dapat Diupdate

| No | Field | Format | Contoh |
|----|-------|--------|--------|
| 1 | Nama | Teks bebas | BRIPKA JOHN DOE |
| 2 | Pangkat | Pilih dari list | BRIPKA |
| 3 | Satfung | Pilih dari list | SUBBID PENMAS |
| 4 | Jabatan | Teks bebas | ANGGOTA |
| 5 | Instagram | Username atau link | @johndoe atau https://instagram.com/johndoe |
| 6 | TikTok | Username atau link | @johndoe atau https://tiktok.com/@johndoe |
| 7 | Desa Binaan* | Teks bebas | DESA SUKAMAJU |

\* *Hanya untuk user dengan role Ditbinmas*

### Validasi Input

#### Instagram
- ✅ Format yang diterima:
  - `@username`
  - `username`
  - `https://www.instagram.com/username`
  - `https://instagram.com/username`

#### TikTok
- ✅ Format yang diterima:
  - `@username`
  - `username`
  - `https://www.tiktok.com/@username`
  - `https://tiktok.com/@username`

#### Pangkat & Satfung
- Pilih dari daftar yang tersedia
- Bisa ketik nomor atau nama lengkap

---

## FAQ

### Q: Bagaimana jika saya lupa kode persetujuan?
**A:** Kode persetujuan dikirimkan setelah Anda menjalankan `/link`. Jika lupa, ulangi perintah `/link` untuk mendapatkan kode baru.

### Q: Berapa lama kode persetujuan berlaku?
**A:** Kode berlaku selama 24 jam sejak dibuat. Setelah itu, Anda harus membuat permintaan baru.

### Q: Apa yang terjadi jika NRP/NIP tidak ditemukan?
**A:** Bot akan memberitahu bahwa NRP/NIP tidak terdaftar. Hubungi administrator untuk memastikan data Anda sudah terdaftar di sistem.

### Q: Bisakah satu akun Telegram ditautkan ke beberapa NRP/NIP?
**A:** Tidak. Setiap akun Telegram hanya dapat ditautkan dengan satu NRP/NIP.

### Q: Bagaimana cara melepas penautan?
**A:** Saat ini belum ada fitur unlink. Hubungi administrator jika perlu melepas penautan.

### Q: Apakah data saya aman?
**A:** Ya. Bot menggunakan enkripsi dan hanya Anda yang dapat mengakses data Anda setelah penautan disetujui.

### Q: Bisa update data orang lain?
**A:** Tidak. Anda hanya bisa melihat dan update data Anda sendiri.

### Q: Field apa saja yang bisa diupdate?
**A:** Nama, Pangkat, Satfung, Jabatan, Instagram, TikTok, dan Desa Binaan (khusus Ditbinmas).

### Q: Apakah perlu penautan ulang setiap hari?
**A:** Tidak. Penautan bersifat permanen sampai Anda atau administrator melepasnya.

### Q: Bisa menggunakan bot di grup?
**A:** Tidak. Bot hanya bekerja di chat private untuk menjaga privasi data Anda.

---

## Troubleshooting

### Problem: Bot tidak merespons
**Solusi:**
1. Pastikan Anda mengirim pesan di chat private, bukan di grup
2. Cek koneksi internet Anda
3. Coba restart chat dengan mengetik `/start`

### Problem: Kode persetujuan tidak valid
**Solusi:**
1. Pastikan Anda mengetik kode dengan benar (6 digit angka)
2. Cek apakah kode sudah kedaluwarsa (>24 jam)
3. Minta kode baru dengan mengulangi `/link`

### Problem: NRP/NIP tidak ditemukan
**Solusi:**
1. Pastikan NRP/NIP yang dimasukkan benar
2. Hubungi administrator untuk verifikasi data

### Problem: Instagram/TikTok sudah terdaftar
**Solusi:**
- Username tersebut sudah digunakan user lain
- Gunakan username yang berbeda
- Atau hubungi administrator jika yakin username tersebut milik Anda

---

## Kontak Support

Jika mengalami masalah atau butuh bantuan:
- Hubungi operator Humas Polres Anda
- Atau hubungi administrator sistem

---

## Catatan Penting

⚠️ **Keamanan:**
- Jangan bagikan kode persetujuan Anda ke orang lain
- Pastikan Anda yang melakukan proses penautan
- Laporkan jika ada aktivitas mencurigakan

✅ **Tips Penggunaan:**
- Simpan NRP/NIP Anda untuk proses penautan
- Update data secara berkala jika ada perubahan
- Gunakan username Instagram/TikTok yang valid

---

*Panduan ini dibuat untuk membantu pengguna Bot User Cicero Telegram*  
*Versi: 1.0 | Tanggal: 2026-02-03*
