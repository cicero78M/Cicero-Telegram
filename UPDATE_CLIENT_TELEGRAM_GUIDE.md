# Panduan Update Data Client via Telegram Bot

## Ringkasan
Fitur update data client kini telah tersedia melalui Telegram bot. Pengguna dapat memperbarui informasi client secara interaktif tanpa perlu mengakses web dashboard.

## Cara Menggunakan

### Langkah 1: Akses Menu Kelola Client
1. Buka chat dengan bot Telegram Cicero Client Request
2. Ketik `/menu` untuk menampilkan menu utama
3. Ketik `2` untuk membuka **Manajemen Client & User**
4. Ketik `1` untuk membuka **Kelola Client**
5. Ketik `1` untuk memilih **Update Data Client**

### Langkah 2: Pilih Field yang Ingin Diupdate
Bot akan menampilkan menu dengan 6 field yang dapat diupdate beserta nilai saat ini:

```
✏️ Update Data Client
Client: DITINTELKAM (DITINTELKAM)

Pilih field yang ingin diupdate:

1️⃣ Nama Client
   Saat ini: DITINTELKAM

2️⃣ Instagram Username
   Saat ini: ditintelkam_official

3️⃣ TikTok Username
   Saat ini: @ditintelkam

4️⃣ Client Group
   Saat ini: MABES

5️⃣ Client Operator (WA)
   Saat ini: 628123456789

6️⃣ Client Super Admin (WA)
   Saat ini: 628987654321

Ketik nomor field (1-6) atau /menu untuk kembali.
```

### Langkah 3: Masukkan Nilai Baru
Setelah memilih nomor field, bot akan meminta nilai baru:

```
✏️ Update Nama Client
Client: DITINTELKAM (DITINTELKAM)

Nilai saat ini: DITINTELKAM

Masukkan nilai baru untuk Nama Client:
Contoh: DITINTELKAM

Ketik nomor field (1-6) atau /menu untuk membatalkan.
```

Masukkan nilai baru, atau:
- Ketik `-` (tanda minus) untuk mengosongkan field
- Ketik `/menu` untuk membatalkan

### Langkah 4: Konfirmasi
Bot akan menampilkan konfirmasi update:

```
✅ Update Berhasil

Client: DITINTELKAM
Field: Nama Client
Nilai baru: DIREKTORAT INTELIJEN KEAMANAN

Data client telah diperbarui.
```

## Field yang Dapat Diupdate

### 1. Nama Client
- **Deskripsi**: Nama lengkap client
- **Contoh**: `DITINTELKAM`, `DIREKTORAT INTELIJEN KEAMANAN`
- **Format**: Text bebas
- **Kosongkan**: Ketik `-` atau biarkan kosong

### 2. Instagram Username
- **Deskripsi**: Username Instagram tanpa @
- **Contoh**: `polri_official`, `ditintelkam_official`
- **Format**: Username Instagram (tanpa spasi)
- **Kosongkan**: Ketik `-` atau biarkan kosong

### 3. TikTok Username
- **Deskripsi**: Username TikTok dengan atau tanpa @
- **Contoh**: `@polri`, `polri_official`
- **Format**: Username TikTok
- **Kosongkan**: Ketik `-` atau biarkan kosong

### 4. Client Group
- **Deskripsi**: Grup atau kategori client
- **Contoh**: `MABES`, `POLDA`, `DITJEN`
- **Format**: Text bebas
- **Kosongkan**: Ketik `-` atau biarkan kosong

### 5. Client Operator (WhatsApp)
- **Deskripsi**: Nomor WhatsApp operator client
- **Contoh**: `628123456789`, `08123456789`, `8123456789`
- **Format**: Nomor telepon (10-15 digit)
- **Validasi**: 
  - Nomor harus 10-15 digit
  - Otomatis dinormalisasi ke format 62xxx
  - `08123456789` → `628123456789`
  - `8123456789` → `628123456789`
- **Kosongkan**: Ketik `-` atau biarkan kosong

### 6. Client Super Admin (WhatsApp)
- **Deskripsi**: Nomor WhatsApp super admin client
- **Contoh**: `628123456789`, `08123456789`, `8123456789`
- **Format**: Nomor telepon (10-15 digit)
- **Validasi**: Sama dengan Client Operator
- **Kosongkan**: Ketik `-` atau biarkan kosong

