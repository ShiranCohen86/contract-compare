const Joi = require('joi');

const mongoId = Joi.string().hex().length(24);

exports.reject = {
  params: Joi.object({ id: mongoId.required() }),
  body: Joi.object({
    reason: Joi.string().trim().max(500).allow('', null),
  }),
};

exports.byId = {
  params: Joi.object({ id: mongoId.required() }),
};
