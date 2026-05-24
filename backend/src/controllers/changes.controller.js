const asyncHandler = require('../utils/asyncHandler');
const changeService = require('../services/change.service');

exports.listByContract = asyncHandler(async (req, res) => {
  const result = await changeService.listByContract(req.params.contractId, req.user.id, req.query);
  res.json(result);
});

exports.approve = asyncHandler(async (req, res) => {
  const change = await changeService.approve(req.params.id, req.user.id);
  res.json(change);
});

exports.reject = asyncHandler(async (req, res) => {
  const change = await changeService.reject(req.params.id, req.user.id, req.body.reason);
  res.json(change);
});

exports.withdraw = asyncHandler(async (req, res) => {
  const change = await changeService.withdraw(req.params.id, req.user.id);
  res.json(change);
});
