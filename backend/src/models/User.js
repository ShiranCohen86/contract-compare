const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

const SessionSchema = new mongoose.Schema(
  {
    jtiHash:   { type: String, required: true },
    userAgent: String,
    ip:        String,
    lastSeen:  { type: Date, default: Date.now },
  },
  { _id: false },
);

const UserSchema = new mongoose.Schema(
  {
    name:                 { type: String, required: true, trim: true },
    email:                { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash:         { type: String, select: false },
    isActive:             { type: Boolean, default: true },
    isAdmin:              { type: Boolean, default: false },
    passwordResetToken:   { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    lastLogin:            Date,
    sessions:             { type: [SessionSchema], default: [] },
    deletedAt:            { type: Date, select: false },
  },
  { timestamps: true },
);

UserSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
};

UserSchema.methods.verifyPassword = function verifyPassword(plain) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plain, this.passwordHash);
};

UserSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ virtuals: true });
  delete obj.passwordHash;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.sessions;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
