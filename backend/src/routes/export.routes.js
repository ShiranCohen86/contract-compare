const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const exportController = require('../controllers/export.controller');

// PDF/DOCX generation is expensive (Puppeteer). Limit to 10 exports per 10 minutes per IP.
const exportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many export requests. Please wait before trying again.' },
});

router.use(authenticate);

router.post('/:contractId/pdf',  exportLimiter, exportController.pdf);
router.post('/:contractId/docx', exportLimiter, exportController.docx);

module.exports = router;
