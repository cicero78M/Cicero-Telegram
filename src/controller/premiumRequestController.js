import * as premiumReqModel from '../model/premiumRequestModel.js';

export async function createPremiumRequest(req, res, next) {
  try {
    const body = { ...req.body, user_id: req.penmasUser?.user_id || req.user?.user_id };
    if (!body.user_id) {
      return res.status(400).json({ success: false, message: 'user_id wajib diisi' });
    }
    const row = await premiumReqModel.createRequest(body);
    res.status(201).json({ success: true, request: row });
  } catch (err) {
    next(err);
  }
}

export async function updatePremiumRequest(req, res, next) {
  try {
    const row = await premiumReqModel.updateRequest(Number(req.params.id), req.body);
    if (!row) return res.status(404).json({ success: false, message: 'not found' });
    res.json({ success: true, request: row });
  } catch (err) {
    next(err);
  }
}