## Tips Penggunaan

### Mengosongkan Field
Untuk mengosongkan field (menghapus nilai), ada 2 cara:
1. Ketik tanda minus: `-`
2. Langsung tekan Enter tanpa memasukkan nilai

Contoh:
```
Masukkan nilai baru untuk Instagram Username:
Contoh: polri_official atau kosongkan dengan tanda -

User input: -

✅ Update Berhasil
Client: DITINTELKAM
Field: Instagram Username
Nilai baru: (kosong)
```

### Format Nomor WhatsApp
Sistem akan otomatis menormalisasi nomor WhatsApp:
- `08123456789` akan menjadi `628123456789`
- `8123456789` akan menjadi `628123456789`
- `+628123456789` akan menjadi `628123456789`
- `628123456789` tetap `628123456789`

### Membatalkan Update
Untuk membatalkan proses update kapan saja:
- Ketik `/menu` di chat
- Bot akan kembali ke menu utama

## Error Messages

### Field Tidak Valid
```
❌ Field tidak valid.
```
**Solusi**: Pastikan memasukkan nomor field yang benar (1-6)

### Pilihan Tidak Valid
```
❌ Pilihan tidak valid. Ketik nomor field yang valid (1-6) atau /menu untuk kembali.
```
**Solusi**: Ketik angka antara 1-6, bukan huruf atau karakter lain

### Format WhatsApp Tidak Valid
```
❌ Format nomor WhatsApp tidak valid. Nomor harus 10-15 digit.
```
**Solusi**: 
- Periksa panjang nomor (minimal 10 digit, maksimal 15 digit)
- Pastikan tidak ada huruf atau karakter khusus selain angka
- Contoh valid: `08123456789`, `628123456789`

### Client Tidak Ditemukan
```
❌ Client dengan ID XXX tidak ditemukan.
```
**Solusi**: Hubungi administrator, client mungkin sudah dihapus

### Sesi Tidak Valid
```
❌ Sesi tidak valid. Ketik /menu untuk memulai kembali.
```
**Solusi**: Ketik `/menu` untuk memulai dari awal

## Keamanan

Fitur ini telah melewati:
- ✅ Validasi input untuk semua field
- ✅ Pemeriksaan keamanan CodeQL (0 alert)
- ✅ Penggunaan parameterized queries (mencegah SQL injection)
- ✅ Validasi format nomor WhatsApp

## FAQ

**Q: Apakah saya bisa mengupdate beberapa field sekaligus?**
A: Tidak, sistem dirancang untuk update satu field per waktu untuk keamanan dan kemudahan validasi. Namun, Anda dapat langsung memilih field lain setelah update berhasil.

**Q: Bagaimana cara melihat nilai client saat ini?**
A: Pilih opsi `3` (Info Client) di menu Kelola Client untuk melihat semua informasi client termasuk statistik.

**Q: Apakah ada log history perubahan?**
A: Perubahan tersimpan di database. Untuk melihat history, gunakan web dashboard atau hubungi administrator.

**Q: Siapa saja yang bisa mengupdate data client?**
A: Hanya pengguna yang memiliki akses ke bot Telegram Client Request. Hubungi administrator untuk informasi lebih lanjut tentang akses.

**Q: Apakah perubahan langsung aktif?**
A: Ya, perubahan langsung tersimpan ke database dan aktif segera setelah konfirmasi berhasil.

## Contoh Lengkap

```
User: /menu
Bot: [Menampilkan menu utama]

User: 2
Bot: [Menampilkan menu Manajemen Client & User]

User: 1
Bot: [Menampilkan menu Kelola Client]

User: 1
Bot: [Menampilkan daftar field yang dapat diupdate]

User: 2
Bot: [Meminta nilai baru untuk Instagram Username]

User: ditintelkam_new
Bot: ✅ Update Berhasil
     Client: DITINTELKAM
     Field: Instagram Username
     Nilai baru: ditintelkam_new
     
     Data client telah diperbarui.

User: /menu
Bot: [Kembali ke menu utama]
```

## Bantuan

Jika mengalami masalah:
1. Coba ketik `/menu` untuk reset
2. Restart chat dengan bot
3. Hubungi administrator sistem
4. Lihat dokumentasi lengkap di web dashboard

---
**Versi**: 1.0  
**Tanggal**: 2026-02-04  
**Status**: ✅ Production Ready
