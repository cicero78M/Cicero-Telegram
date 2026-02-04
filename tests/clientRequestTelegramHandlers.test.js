// Test for clientRequestTelegramHandlers Update Data Client workflow
import { jest } from '@jest/globals';

// Mock dependencies before importing the handler
const mockFindClientById = jest.fn();
const mockUpdateClient = jest.fn();
const mockGetClientSummary = jest.fn();
const mockRefreshAggregatorData = jest.fn();
const mockNormalizeHandleValue = jest.fn();
const mockFetchTiktokProfile = jest.fn();

jest.unstable_mockModule('../src/service/clientService.js', () => ({
  findClientById: mockFindClientById,
  getClientSummary: mockGetClientSummary,
  updateClient: mockUpdateClient
}));

jest.unstable_mockModule('../src/service/aggregatorService.js', () => ({
  refreshAggregatorData: mockRefreshAggregatorData
}));

jest.unstable_mockModule('../src/utils/handleNormalizer.js', () => ({
  normalizeHandleValue: mockNormalizeHandleValue
}));

jest.unstable_mockModule('../src/service/tiktokRapidService.js', () => ({
  fetchTiktokProfile: mockFetchTiktokProfile
}));

jest.unstable_mockModule('../src/utils/utilsHelper.js', () => ({
  getGreeting: () => 'Selamat Pagi',
  formatNama: (nama) => nama
}));

const { clientRequestTelegramHandlers } = await import('../src/handler/menu/clientRequestTelegramHandlers.js');

