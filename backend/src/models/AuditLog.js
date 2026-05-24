const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    action:     { type: String, required: true, index: true },
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', index: true },
    ip:         String,
    userAgent:  String,
    meta:       { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

AuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
