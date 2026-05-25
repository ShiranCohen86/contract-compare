const mongoose = require('mongoose');

const NOTIF_TYPES = [
  'CLAUSE_ADDED',
  'CHANGE_PROPOSED',
  'CHANGE_APPROVED',
  'CHANGE_REJECTED',
  'CHANGE_WITHDRAWN',
  'FINAL_APPROVAL_READY',
  'PARTNER_APPROVED',
  'CONTRACT_APPROVED',
  'INVITE_ACCEPTED',
];

const NotificationSchema = new mongoose.Schema(
  {
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true, index: true },
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true, index: true },
    type:       { type: String, enum: NOTIF_TYPES, required: true, index: true },
    title:      { type: String, required: true },
    body:       String,
    isRead:     { type: Boolean, default: false, index: true },
    actionUrl:  String,
    metadata:   { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

NotificationSchema.statics.TYPES = NOTIF_TYPES;
NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 }); // notification feed sorted by time
NotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
