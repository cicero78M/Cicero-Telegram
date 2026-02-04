# Update Data Client - User Flow Example

## Step-by-Step User Journey

### Initial Setup
User starts by typing `/menu` in the Telegram bot

### Step 1: Main Menu
```
📋 Menu Client Request

Client aktif: DITBINMAS

Pilih menu yang ingin Anda akses:

1️⃣ Tambah Client Baru
   Tambahkan client baru ke sistem

2️⃣ Manajemen Client & User
   Kelola client dan user, update/hapus data

3️⃣ Operasional Media Sosial
   Ambil konten, likes, komentar Instagram & TikTok

4️⃣ Transfer & Laporan
   Transfer user, laporan, export data

5️⃣ Administratif
   Kelola komplain, broadcast, kontak Google
```

**User types:** `2`

---

### Step 2: Management Submenu
```
Selamat Pagi!

📋 Manajemen Client & User
Client: DITBINMAS

Pilih submenu yang ingin Anda akses:

1️⃣ Kelola Client
   Update, hapus, atau lihat info client

2️⃣ Kelola User
   Update, exception, atau status user

3️⃣ Hapus WA User
   Hapus nomor WhatsApp dari user

4️⃣ Penghapusan Massal Status User
   Hapus status user secara massal

5️⃣ Refresh Aggregator Direktorat
   Refresh data aggregator direktorat

Ketik nomor submenu (1-5) untuk melanjutkan, atau ketik /menu untuk kembali.
```

**User types:** `1`

---

### Step 3: Kelola Client Menu
```
🏢 Kelola Client
Client: DITBINMAS

Pilih aksi yang ingin dilakukan:

1️⃣ Update Data Client
   Perbarui informasi client

2️⃣ Hapus Client
   Hapus client dari sistem

3️⃣ Info Client
   Tampilkan detail client

Ketik nomor aksi (1-3) atau /menu untuk kembali.
```

**User types:** `1`

---

### Step 4: Select Category
```
📝 Update Data Client
Client: DITBINMAS

Pilih kategori data yang ingin diperbarui:

1️⃣ Identitas & Tipe
2️⃣ Kontak WA
3️⃣ Akun Sosmed
4️⃣ Status & Amplifikasi

Ketik nomor kategori (1-4) atau /menu untuk kembali.
```

**User types:** `3`

---

### Step 5: Select Field
```
📝 Update Data Client - Akun Sosmed
Client: DITBINMAS

Pilih field yang ingin diupdate:

1️⃣ Username Instagram
   (client_insta)
2️⃣ Username TikTok
   (client_tiktok)
3️⃣ TikTok SecUID
   (tiktok_secuid)

Ketik nomor field (1-3) atau /menu untuk kembali.
```

**User types:** `2`

---

### Step 6: Input Value
```
📝 Update Data Client - Username TikTok
Client: DITBINMAS

Masukkan nilai baru untuk Username TikTok:

💡 Masukkan username TikTok tanpa @
(SecUID akan disinkronkan otomatis)

Ketik nilai baru atau /menu untuk kembali.
```

**User types:** `polriofficial`

---

### Step 7: Success Confirmation
```
✅ Update Berhasil

Field Username TikTok telah diperbarui.
✅ SecUID berhasil disinkronkan.

📊 Informasi Client:
🆔 Client ID: DITBINMAS
📛 Nama: Ditbinmas Polri
📍 Status: ✅ Aktif
🏷️ Tipe: DIREKTORAT
```

---

## Alternative Flows

### Flow 2: Update Boolean Field (Status)

**Step 4:** User selects `4` (Status & Amplifikasi)

**Step 5:** Bot shows:
```
📝 Update Data Client - Status & Amplifikasi
Client: DITBINMAS

Pilih field yang ingin diupdate:

1️⃣ Status Aktif (true/false)
   (client_status)
2️⃣ Status IG Aktif (true/false)
   (client_insta_status)
3️⃣ Status TikTok Aktif (true/false)
   (client_tiktok_status)
4️⃣ Status Amplifikasi (true/false)
   (client_amplify_status)

Ketik nomor field (1-4) atau /menu untuk kembali.
```

**User types:** `2`

**Step 6:** Bot shows:
```
📝 Update Data Client - Status IG Aktif
Client: DITBINMAS

Masukkan nilai baru untuk Status IG Aktif:

💡 Untuk field status, masukkan:
• true untuk aktif
• false untuk tidak aktif

Ketik nilai baru atau /menu untuk kembali.
```

**User types:** `true`

**Step 7:** Success message displayed

---

### Flow 3: Auto-Sync TikTok SecUID

**Step 4:** User selects `3` (Akun Sosmed)

**Step 5:** User selects `3` (TikTok SecUID)

**Bot immediately shows:**
```
🔄 Sinkronisasi TikTok SecUID

SecUID akan disinkronkan otomatis dari username TikTok yang tersimpan.

Menunggu konfirmasi...
```

**Then shows:**
```
✅ Update Berhasil

Field TikTok SecUID telah diperbarui.
✅ SecUID berhasil disinkronkan dari username: @polriofficial

📊 Informasi Client:
🆔 Client ID: DITBINMAS
📛 Nama: Ditbinmas Polri
📍 Status: ✅ Aktif
🏷️ Tipe: DIREKTORAT
```

---

## Error Handling Examples

### Invalid Category Selection
**User types:** `10`

**Bot responds:**
```
❌ Pilihan tidak valid. Ketik nomor kategori yang valid (1-4).
```

---

### Invalid Boolean Value
**User types:** `maybe`

**Bot responds:**
```
❌ Nilai tidak valid untuk field status. Masukkan true atau false.
```

---

### Missing TikTok Username for SecUID Sync
**User selects:** TikTok SecUID when no username is set

**Bot responds:**
```
⚠️ Username TikTok belum diisi. Update client_tiktok terlebih dahulu.
```

---

## Navigation Options

At any step, user can:
- Type `/menu` to return to main menu
- Type the expected input to proceed
- Bot maintains session state throughout the workflow

---

## Technical Notes

### Session State Transitions
1. `menu` → User selects main menu option
2. `management_submenu` → User selects management submenu
3. `management_subaction` → User selects action (Update Data Client)
4. `update_client_group` → User selects field category
5. `update_client_field` → User selects specific field
6. `update_client_value` → User inputs new value
7. `menu` → Reset to menu after successful update

### Data Flow
1. User input collected through Telegram messages
2. Session stores: clientId, clientName, selectedGroup, selectedField
3. Handlers validate input at each step
4. Final handler calls `updateClient()` service
5. Success/error feedback sent to user
6. Session reset to allow new operations

---

## Best Practices Demonstrated

✅ **Clear User Guidance**: Each step provides clear instructions
✅ **Progressive Disclosure**: Shows only relevant options at each step
✅ **Input Validation**: Validates data before processing
✅ **Error Recovery**: Clear error messages guide users to correct input
✅ **Context Preservation**: Displays client name throughout workflow
✅ **Smart Defaults**: Auto-sync for related fields (TikTok SecUID)
✅ **Flexible Navigation**: /menu command always available
✅ **Confirmation Feedback**: Detailed success messages with updated data
