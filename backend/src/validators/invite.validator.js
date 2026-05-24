const Joi = require('joi');

const mongoId = Joi.string().hex().length(24);
const email = Joi.string().email({ tlds: { allow: false } }).lowercase().trim();

exports.send = {
  params: Joi.object({ contractId: mongoId.required() }),
  body: Joi.object({
    email: email.required(),
    role:  Joi.string().valid('COUNTERPARTY', 'OBSERVER').default('COUNTERPARTY'),
  }),
};

exports.byToken = {
  params: Joi.object({ token: Joi.string().length(21).required() }),
};
