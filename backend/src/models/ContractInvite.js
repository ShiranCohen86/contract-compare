const mongoose = require('mongoose');

const INVITE_STATUSES = ['PENDING', 'ACCEPTED', 'EXPIRED'];

const ContractInviteSchema = new mongoose.Schema(
  {
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true, index: true },
    email:      { type: String, required: true, lowercase: true, trim: true },
    token:      { type: String, required: true, unique: true, index: true },
    role:       { type: String, enum: ['COUNTERPARTY', 'OBSERVER'], default: 'COUNTERPARTY' },
    status:     { type: String, enum: INVITE_STATUSES, default: 'PENDING', index: true },
    expiresAt:  { type: Date, required: true },
    invitedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

ContractInviteSchema.statics.STATUSES = INVITE_STATUSES;

module.exports = mongoose.model('ContractInvite', ContractInviteSchema);
