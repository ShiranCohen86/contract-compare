const asyncHandler = require('../utils/asyncHandler');
const approvalService = require('../services/approval.service');

function clientIp(req) {
  return (req.ip || '').replace(/^::ffff:/, '');
}

exports.list = asyncHandler(async (req, res) => {
  const approvals = await approvalService.list(req.params.contractId, req.user.id);
  res.json({ items: approvals });
});

exports.approve = asyncHandler(async (req, res) => {
  const result = await approvalService.submit(req.params.contractId, req.user.id, {
    comment:   req.body.comment,
    ipAddress: clientIp(req),
    userAgent: req.headers['user-agent'] || '',
  });
  res.json(result);
});
