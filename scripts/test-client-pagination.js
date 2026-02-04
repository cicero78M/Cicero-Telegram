/**
 * Test script to verify client list pagination logic
 * This script simulates the pagination behavior without requiring a full bot setup
 */

// Mock client data with 37 clients
const mockClients = Array.from({ length: 37 }, (_, i) => ({
  client_id: `POLRES_${String(i + 1).padStart(2, '0')}`,
  nama: `POLRES Test ${i + 1}`,
  client_type: 'ORG',
  client_status: false
}));

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

function formatClientList(clients, page = 1) {
  const itemsPerPage = 10;
  const totalPages = Math.ceil(clients.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, clients.length);
  const pageClients = clients.slice(startIndex, endIndex);

  let menu = `📋 *Pilih Client - Organisasi (ORG) Inactive*\n\n`;
  menu += 'Pilih client yang ingin Anda gunakan:\n\n';

  pageClients.forEach((client, index) => {
    const numberEmoji = NUMBER_EMOJIS[index];
    menu += `${numberEmoji} ${client.client_id} - ${client.nama} [${client.client_type}]\n`;
  });

  if (totalPages > 1) {
    menu += `\n📄 Halaman ${page} dari ${totalPages} (Total: ${clients.length} client)\n`;
    menu += '\nNavigasi:\n';
    if (page > 1) {
      menu += '• Ketik *prev* atau *p* untuk halaman sebelumnya\n';
    }
    if (page < totalPages) {
      menu += '• Ketik *next* atau *n* untuk halaman berikutnya\n';
    }
    if (totalPages > 2) {
      menu += `• Ketik nomor halaman (1-${totalPages}) untuk langsung ke halaman tersebut\n`;
    }
  }

  menu += '\nBalas dengan *angka* (1-' + pageClients.length + ') atau *Client ID* yang tertera.';
  menu += '\nKetik *kembali* untuk memilih tipe client lain.';

  return menu;
}

function testPagination() {
  console.log('=== Client List Pagination Test ===\n');
  
  // Test page 1
  console.log('--- PAGE 1 ---');
  const page1 = formatClientList(mockClients, 1);
  console.log(page1);
  console.log(`\nLength: ${page1.length} characters`);
  console.log('\n' + '='.repeat(80) + '\n');

  // Test page 2
  console.log('--- PAGE 2 ---');
  const page2 = formatClientList(mockClients, 2);
  console.log(page2);
  console.log(`\nLength: ${page2.length} characters`);
  console.log('\n' + '='.repeat(80) + '\n');

  // Test last page (page 4 with only 7 items)
  console.log('--- PAGE 4 (Last Page) ---');
  const page4 = formatClientList(mockClients, 4);
  console.log(page4);
  console.log(`\nLength: ${page4.length} characters`);
  console.log('\n' + '='.repeat(80) + '\n');

  // Test pagination calculations
  const itemsPerPage = 10;
  const totalPages = Math.ceil(mockClients.length / itemsPerPage);
  console.log('=== Pagination Calculations ===');
  console.log(`Total clients: ${mockClients.length}`);
  console.log(`Items per page: ${itemsPerPage}`);
  console.log(`Total pages: ${totalPages}`);
  console.log(`Page 1: Clients 1-10`);
  console.log(`Page 2: Clients 11-20`);
  console.log(`Page 3: Clients 21-30`);
  console.log(`Page 4: Clients 31-37`);
  
  // Verify message lengths
  const allPages = [1, 2, 3, 4].map(p => formatClientList(mockClients, p));
  const maxLength = Math.max(...allPages.map(p => p.length));
  console.log(`\n=== Message Length Verification ===`);
  console.log(`Maximum message length: ${maxLength} characters`);
  console.log(`Telegram limit: 4096 characters`);
  console.log(`Safe limit (used): 4000 characters`);
  console.log(`Status: ${maxLength < 4000 ? '✅ PASS' : '❌ FAIL'}`);
}

// Run the test
testPagination();
