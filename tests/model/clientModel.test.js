import { jest } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('../../src/repository/db.js', () => ({
  query: mockQuery,
}));

let findBySuperAdmin;
let updateClientStatus;

beforeAll(async () => {
  ({ findBySuperAdmin, updateClientStatus } = await import('../../src/model/clientModel.js'));
});

beforeEach(() => {
  mockQuery.mockReset();
});

describe('findBySuperAdmin', () => {
  test('matches numbers within comma separated list', async () => {
    const row = {
      client_id: 'client-1',
      client_super: '628123450000, 628999888777',
    };
    mockQuery.mockResolvedValueOnce({ rows: [row] });

    const result = await findBySuperAdmin('628999888777');

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("client_super ~ ('(^|\\\\D)' || $1 || '(\\\\D|$)')");
    expect(params).toEqual(['628999888777', '08999888777']);
    expect(result).toEqual(row);
  });

  test('returns null when query yields no rows', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await findBySuperAdmin('+62 812-3456-7890');

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });
});

describe('updateClientStatus', () => {
  test('successfully updates client status to true', async () => {
    const mockClient = {
      client_id: 'TEST_CLIENT',
      nama: 'Test Client',
      client_status: true,
      client_type: 'ORG',
    };
    mockQuery.mockResolvedValueOnce({ rows: [mockClient] });

    const result = await updateClientStatus('TEST_CLIENT', true);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('UPDATE clients SET client_status = $1');
    expect(sql).toContain('WHERE LOWER(client_id) = LOWER($2)');
    expect(params).toEqual([true, 'TEST_CLIENT']);
    expect(result).toEqual(mockClient);
  });

  test('successfully updates client status to false', async () => {
    const mockClient = {
      client_id: 'TEST_CLIENT',
      nama: 'Test Client',
      client_status: false,
      client_type: 'ORG',
    };
    mockQuery.mockResolvedValueOnce({ rows: [mockClient] });

    const result = await updateClientStatus('TEST_CLIENT', false);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(params).toEqual([false, 'TEST_CLIENT']);
    expect(result).toEqual(mockClient);
  });

  test('returns null when client is not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await updateClientStatus('NON_EXISTENT', true);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });

  test('handles database errors gracefully', async () => {
    const error = new Error('Database connection failed');
    mockQuery.mockRejectedValueOnce(error);

    await expect(updateClientStatus('TEST_CLIENT', true)).rejects.toThrow(
      'Failed to update client status: Database connection failed'
    );

    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test('is case-insensitive for client_id', async () => {
    const mockClient = {
      client_id: 'TEST_CLIENT',
      nama: 'Test Client',
      client_status: true,
    };
    mockQuery.mockResolvedValueOnce({ rows: [mockClient] });

    const result = await updateClientStatus('test_client', true);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(params).toEqual([true, 'test_client']);
    expect(result).toEqual(mockClient);
  });
});
