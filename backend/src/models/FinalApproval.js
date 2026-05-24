const mongoose = require('mongoose');

const FinalApprovalSchema = new mongoose.Schema(
  {
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true, index: true },
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
    approved:   { type: Boolean, required: true },
    comment:    String,
    ipAddress:  { type: String },
    userAgent:  String,
  },
  { timestamps: true },
);

// One approval record per user per contract
FinalApprovalSchema.index({ contractId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('FinalApproval', FinalApprovalSchema);
