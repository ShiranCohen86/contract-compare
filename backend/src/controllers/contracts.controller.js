const asyncHandler = require('../utils/asyncHandler');
const contractService = require('../services/contract.service');

exports.list = asyncHandler(async (req, res) => {
  const result = await contractService.listForUser(req.user.id, req.query);
  res.json(result);
});

exports.create = asyncHandler(async (req, res) => {
  const contract = await contractService.create(req.user.id, req.body);
  res.status(201).json(contract);
});

exports.getById = asyncHandler(async (req, res) => {
  const contract = await contractService.getById(req.params.id, req.user.id);
  res.json(contract);
});

exports.update = asyncHandler(async (req, res) => {
  const contract = await contractService.update(req.params.id, req.user.id, req.body);
  res.json(contract);
});

exports.remove = asyncHandler(async (req, res) => {
  await contractService.remove(req.params.id, req.user.id);
  res.json({ ok: true });
});

exports.leave = asyncHandler(async (req, res) => {
  await contractService.leave(req.params.id, req.user.id);
  res.json({ ok: true });
});

exports.cancel = asyncHandler(async (req, res) => {
  const contract = await contractService.cancel(req.params.id, req.user.id, req.body.reason);
  res.json(contract);
});
