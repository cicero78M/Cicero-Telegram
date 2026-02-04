// tests/handler/menu/clientRequestTelegramHandlers.updateClient.test.js

/**
 * Tests for client update functionality in clientRequestTelegramHandlers
 */

import { jest } from '@jest/globals';

// Mock the dependencies
const mockFindClientById = jest.fn();
const mockUpdateClient = jest.fn();
const mockGetClientSummary = jest.fn();
const mockRefreshAggregatorData = jest.fn();

jest.unstable_mockModule('../../../src/service/clientService.js', () => ({
  findClientById: mockFindClientById,
  updateClient: mockUpdateClient,
  getClientSummary: mockGetClientSummary,
}));

jest.unstable_mockModule('../../../src/service/aggregatorService.js', () => ({
  refreshAggregatorData: mockRefreshAggregatorData,
}));

jest.unstable_mockModule('../../../src/utils/utilsHelper.js', () => ({
  getGreeting: jest.fn(() => 'Selamat Pagi'),
  formatNama: jest.fn((name) => name),
}));

// Import the module under test after mocking
const { clientRequestTelegramHandlers } = await import('../../../src/handler/menu/clientRequestTelegramHandlers.js');

describe('clientRequestTelegramHandlers - Update Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleUpdateClientFieldSelection', () => {
    it('should show field selection menu with current values', async () => {
      const mockClient = {
        client_id: 'TEST_CLIENT',
        nama: 'Test Client Name',
        client_insta: 'test_instagram',
        client_tiktok: '@test_tiktok',
        client_group: 'TEST_GROUP',
        client_operator: '628123456789',
        client_super: '628987654321',
      };

      mockFindClientById.mockResolvedValue(mockClient);

      const result = await clientRequestTelegramHandlers.handleUpdateClientFieldSelection(
        'TEST_CLIENT',
        'Test Client Name (TEST_CLIENT)'
      );

      expect(mockFindClientById).toHaveBeenCalledWith('TEST_CLIENT');
      expect(result).toContain('Update Data Client');
      expect(result).toContain('Nama Client');
      expect(result).toContain('Test Client Name');
      expect(result).toContain('Instagram Username');
      expect(result).toContain('test_instagram');
      expect(result).toContain('TikTok Username');
      expect(result).toContain('@test_tiktok');
      expect(result).toContain('Client Group');
      expect(result).toContain('TEST_GROUP');
      expect(result).toContain('Client Operator');
      expect(result).toContain('628123456789');
    });

    it('should handle client not found', async () => {
      mockFindClientById.mockResolvedValue(null);

      const result = await clientRequestTelegramHandlers.handleUpdateClientFieldSelection(
        'NONEXISTENT_CLIENT',
        'Nonexistent Client'
      );

      expect(result).toContain('tidak ditemukan');
    });

    it('should show empty fields with dash', async () => {
      const mockClient = {
        client_id: 'TEST_CLIENT',
        nama: 'Test Client',
        client_insta: '',
        client_tiktok: null,
        client_group: '',
        client_operator: '',
        client_super: '',
      };

      mockFindClientById.mockResolvedValue(mockClient);

      const result = await clientRequestTelegramHandlers.handleUpdateClientFieldSelection(
        'TEST_CLIENT',
        'Test Client'
      );

      expect(result).toContain('Saat ini: -');
    });
  });

  describe('handleClientFieldUpdatePrompt', () => {
    it('should show prompt for updating nama field', () => {
      const result = clientRequestTelegramHandlers.handleClientFieldUpdatePrompt(
        '1',
        'Test Client (TEST_CLIENT)',
        'Current Name'
      );

      expect(result).toContain('Update Nama Client');
      expect(result).toContain('Test Client (TEST_CLIENT)');
      expect(result).toContain('Nilai saat ini: Current Name');
      expect(result).toContain('Masukkan nilai baru');
    });

    it('should show prompt for updating Instagram field', () => {
      const result = clientRequestTelegramHandlers.handleClientFieldUpdatePrompt(
        '2',
        'Test Client (TEST_CLIENT)',
        'test_insta'
      );

      expect(result).toContain('Update Instagram Username');
      expect(result).toContain('Nilai saat ini: test_insta');
    });

    it('should handle invalid field number', () => {
      const result = clientRequestTelegramHandlers.handleClientFieldUpdatePrompt(
        '99',
        'Test Client',
        'value'
      );

      expect(result).toContain('tidak valid');
    });
  });

  describe('processClientFieldUpdate', () => {
    it('should successfully update client name', async () => {
      const mockClient = {
        client_id: 'TEST_CLIENT',
        nama: 'Old Name',
      };

      const mockUpdatedClient = {
        ...mockClient,
        nama: 'New Name',
      };

      mockFindClientById.mockResolvedValue(mockClient);
      mockUpdateClient.mockResolvedValue(mockUpdatedClient);

      const result = await clientRequestTelegramHandlers.processClientFieldUpdate(
        'TEST_CLIENT',
        '1',
        'New Name'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Update Berhasil');
      expect(result.message).toContain('Nama Client');
      expect(result.message).toContain('New Name');
      expect(mockUpdateClient).toHaveBeenCalledWith('TEST_CLIENT', { nama: 'New Name' });
    });

    it('should successfully update Instagram username', async () => {
      const mockClient = {
        client_id: 'TEST_CLIENT',
        nama: 'Test Client',
        client_insta: 'old_username',
      };

      mockFindClientById.mockResolvedValue(mockClient);
      mockUpdateClient.mockResolvedValue({ ...mockClient, client_insta: 'new_username' });

      const result = await clientRequestTelegramHandlers.processClientFieldUpdate(
        'TEST_CLIENT',
        '2',
        'new_username'
      );

      expect(result.success).toBe(true);
      expect(mockUpdateClient).toHaveBeenCalledWith('TEST_CLIENT', { client_insta: 'new_username' });
    });

    it('should clear field when user inputs dash', async () => {
      const mockClient = {
        client_id: 'TEST_CLIENT',
        nama: 'Test Client',
        client_insta: 'old_username',
      };

      mockFindClientById.mockResolvedValue(mockClient);
      mockUpdateClient.mockResolvedValue({ ...mockClient, client_insta: '' });

      const result = await clientRequestTelegramHandlers.processClientFieldUpdate(
        'TEST_CLIENT',
        '2',
        '-'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('(kosong)');
      expect(mockUpdateClient).toHaveBeenCalledWith('TEST_CLIENT', { client_insta: '' });
    });

    it('should normalize WhatsApp number starting with 0', async () => {
      const mockClient = {
        client_id: 'TEST_CLIENT',
        nama: 'Test Client',
        client_operator: '',
      };

      mockFindClientById.mockResolvedValue(mockClient);
      mockUpdateClient.mockResolvedValue({ ...mockClient, client_operator: '628123456789' });

      const result = await clientRequestTelegramHandlers.processClientFieldUpdate(
        'TEST_CLIENT',
        '5',
        '08123456789'
      );

      expect(result.success).toBe(true);
      expect(mockUpdateClient).toHaveBeenCalledWith('TEST_CLIENT', { client_operator: '628123456789' });
    });

    it('should normalize WhatsApp number without country code', async () => {
      const mockClient = {
        client_id: 'TEST_CLIENT',
        nama: 'Test Client',
        client_operator: '',
      };

      mockFindClientById.mockResolvedValue(mockClient);
      mockUpdateClient.mockResolvedValue({ ...mockClient, client_operator: '628123456789' });

      const result = await clientRequestTelegramHandlers.processClientFieldUpdate(
        'TEST_CLIENT',
        '5',
        '8123456789'
      );

      expect(result.success).toBe(true);
      expect(mockUpdateClient).toHaveBeenCalledWith('TEST_CLIENT', { client_operator: '628123456789' });
    });

    it('should reject invalid WhatsApp number length', async () => {
      const mockClient = {
        client_id: 'TEST_CLIENT',
        nama: 'Test Client',
        client_operator: '',
      };

      mockFindClientById.mockResolvedValue(mockClient);

      const result = await clientRequestTelegramHandlers.processClientFieldUpdate(
        'TEST_CLIENT',
        '5',
        '123'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('tidak valid');
      expect(mockUpdateClient).not.toHaveBeenCalled();
    });

    it('should handle client not found', async () => {
      mockFindClientById.mockResolvedValue(null);

      const result = await clientRequestTelegramHandlers.processClientFieldUpdate(
        'NONEXISTENT_CLIENT',
        '1',
        'New Name'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('tidak ditemukan');
      expect(mockUpdateClient).not.toHaveBeenCalled();
    });

    it('should handle update failure', async () => {
      const mockClient = {
        client_id: 'TEST_CLIENT',
        nama: 'Test Client',
      };

      mockFindClientById.mockResolvedValue(mockClient);
      mockUpdateClient.mockResolvedValue(null);

      const result = await clientRequestTelegramHandlers.processClientFieldUpdate(
        'TEST_CLIENT',
        '1',
        'New Name'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Gagal mengupdate');
    });

    it('should handle invalid field number', async () => {
      const mockClient = {
        client_id: 'TEST_CLIENT',
        nama: 'Test Client',
      };

      mockFindClientById.mockResolvedValue(mockClient);

      const result = await clientRequestTelegramHandlers.processClientFieldUpdate(
        'TEST_CLIENT',
        '99',
        'New Value'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('tidak valid');
      expect(mockUpdateClient).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockFindClientById.mockRejectedValue(new Error('Database connection failed'));

      const result = await clientRequestTelegramHandlers.processClientFieldUpdate(
        'TEST_CLIENT',
        '1',
        'New Name'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('kesalahan');
      expect(result.message).toContain('Database connection failed');
    });
  });
});
