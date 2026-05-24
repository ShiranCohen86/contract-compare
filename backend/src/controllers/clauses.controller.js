const asyncHandler = require('../utils/asyncHandler');
const clauseService = require('../services/clause.service');

exports.listByContract = asyncHandler(async (req, res) => {
  const clauses = await clauseService.listByContract(req.params.contractId, req.user.id);
  res.json({ items: clauses });
});

exports.create = asyncHandler(async (req, res) => {
  const result = await clauseService.create(req.params.contractId, req.user.id, req.body);
  res.status(201).json(result);
});

exports.update = asyncHandler(async (req, res) => {
  const result = await clauseService.update(req.params.id, req.user.id, req.body);
  res.json(result);
});

exports.remove = asyncHandler(async (req, res) => {
  const result = await clauseService.remove(req.params.id, req.user.id);
  res.json(result);
});

exports.reorder = asyncHandler(async (req, res) => {
  const clauses = await clauseService.reorder(req.params.contractId, req.user.id, req.body.order);
  res.json({ items: clauses });
});
