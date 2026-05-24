const mongoose = require('mongoose');

const CONTRACT_STATUSES = [
  'DRAFT',            // Party A filling the contract (before inviting Party B)
  'AWAITING_REVIEW',  // Party B invited, can approve directly or propose changes
  'NEGOTIATING',      // Party B proposed changes, active negotiation
  'PENDING_FINAL',    // All changes approved, awaiting final approval from all parties
  'APPROVED',         // All parties gave final approval
  'EXPORTED',         // Exported to PDF/DOCX
  'CANCELLED',        // Cancelled by owner before approval
];

const DEFAULT_SETTINGS = {
  addRequiresApproval:    false,
  editRequiresApproval:   true,
  deleteRequiresApproval: true,
  finalApprovalRequired:  true,
};

const ParticipantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role:   { type: String, enum: ['OWNER', 'COUNTERPARTY', 'OBSERVER'], default: 'COUNTERPARTY' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const SnapshotSchema = new mongoose.Schema(
  {
    clauses:    { type: mongoose.Schema.Types.Mixed, required: true },
    approvedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ContractSchema = new mongoose.Schema(
  {
    title:        { type: String, required: true, trim: true },
    description:  { type: String, trim: true },
    status:       { type: String, enum: CONTRACT_STATUSES, default: 'DRAFT', index: true },
    ownerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    participants: { type: [ParticipantSchema], default: [] },
    settings:     { type: mongoose.Schema.Types.Mixed, default: DEFAULT_SETTINGS },
    snapshot:     SnapshotSchema,
    expiresAt:    { type: Date },
    cancelReason: { type: String },
  },
  { timestamps: true },
);

ContractSchema.statics.STATUSES = CONTRACT_STATUSES;
ContractSchema.statics.DEFAULT_SETTINGS = DEFAULT_SETTINGS;

ContractSchema.index({ ownerId: 1, status: 1 });
ContractSchema.index({ 'participants.userId': 1 });

module.exports = mongoose.model('Contract', ContractSchema);
