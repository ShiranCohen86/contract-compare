const mongoose = require('mongoose');

const CHANGE_TYPES   = ['ADD', 'EDIT', 'DELETE'];
const CHANGE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'];

const ClauseChangeSchema = new mongoose.Schema(
  {
    contractId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true, index: true },
    clauseId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Clause',   required: true, index: true },
    proposedById:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
    changeType:      { type: String, enum: CHANGE_TYPES,   required: true },
    previousContent: { type: String },
    newContent:      { type: String },
    previousTitle:   { type: String },
    newTitle:        { type: String },
    status:          { type: String, enum: CHANGE_STATUSES, default: 'PENDING', index: true },
    respondedById:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    respondedAt:     Date,
    rejectReason:    String,
  },
  { timestamps: true },
);

ClauseChangeSchema.statics.TYPES    = CHANGE_TYPES;
ClauseChangeSchema.statics.STATUSES = CHANGE_STATUSES;

ClauseChangeSchema.index({ contractId: 1, status: 1 });

module.exports = mongoose.model('ClauseChange', ClauseChangeSchema);
