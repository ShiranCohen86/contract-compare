const router = require('express').Router();
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const clausesController = require('../controllers/clauses.controller');
const clauseValidator = require('../validators/clause.validator');

router.use(authenticate);

// List clauses for a contract
router.get('/contract/:contractId', clausesController.listByContract);

// Reorder clauses
router.patch('/contract/:contractId/reorder', validate(clauseValidator.reorder), clausesController.reorder);

// Add clause to contract (may create a ClauseChange depending on settings)
router.post('/contract/:contractId', validate(clauseValidator.create), clausesController.create);

// Edit / delete a specific clause (always creates a ClauseChange)
router.patch('/:id', validate(clauseValidator.update), clausesController.update);
router.delete('/:id', validate(clauseValidator.delete), clausesController.remove);

module.exports = router;
