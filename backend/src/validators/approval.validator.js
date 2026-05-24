const Joi = require('joi');

const mongoId = Joi.string().hex().length(24);

exports.submit = {
  params: Joi.object({ contractId: mongoId.required() }),
  body: Joi.object({
    comment: Joi.string().trim().max(500).allow('', null),
  }),
};

exports.byContractId = {
  params: Joi.object({ contractId: mongoId.required() }),
};
