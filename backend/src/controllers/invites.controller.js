const asyncHandler = require('../utils/asyncHandler');
const inviteService = require('../services/invite.service');

exports.send = asyncHandler(async (req, res) => {
  const invite = await inviteService.send(req.params.contractId, req.user.id, req.body.email, req.body.role);
  res.status(201).json(invite);
});

exports.getByToken = asyncHandler(async (req, res) => {
  const invite = await inviteService.getByToken(req.params.token);
  res.json(invite);
});

exports.accept = asyncHandler(async (req, res) => {
  const contract = await inviteService.accept(req.params.token, req.user.id);
  res.json(contract);
});
