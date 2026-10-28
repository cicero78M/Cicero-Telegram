import { jest } from '@jest/globals';
const approved = jest.fn().mockResolvedValue([]);
jest.unstable_mockModule('../src/model/telegramMenuAccessModel.js', () => ({ findApprovedClients: approved }));
const { oprRequestHandlers: handlers } = await import('../src/handler/menu/oprRequestHandlers.js');
const old = process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED;
let session, wa, pool, model;
beforeEach(() => {
  jest.clearAllMocks(); process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED = 'true';
  session = { selected_client_id: 'KEDIRI', opr_clients: [{ client_id: 'KEDIRI' }] };
  wa = { sendMessage: jest.fn() };
  pool = { query: jest.fn().mockResolvedValue({ rows: [{ client_id: 'KEDIRI', client_status: true, client_type: 'org' }] }) };
  model = { findUserById: jest.fn(), setKediriAmplifierMembership: jest.fn() };
});
afterAll(() => { if (old === undefined) delete process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED; else process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED = old; });

test('authorized flow only changes amplifier role on same tenant', async () => {
  model.findUserById.mockResolvedValue({ user_id: '1', nama: 'A', client_id: 'KEDIRI' });
  await handlers.kelolaUser_menu(session, 'chat', '7', wa, pool, model);
  expect(session.step).toBe('amplifierRole_nrp');
  await handlers.amplifierRole_nrp(session, 'chat', '1', wa, pool, model);
  await handlers.amplifierRole_action(session, 'chat', '1', wa, pool, model);
  expect(model.setKediriAmplifierMembership).toHaveBeenCalledWith('1', 'KEDIRI', true);
});

test('rejects another tenant and revoked authorization', async () => {
  model.findUserById.mockResolvedValue({ user_id: '1', client_id: 'OTHER' });
  session.amplifier_client_id = 'KEDIRI';
  await handlers.amplifierRole_nrp(session, 'chat', '1', wa, pool, model);
  expect(session.amplifier_user_id).toBeUndefined();
  session.amplifier_user_id = '1'; session.opr_clients = [];
  await handlers.amplifierRole_action(session, 'chat', '2', wa, pool, model);
  expect(model.setKediriAmplifierMembership).not.toHaveBeenCalled();
});

test('legacy role removal cannot remove amplifier by accident', async () => {
  session.updateStatusRoles = ['operator', 'amplifier']; session.updateStatusNRP = '1';
  model.deactivateRoleOrUser = jest.fn();
  await handlers.updateStatus_chooseRole(session, 'chat', '2', wa, pool, model);
  expect(model.deactivateRoleOrUser).not.toHaveBeenCalled();
  expect(wa.sendMessage).toHaveBeenCalledWith('chat', expect.stringContaining('Kelola role amplifier'));
});

test('dedicated revoke keeps other roles untouched', async () => {
  session.amplifier_client_id = 'KEDIRI'; session.amplifier_user_id = '1';
  await handlers.amplifierRole_action(session, 'chat', '2', wa, pool, model);
  expect(model.setKediriAmplifierMembership).toHaveBeenCalledWith('1', 'KEDIRI', false);
});

test('legacy menu still permits explicit operator removal for a dual-role user', async () => {
  session.updateStatusRoles = ['operator', 'amplifier']; session.updateStatusNRP = '1';
  model.deactivateRoleOrUser = jest.fn().mockResolvedValue({ user_id: '1', status: true });
  model.getUserRoles = jest.fn().mockResolvedValue(['amplifier']);
  await handlers.updateStatus_chooseRole(session, 'chat', '1', wa, pool, model);
  expect(model.deactivateRoleOrUser).toHaveBeenCalledWith('1', 'operator');
});
