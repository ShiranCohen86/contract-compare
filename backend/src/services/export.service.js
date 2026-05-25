const Contract = require('../models/Contract');
const Clause = require('../models/Clause');
const ApiError = require('../utils/ApiError');
const { assertParticipant } = require('./contract.service');

function sanitizeFilename(title) {
  return title.replace(/[^a-zA-Z0-9א-ת\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 60);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function getContractWithClauses(contractId, userId) {
  const contract = await Contract.findById(contractId).populate('ownerId', 'name email');
  if (!contract) throw ApiError.notFound('Contract not found');
  assertParticipant(contract, userId);

  if (!['APPROVED', 'EXPORTED'].includes(contract.status)) {
    throw ApiError.badRequest('Contract must be APPROVED before export');
  }

  // Prefer snapshot clauses (immutable) when available
  const clauses = contract.snapshot?.clauses
    ?? await Clause.find({ contractId, status: 'ACTIVE' }).sort({ position: 1 }).lean();

  return { contract, clauses };
}

async function generatePdf(contractId, userId, design = {}) {
  const { contract, clauses } = await getContractWithClauses(contractId, userId);

  // Lazy-require puppeteer so the server still starts without it installed
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    throw ApiError.internal('PDF generation not available — puppeteer not installed');
  }

  const html = buildHtml(contract, clauses, design);
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const buffer = await page.pdf({
    format: 'A4',
    margin: { top: '2cm', bottom: '2cm', left: '2.5cm', right: '2.5cm' },
    printBackground: true,
  });
  await browser.close();

  // Mark as exported
  if (contract.status === 'APPROVED') {
    await Contract.updateOne({ _id: contractId }, { $set: { status: 'EXPORTED' } });
  }

  return { buffer, filename: `${sanitizeFilename(contract.title)}.pdf` };
}

async function generateDocx(contractId, userId, design = {}) {
  const { contract, clauses } = await getContractWithClauses(contractId, userId);

  let docx;
  try {
    docx = require('docx');
  } catch {
    throw ApiError.internal('DOCX generation not available — docx not installed');
  }

  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

  const children = [
    new Paragraph({
      text:     design.title || contract.title,
      heading:  HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: '' }),
    ...clauses.flatMap((clause) => [
      new Paragraph({
        children: [
          new TextRun({ text: `${clause.position}. ${clause.title || ''}`, bold: true }),
        ],
      }),
      new Paragraph({ text: stripHtml(clause.content) }),
      new Paragraph({ text: '' }),
    ]),
  ];

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const buffer = await Packer.toBuffer(doc);

  if (contract.status === 'APPROVED') {
    await Contract.updateOne({ _id: contractId }, { $set: { status: 'EXPORTED' } });
  }

  return { buffer, filename: `${sanitizeFilename(contract.title)}.docx` };
}

function stripHtml(html) {
  return String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildHtml(contract, clauses, design) {
  const title    = escapeHtml(design.title || contract.title);
  const font     = escapeHtml(design.font || 'Arial');
  const fontSize = parseInt(design.fontSize, 10) || 12;

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: '${font}', sans-serif; font-size: ${fontSize}pt; color: #111; direction: rtl; }
  h1   { text-align: center; margin-bottom: 2em; font-size: ${fontSize + 6}pt; }
  .clause { margin-bottom: 1.8em; page-break-inside: avoid; }
  .clause-num { font-weight: bold; margin-bottom: .3em; }
  .clause-body { line-height: 1.7; }
  .clause-body p  { margin: 0 0 .5em; }
  .clause-body ul, .clause-body ol { padding-right: 1.2em; margin: .4em 0; }
  .clause-body h2 { font-size: ${fontSize + 2}pt; font-weight: bold; margin: .6em 0 .3em; }
  .clause-body h3 { font-size: ${fontSize + 1}pt; font-weight: 600; margin: .5em 0 .2em; }
</style>
</head>
<body>
  <h1>${title}</h1>
  ${clauses.map((c) => `
    <div class="clause">
      <p class="clause-num">${escapeHtml(String(c.position) + '. ' + (c.title || ''))}</p>
      <div class="clause-body">${c.content || ''}</div>
    </div>
  `).join('')}
</body>
</html>`;
}

module.exports = { generatePdf, generateDocx };