describe('clientRequestTelegramHandlers - Update Data Client Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleUpdateClientStart', () => {
    it('should display field groups for client update', async () => {
      const result = await clientRequestTelegramHandlers.handleUpdateClientStart(
        'TEST_CLIENT',
        'Test Client (TEST_CLIENT)'
      );

      expect(result).toContain('Update Data Client');
      expect(result).toContain('Test Client');
      expect(result).toContain('Identitas & Tipe');
      expect(result).toContain('Kontak WA');
      expect(result).toContain('Akun Sosmed');
      expect(result).toContain('Status & Amplifikasi');
      expect(result).toMatch(/Ketik nomor kategori \(1-4\)/);
    });
  });

  describe('handleUpdateClientGroupSelection', () => {
    it('should return selected group with fields', async () => {
      const result = await clientRequestTelegramHandlers.handleUpdateClientGroupSelection(
        0, // First group (Identitas & Tipe)
        'TEST_CLIENT',
        'Test Client (TEST_CLIENT)'
      );

      expect(result.error).toBe(false);
      expect(result.message).toContain('Identitas & Tipe');
      expect(result.message).toContain('Tipe Client');
      expect(result.message).toContain('Group Client');
      expect(result.selectedGroup).toBeDefined();
      expect(result.selectedGroup.key).toBe('identitas_tipe');
    });

    it('should return error for invalid group index', async () => {
      const result = await clientRequestTelegramHandlers.handleUpdateClientGroupSelection(
        10, // Invalid index
        'TEST_CLIENT',
        'Test Client (TEST_CLIENT)'
      );

      expect(result.error).toBe(true);
      expect(result.message).toContain('tidak valid');
    });
  });

  describe('handleUpdateClientFieldSelection', () => {
    const mockGroup = {
      key: 'identitas_tipe',
      label: 'Identitas & Tipe',
      fields: [
        { key: 'client_type', label: 'Tipe Client' },
        { key: 'client_group', label: 'Group Client' }
      ]
    };

    it('should return selected field with prompt', async () => {
      const result = await clientRequestTelegramHandlers.handleUpdateClientFieldSelection(
        0, // First field
        mockGroup,
        'Test Client (TEST_CLIENT)'
      );

      expect(result.error).toBe(false);
      expect(result.autoSync).toBe(false);
      expect(result.message).toContain('Tipe Client');
      expect(result.message).toContain('Masukkan nilai baru');
      expect(result.selectedField).toBeDefined();
      expect(result.selectedField.key).toBe('client_type');
    });

    it('should handle auto-sync for tiktok_secuid field', async () => {
      const mockGroupWithSecUid = {
        key: 'akun_sosmed',
        label: 'Akun Sosmed',
        fields: [
          { key: 'tiktok_secuid', label: 'TikTok SecUID' }
        ]
      };

      const result = await clientRequestTelegramHandlers.handleUpdateClientFieldSelection(
        0,
        mockGroupWithSecUid,
        'Test Client (TEST_CLIENT)'
      );

      expect(result.error).toBe(false);
      expect(result.autoSync).toBe(true);
      expect(result.message).toContain('Sinkronisasi TikTok SecUID');
    });

    it('should return error for invalid field index', async () => {
      const result = await clientRequestTelegramHandlers.handleUpdateClientFieldSelection(
        10, // Invalid index
        mockGroup,
        'Test Client (TEST_CLIENT)'
      );

      expect(result.error).toBe(true);
      expect(result.message).toContain('tidak valid');
    });
  });

  describe('handleUpdateClientValueInput', () => {
    const mockField = {
      key: 'client_type',
      label: 'Tipe Client'
    };

    it('should update client with new value', async () => {
      const mockUpdatedClient = {
        client_id: 'TEST_CLIENT',
        nama: 'Test Client',
        client_type: 'ORG',
        client_status: true
      };

      mockUpdateClient.mockResolvedValue(mockUpdatedClient);

      const result = await clientRequestTelegramHandlers.handleUpdateClientValueInput(
        'ORG',
        mockField,
        'TEST_CLIENT'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Update Berhasil');
      expect(result.message).toContain('TEST_CLIENT');
      expect(mockUpdateClient).toHaveBeenCalledWith('TEST_CLIENT', { client_type: 'ORG' });
    });

    it('should handle boolean values for status fields', async () => {
      const statusField = {
        key: 'client_status',
        label: 'Status Aktif'
      };

      const mockUpdatedClient = {
        client_id: 'TEST_CLIENT',
        nama: 'Test Client',
        client_status: true
      };

      mockUpdateClient.mockResolvedValue(mockUpdatedClient);

      const result = await clientRequestTelegramHandlers.handleUpdateClientValueInput(
        'true',
        statusField,
        'TEST_CLIENT'
      );

      expect(result.success).toBe(true);
      expect(mockUpdateClient).toHaveBeenCalledWith('TEST_CLIENT', { client_status: true });
    });

    it('should return error for invalid boolean value', async () => {
      const statusField = {
        key: 'client_status',
        label: 'Status Aktif'
      };

      const result = await clientRequestTelegramHandlers.handleUpdateClientValueInput(
        'maybe',
        statusField,
        'TEST_CLIENT'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('tidak valid');
    });

    it('should handle TikTok username and sync secUid', async () => {
      const tiktokField = {
        key: 'client_tiktok',
        label: 'Username TikTok'
      };

      const mockProfile = {
        username: 'testuser',
        secUid: 'MS4wLjABAAAAtest123'
      };

      mockNormalizeHandleValue.mockReturnValue('testuser');
      mockFetchTiktokProfile.mockResolvedValue(mockProfile);
      mockUpdateClient.mockResolvedValue({
        client_id: 'TEST_CLIENT',
        nama: 'Test Client',
        client_tiktok: 'testuser',
        tiktok_secuid: 'MS4wLjABAAAAtest123',
        client_status: true
      });

      const result = await clientRequestTelegramHandlers.handleUpdateClientValueInput(
        'testuser',
        tiktokField,
        'TEST_CLIENT'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('SecUID berhasil disinkronkan');
      expect(mockFetchTiktokProfile).toHaveBeenCalledWith('testuser');
      expect(mockUpdateClient).toHaveBeenCalledWith('TEST_CLIENT', {
        client_tiktok: 'testuser',
        tiktok_secuid: 'MS4wLjABAAAAtest123'
      });
    });

    it('should return error when client not found', async () => {
      mockUpdateClient.mockResolvedValue(null);

      const result = await clientRequestTelegramHandlers.handleUpdateClientValueInput(
        'ORG',
        mockField,
        'NONEXISTENT_CLIENT'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('tidak ditemukan');
    });
  });
});
