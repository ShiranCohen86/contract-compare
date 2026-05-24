const Joi = require('joi');

const mongoId = Joi.string().hex().length(24);

exports.create = {
  params: Joi.object({ contractId: mongoId.required() }),
  body: Joi.object({
    title:    Joi.string().trim().max(200).allow('', null),
    content:  Joi.string().min(1).max(20000).required(),
    position: Joi.number().integer().min(0),
  }),
};

exports.update = {
  params: Joi.object({ id: mongoId.required() }),
  body: Joi.object({
    title:   Joi.string().trim().max(200).allow('', null),
    content: Joi.string().min(1).max(20000),
  }).min(1),
};

exports.delete = {
  params: Joi.object({ id: mongoId.required() }),
};

exports.reorder = {
  params: Joi.object({ contractId: mongoId.required() }),
  body: Joi.object({
    order: Joi.array().items(mongoId).min(1).required(),
  }),
};
