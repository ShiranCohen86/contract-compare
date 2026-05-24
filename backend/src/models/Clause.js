const mongoose = require('mongoose');

const CLAUSE_STATUSES = [
  'ACTIVE',          // Active clause in the contract
  'PENDING_ADD',     // Added, awaiting approval from other party
  'PENDING_DELETE',  // Deletion requested, awaiting approval
  'DELETED',         // Soft-deleted
];

const ClauseSchema = new mongoose.Schema(
  {
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true, index: true },
    title:      { type: String, trim: true },
    content:    { type: String, required: true },
    position:   { type: Number, required: true },
    status:     { type: String, enum: CLAUSE_STATUSES, default: 'ACTIVE', index: true },
    addedById:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

ClauseSchema.statics.STATUSES = CLAUSE_STATUSES;
ClauseSchema.index({ contractId: 1, position: 1 });
ClauseSchema.index({ contractId: 1, status: 1 });

module.exports = mongoose.model('Clause', ClauseSchema);
