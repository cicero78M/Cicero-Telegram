import * as dashboardUserModel from '../model/dashboardUserModel.js';
import { sendSuccess } from '../utils/response.js';

export async function approveDashboardUser(req, res, next) {
  try {
    if (req.dashboardUser.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { id } = req.params;
    const usr = await dashboardUserModel.findById(id);
    if (!usr) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const updated = await dashboardUserModel.updateStatus(id, true);
    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function rejectDashboardUser(req, res, next) {
  try {
    if (req.dashboardUser.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { id } = req.params;
    const usr = await dashboardUserModel.findById(id);
    if (!usr) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const updated = await dashboardUserModel.updateStatus(id, false);
    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}
