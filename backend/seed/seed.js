/**
 * Seed script for ContractOS.
 *
 * Usage:
 *   CLI:             npm run seed
 *   Programmatic:    require('./seed/seed').seedIfEmpty()
 *
 * Creates 2 demo users + 1 demo contract with clauses in NEGOTIATING state.
 */
/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../src/config/env');
const { User, Contract, Clause, ClauseChange } = require('../src/models');

async function clearAll() {
  await Promise.all([
    User.deleteMany({}),
    Contract.deleteMany({}),
    Clause.deleteMany({}),
    ClauseChange.deleteMany({}),
  ]);
}

async function runSeed({ clearFirst = true } = {}) {
  if (clearFirst) await clearAll();

  // ── Users ──────────────────────────────────────────────────────────────────
  const userA = new User({ name: 'עורך דין א\'', email: 'party-a@demo.com', isActive: true });
  await userA.setPassword('demo1234');
  await userA.save();

  const userB = new User({ name: 'עורך דין ב\'', email: 'party-b@demo.com', isActive: true });
  await userB.setPassword('demo1234');
  await userB.save();

  // ── Contract ───────────────────────────────────────────────────────────────
  const contract = await Contract.create({
    title:       'הסכם סודיות (NDA) — DEMO',
    description: 'הסכם לדוגמה למטרות פיתוח',
    status:      'NEGOTIATING',
    ownerId:     userA._id,
    participants: [
      { userId: userA._id, role: 'OWNER',        joinedAt: new Date() },
      { userId: userB._id, role: 'COUNTERPARTY', joinedAt: new Date() },
    ],
    settings: {
      addRequiresApproval:    false,
      editRequiresApproval:   true,
      deleteRequiresApproval: true,
      finalApprovalRequired:  true,
    },
  });

  // ── Clauses ────────────────────────────────────────────────────────────────
  const clauseData = [
    {
      title:    'הגדרות',
      content:  '"מידע סודי" פירושו כל מידע עסקי, טכני, פיננסי או אחר שנמסר בין הצדדים.',
      position: 1,
      status:   'ACTIVE',
    },
    {
      title:    'התחייבות לסודיות',
      content:  'כל צד מתחייב לשמור בסוד את כל המידע הסודי שיתקבל מהצד השני.',
      position: 2,
      status:   'ACTIVE',
    },
    {
      title:    'תקופת ההסכם',
      content:  'הסכם זה יהיה בתוקף לתקופה של שנתיים מיום חתימתו.',
      position: 3,
      status:   'ACTIVE',
    },
    {
      title:    'סייגים לסודיות',
      content:  'הסכם זה לא יחול על מידע שהיה ידוע לצד המקבל לפני קבלתו.',
      position: 4,
      status:   'PENDING_ADD',
    },
  ];

  const clauses = await Promise.all(
    clauseData.map((d) => Clause.create({ contractId: contract._id, addedById: userB._id, ...d })),
  );

  // ── Pending change (EDIT) ──────────────────────────────────────────────────
  await ClauseChange.create({
    contractId:      contract._id,
    clauseId:        clauses[1]._id,
    proposedById:    userB._id,
    changeType:      'EDIT',
    previousContent: clauseData[1].content,
    newContent:      'כל צד מתחייב לשמור בסוד את כל המידע הסודי שיתקבל מהצד השני ולא לגלותו לצד שלישי כלשהו ללא אישור מראש ובכתב.',
    status:          'PENDING',
  });

  // ── Pending change (ADD) ───────────────────────────────────────────────────
  await ClauseChange.create({
    contractId:   contract._id,
    clauseId:     clauses[3]._id,
    proposedById: userB._id,
    changeType:   'ADD',
    newContent:   clauseData[3].content,
    status:       'PENDING',
  });

  console.log('✅ Seed complete!');
  console.log('   Party A: party-a@demo.com / demo1234');
  console.log('   Party B: party-b@demo.com / demo1234');

  return true;
}

async function seedIfEmpty() {
  const count = await User.countDocuments();
  if (count > 0) return false;
  await runSeed({ clearFirst: false });
  return true;
}

// ── CLI entry point ────────────────────────────────────────────────────────────
if (require.main === module) {
  mongoose
    .connect(env.MONGO_URI)
    .then(() => runSeed())
    .then(() => mongoose.disconnect())
    .catch((err) => {
      console.error('Seed failed:', err.message);
      process.exit(1);
    });
}

module.exports = { runSeed, seedIfEmpty };
