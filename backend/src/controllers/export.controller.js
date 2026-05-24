const asyncHandler = require('../utils/asyncHandler');
const exportService = require('../services/export.service');

exports.pdf = asyncHandler(async (req, res) => {
  const { buffer, filename } = await exportService.generatePdf(req.params.contractId, req.user.id, req.body);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

exports.docx = asyncHandler(async (req, res) => {
  const { buffer, filename } = await exportService.generateDocx(req.params.contractId, req.user.id, req.body);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});
