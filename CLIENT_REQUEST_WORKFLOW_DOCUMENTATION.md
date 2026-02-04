# Client Request Telegram Bot Workflow Documentation

## Overview
This document provides a deep understanding of the Telegram bot workflow for the client request menu, including client selection, data retrieval, and processing based on `client_id`, `client_type`, and `client_status`.

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Workflow Diagram](#workflow-diagram)
3. [Client Data Structure](#client-data-structure)
4. [Client Selection Process](#client-selection-process)
5. [Menu Structure](#menu-structure)
6. [Database Queries](#database-queries)
7. [Error Handling](#error-handling)

---

## Core Concepts

### 1. Client Identification (`client_id`)
- **Definition**: Unique identifier for each client
- **Type**: String (VARCHAR in database)
- **Primary Key**: Yes
- **Case Sensitivity**: Case-insensitive lookups
- **Example**: `DITBINMAS`, `POLDA_METRO`, `POLRES_JAKSEL`

### 2. Client Type (`client_type`)
Two distinct types with different purposes:

#### ORG (Organization)
- **Purpose**: Organizational/operational management
- **Features**:
  - Parent-child relationships via `parent_client_id`
  - Amplify status support
  - Instagram and TikTok account management
- **Queries**:
  - `findAllActiveOrgClients()`: Active ORG clients only
  - `findAllActiveOrgClientsWithSosmed()`: ORG clients with social media

#### DIREKTORAT (Directorate)
- **Purpose**: Directorate/regional management
- **Features**:
  - Regional hierarchy via `regional_id`
  - Client level support via `client_level`
  - Parent-child relationships
- **Queries**:
  - `findAllActiveDirektorat()`: Active Direktorat clients
  - `findAllActiveDirektoratWithSosmed()`: Direktorat clients with social media

### 3. Client Status (`client_status`)
- **Type**: Boolean
- **Values**:
  - `true`: Active client (available for selection)
  - `false`: Inactive client (hidden from selection)
- **Purpose**: Control which clients are displayed to users

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────┐
│             User starts bot: /menu              │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Check if user has a selected client in session │
└────────┬────────────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
   YES       NO
    │         │
    │         ▼
    │    ┌──────────────────────────────────────┐
    │    │  Show Client Type Selection Menu:    │
    │    │  1. All Active Clients               │
    │    │  2. Org Clients Only                 │
    │    │  3. Direktorat Clients Only          │
    │    └────────────┬─────────────────────────┘
    │                 │
    │                 ▼
    │    ┌──────────────────────────────────────┐
    │    │  User selects type (1, 2, or 3)      │
    │    └────────────┬─────────────────────────┘
    │                 │
    │                 ▼
    │    ┌──────────────────────────────────────┐
    │    │  Query database for clients:         │
    │    │  - Type 1: findAllActiveClients()    │
    │    │  - Type 2: findAllActiveOrgClients() │
    │    │  - Type 3: findAllActiveDirektorat() │
    │    └────────────┬─────────────────────────┘
    │                 │
    │                 ▼
    │    ┌──────────────────────────────────────┐
    │    │  Display client list (up to 10):     │
    │    │  1️⃣ CLIENT_ID - Name [TYPE]         │
    │    │  2️⃣ CLIENT_ID - Name [TYPE]         │
    │    │  ...                                  │
    │    │  User can type:                       │
    │    │  - Number (1-10)                      │
    │    │  - Client ID                          │
    │    │  - "kembali" (back to type selection) │
    │    └────────────┬─────────────────────────┘
    │                 │
    │                 ▼
    │    ┌──────────────────────────────────────┐
    │    │  User selects client                  │
    │    │  Store in session:                    │
    │    │  - selectedClientId                   │
    │    │  - clientName                         │
    │    │  - step: 'menu'                       │
    │    └────────────┬─────────────────────────┘
    │                 │
    └─────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│          Show Main Menu (4 categories)          │
│  1️⃣ Manajemen Client & User                    │
│  2️⃣ Operasional Media Sosial                   │
│  3️⃣ Transfer & Laporan                         │
│  4️⃣ Administratif                              │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  User selects menu number (1-4)                 │
│  Bot calls runClientRequestAction()             │
│  with selected clientId and menu number         │
└─────────────────────────────────────────────────┘
```

---

## Client Data Structure

### Database Schema (clients table)

```sql
CREATE TABLE clients (
  client_id VARCHAR PRIMARY KEY,           -- Unique identifier
  nama VARCHAR,                             -- Display name
  client_type VARCHAR,                      -- 'ORG' or 'DIREKTORAT'
  client_status BOOLEAN DEFAULT true,      -- Active/Inactive
  
  -- Social Media Fields
  client_insta VARCHAR,                     -- Instagram handle
  client_insta_status BOOLEAN DEFAULT true,
  client_tiktok VARCHAR,                    -- TikTok handle
  client_tiktok_status BOOLEAN DEFAULT true,
  tiktok_secuid VARCHAR,
  
  -- Organizational Fields
  client_amplify_status BOOLEAN DEFAULT true,
  client_operator VARCHAR,                  -- WhatsApp number
  client_super VARCHAR,                     -- Super admin contacts
  client_group VARCHAR,
  
  -- Hierarchy Fields
  regional_id VARCHAR,                      -- Regional identifier
  parent_client_id VARCHAR,                 -- Parent client reference
  client_level INTEGER                      -- Hierarchy level
);
```

### Example Records

```json
// ORG Client
{
  "client_id": "POLDA_METRO",
  "nama": "Polda Metro Jaya",
  "client_type": "ORG",
  "client_status": true,
  "client_insta": "policemetrojaya",
  "client_insta_status": true,
  "client_tiktok": "@policemetrojaya",
  "client_tiktok_status": true
}

// DIREKTORAT Client
{
  "client_id": "DITBINMAS",
  "nama": "Direktorat Bina Masyarakat",
  "client_type": "DIREKTORAT",
  "client_status": true,
  "regional_id": "MABES",
  "client_level": 1
}
```

---

## Client Selection Process

### Step 1: Client Type Selection

**User Input**: Number 1-3

**Processing** (`handleClientTypeSelection`):
```javascript
switch (input) {
  case '1': clientType = 'all'; break;
  case '2': clientType = 'org'; break;
  case '3': clientType = 'direktorat'; break;
}
```

### Step 2: Query Database

**Query Selection** (`showClientSelection`):
```javascript
if (clientType === 'org') {
  clients = await findAllActiveOrgClients();
  // SQL: SELECT * FROM clients 
  //      WHERE client_status = true 
  //      AND LOWER(client_type) = LOWER('org')
}
else if (clientType === 'direktorat') {
  clients = await findAllActiveDirektoratClients();
  // SQL: SELECT * FROM clients 
  //      WHERE client_status = true 
  //      AND LOWER(client_type) = LOWER('direktorat')
}
else {
  clients = await findAllActiveClients();
  // SQL: SELECT * FROM clients 
  //      WHERE client_status = true
}
```

### Step 3: Validate and Filter

**Validation** (`isValidClient`):
```javascript
function isValidClient(client) {
  if (!client || !client.client_id || client.client_id.trim() === '') {
    return false;
  }
  return true;
}

const validClients = clients.filter(isValidClient);
```

### Step 4: Display Clients

**Format**:
```
📋 *Pilih Client - [Type Label]*

1️⃣ DITBINMAS - Direktorat Bina Masyarakat [DIREKTORAT]
2️⃣ POLDA_METRO - Polda Metro Jaya [ORG]
3️⃣ POLRES_JAKSEL - Polres Jakarta Selatan [ORG]

Balas dengan *angka* (1-3) atau *Client ID* yang tertera.
Ketik *kembali* untuk memilih tipe client lain.
```

### Step 5: User Selection

**Input Handling** (`handleClientSelection`):
```javascript
// Check for "back" command
if (input === 'kembali' || input === 'back') {
  await showClientSelection(chatId, null);
  return;
}

// Try numeric selection (1-10)
if (/^\d+$/.test(text)) {
  const index = parseInt(text, 10) - 1;
  selectedClient = clients[index];
}

// Try client ID match
if (!selectedClient) {
  selectedClient = clients.find(c => 
    c.client_id.toUpperCase() === input.toUpperCase()
  );
}
```

### Step 6: Store in Session

**Session Data**:
```javascript
userSessions.set(chatId, {
  selectedClientId: selectedClient.client_id,
  clientName: selectedClient.nama || selectedClient.client_id,
  step: 'menu'
});
```

---

## Menu Structure

### Main Menu Categories

#### 1️⃣ Manajemen Client & User
**Sub-menus**:
- Tambah client baru
- Kelola client (update/hapus/info)
- Kelola user (update/exception/status)
- Hapus WA User
- Penghapusan Massal Status User
- Refresh Aggregator Direktorat

**Client Type Support**: Both ORG and DIREKTORAT

#### 2️⃣ Operasional Media Sosial
**Sub-menus**:
- Ambil konten Instagram
- Ambil konten TikTok
- Ambil likes Instagram
- Ambil komentar TikTok
- Hapus konten TikTok
- Cek status akun

**Client Type Support**: Requires clients with `client_insta_status=true` or `client_tiktok_status=true`

#### 3️⃣ Transfer & Laporan
**Sub-menus**:
- Transfer user antar client
- Laporan user per client
- Export data user
- Sinkronisasi data

**Client Type Support**: Both ORG and DIREKTORAT

#### 4️⃣ Administratif
**Sub-menus**:
- Kelola komplain user
- Kirim broadcast
- Manajemen kontak Google
- Update data client
- Kelola Akun Resmi Satbinmas

**Client Type Support**: Both ORG and DIREKTORAT

---

## Database Queries

### All Active Clients
```sql
-- Function: findAllActive()
SELECT * FROM clients 
WHERE client_status = true
```

### Active ORG Clients
```sql
-- Function: findAllActiveOrgClients()
SELECT client_id, nama, client_type, client_status, client_group
FROM clients
WHERE client_status = true
  AND LOWER(client_type) = LOWER('org')
ORDER BY client_id
```

### Active Direktorat Clients
```sql
-- Function: findAllActiveDirektorat()
SELECT client_id, nama, client_type, client_status, regional_id, client_level
FROM clients
WHERE client_status = true 
  AND LOWER(client_type) = LOWER('direktorat')
ORDER BY client_id
```

### Active Clients with Social Media (ORG)
```sql
-- Function: findAllActiveOrgClientsWithSosmed()
SELECT client_id, nama, client_type, client_status, client_group,
       client_insta_status, client_tiktok_status
FROM clients
WHERE client_status = true
  AND LOWER(client_type) = LOWER('org')
  AND client_insta_status = true
  AND client_tiktok_status = true
ORDER BY client_id
```

### Active Clients with Social Media (Direktorat)
```sql
-- Function: findAllActiveDirektoratWithSosmed()
SELECT client_id, nama, client_group, client_operator, client_super,
       regional_id, client_level
FROM clients
WHERE client_status = true
  AND LOWER(client_type) = LOWER('direktorat')
  AND client_insta_status = true
  AND client_tiktok_status = true
ORDER BY client_id
```

---

## Error Handling

### 1. Database Connection Failure
**Scenario**: Database is unreachable or query times out

**Handling**:
```javascript
try {
  clients = await findAllActiveClients();
} catch (error) {
  if (error.message.includes('database') || 
      error.message.includes('connection')) {
    errorMessage = 'Detail: Masalah koneksi database.\n\n';
  }
  // Fallback to DEFAULT_CLIENT_ID
  userSessions.set(chatId, { 
    selectedClientId: DEFAULT_CLIENT_ID,
    step: 'menu'
  });
}
```

### 2. Invalid Query Response
**Scenario**: Query returns null, undefined, or non-array

**Handling**:
```javascript
if (!clients) {
  console.error('Query returned null or undefined');
  // Use default client as fallback
  userSessions.set(chatId, { 
    selectedClientId: DEFAULT_CLIENT_ID,
    step: 'menu'
  });
  await sendFallbackMessage(chatId);
  return;
}

if (!Array.isArray(clients)) {
  console.error('Query returned non-array');
  // Use default client as fallback
  await sendFallbackMessage(chatId);
  return;
}
```

### 3. No Clients Found
**Scenario**: Query succeeds but returns empty array

**Handling**:
```javascript
if (clients.length === 0) {
  console.log('No clients found, using default');
  userSessions.set(chatId, { 
    selectedClientId: DEFAULT_CLIENT_ID,
    step: 'menu'
  });
  await clientBot.sendMessage(chatId, 
    `✅ Menggunakan client ${DEFAULT_CLIENT_ID} sebagai default.`
  );
  await sendMainMenu(chatId);
  return;
}
```

### 4. Invalid Client Data
**Scenario**: Clients have missing or invalid `client_id`

**Handling**:
```javascript
const validClients = clients.filter(client => {
  if (!isValidClient(client)) {
    console.warn('Invalid client object:', client);
    return false;
  }
  return true;
});

if (validClients.length === 0) {
  // All clients invalid, use fallback
  await useFallbackClient(chatId);
  return;
}
```

### 5. Session Lost
**Scenario**: User session not found during client selection

**Handling**:
```javascript
const session = userSessions.get(chatId);
if (!session || !session.clients) {
  await clientBot.sendMessage(chatId, 
    '❌ Sesi tidak ditemukan. Silakan ketik /menu untuk memulai kembali.'
  );
  return;
}
```

---

## Configuration

### Environment Variables
```bash
# Client Bot Token
TELEGRAM_CLIENT_BOT_TOKEN=your_bot_token_here

# Enable/Disable Bot
TELEGRAM_CLIENT_BOT_ENABLED=true
```

### Default Client
```javascript
const DEFAULT_CLIENT_ID = 'DITBINMAS';
```
This client is used as fallback when:
- No clients are found
- All clients are invalid
- Database connection fails

---

## Session Management

### Session Structure
```javascript
{
  // Step 1: Client Type Selection
  step: 'choose_client_type',
  
  // Step 2: Client Selection
  step: 'choose_client',
  clients: [...],           // Available clients
  clientType: 'org',        // Selected type
  
  // Step 3: Menu Navigation
  step: 'menu',
  selectedClientId: 'CLIENT_ID',
  clientName: 'Display Name'
}
```

### Session Lifecycle
1. **Created**: When user types `/menu`
2. **Updated**: After each successful step
3. **Cleared**: When user types `/exit` or `/close`
4. **Persists**: In memory (`Map` object)

---

## Best Practices

### 1. Always Filter by Status
✅ **Do**: Query only active clients
```javascript
WHERE client_status = true
```

❌ **Don't**: Query all clients
```javascript
SELECT * FROM clients  // Includes inactive
```

### 2. Case-Insensitive Comparison
✅ **Do**: Use LOWER() for type comparison
```javascript
WHERE LOWER(client_type) = LOWER('org')
```

❌ **Don't**: Direct comparison
```javascript
WHERE client_type = 'ORG'  // Fails if stored as 'org'
```

### 3. Validate Client Objects
✅ **Do**: Check required fields
```javascript
function isValidClient(client) {
  return client && client.client_id && client.client_id.trim() !== '';
}
```

❌ **Don't**: Assume data is valid
```javascript
const client = clients[0];
console.log(client.client_id);  // May throw error
```

### 4. Provide Fallback
✅ **Do**: Always have a default option
```javascript
if (clients.length === 0) {
  selectedClientId = DEFAULT_CLIENT_ID;
}
```

❌ **Don't**: Leave user stuck
```javascript
if (clients.length === 0) {
  return;  // User can't proceed
}
```

---

## Troubleshooting

### Error: "Terjadi kesalahan saat mengambil daftar client"

**Possible Causes**:
1. Database connection failure
2. Query timeout
3. Invalid query response
4. No active clients in database

**Solutions**:
1. Check database connection
2. Verify `client_status = true` for at least one client
3. Check database credentials in `.env`
4. Review database logs for errors

### Error: "Client tidak ditemukan"

**Possible Causes**:
1. User entered invalid client ID
2. Client was deactivated after list was shown
3. Session expired

**Solutions**:
1. Type `/menu` to refresh client list
2. Use numeric selection (1-10) instead of ID
3. Verify client exists in database

### Error: "Sesi tidak ditemukan"

**Possible Causes**:
1. Server restarted (sessions are in memory)
2. Session timeout
3. Concurrent requests

**Solutions**:
1. Type `/menu` to start new session
2. Avoid rapid multiple commands
3. Wait for previous command to complete

---

## Future Enhancements

### 1. Inactive Client Access
Allow users to view and select inactive clients for administrative purposes.

### 2. Client Search
Implement search functionality to find clients by name or ID.

### 3. Favorites
Allow users to mark favorite clients for quick access.

### 4. Recent Clients
Show recently used clients at the top of the list.

### 5. Client Details
Display detailed information about a client before selection.

---

## References

- **Main Service**: `src/service/telegramClientBotService.js`
- **Client Queries**: `src/model/clientModel.js`
- **Client Service**: `src/service/clientService.js`
- **Menu Handlers**: `src/handler/menu/clientRequestTelegramHandlers.js`
- **Naming Conventions**: `docs/naming_conventions.md`

---

**Last Updated**: February 4, 2026  
**Version**: 1.0  
**Author**: GitHub Copilot Workspace Agent
