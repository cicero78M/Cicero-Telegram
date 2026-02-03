import { jest } from '@jest/globals';

const mockFindById = jest.fn();
const mockUpdateStatus = jest.fn();

jest.unstable_mockModule('../src/model/dashboardUserModel.js', () => ({
  findById: mockFindById,
  updateStatus: mockUpdateStatus
}));

jest.unstable_mockModule('../src/utils/phoneHelper.js', () => ({
  formatToWhatsAppId: (num) => num,
}));

let controller;

beforeAll(async () => {
  controller = await import('../src/controller/dashboardUserController.js');
});

beforeEach(() => {
  mockFindById.mockReset();
  mockUpdateStatus.mockReset();
});

test('approveDashboardUser sends approval message', async () => {
  mockFindById.mockResolvedValue({ dashboard_user_id: '1', username: 'user', whatsapp: '0812' });
  mockUpdateStatus.mockResolvedValue({ dashboard_user_id: '1', status: true });

  const req = { dashboardUser: { role: 'admin' }, params: { id: '1' } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();

  await controller.approveDashboardUser(req, res, next);

  expect(mockUpdateStatus).toHaveBeenCalledWith('1', true);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ success: true, data: { dashboard_user_id: '1', status: true } });
});

test('rejectDashboardUser sends rejection message', async () => {
  mockFindById.mockResolvedValue({ dashboard_user_id: '1', username: 'user', whatsapp: '0812' });
  mockUpdateStatus.mockResolvedValue({ dashboard_user_id: '1', status: false });

  const req = { dashboardUser: { role: 'admin' }, params: { id: '1' } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();

  await controller.rejectDashboardUser(req, res, next);

  expect(mockUpdateStatus).toHaveBeenCalledWith('1', false);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ success: true, data: { dashboard_user_id: '1', status: false } });
});
