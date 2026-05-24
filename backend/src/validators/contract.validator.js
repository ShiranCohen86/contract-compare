const Joi = require('joi');

const mongoId = Joi.string().hex().length(24);

exports.create = {
  body: Joi.object({
    title:       Joi.string().trim().min(2).max(200).required(),
    description: Joi.string().trim().max(1000).allow('', null),
    expiresAt:   Joi.date().iso().min('now'),
    settings: Joi.object({
      addRequiresApproval:    Joi.boolean(),
      editRequiresApproval:   Joi.boolean(),
      deleteRequiresApproval: Joi.boolean(),
      finalApprovalRequired:  Joi.boolean(),
    }),
  }),
};

exports.update = {
  params: Joi.object({ id: mongoId.required() }),
  body: Joi.object({
    title:       Joi.string().trim().min(2).max(200),
    description: Joi.string().trim().max(1000).allow('', null),
    expiresAt:   Joi.date().iso().allow(null),
    settings: Joi.object({
      addRequiresApproval:    Joi.boolean(),
      editRequiresApproval:   Joi.boolean(),
      deleteRequiresApproval: Joi.boolean(),
      finalApprovalRequired:  Joi.boolean(),
    }),
  }).min(1),
};

exports.cancel = {
  params: Joi.object({ id: mongoId.required() }),
  body: Joi.object({
    reason: Joi.string().trim().max(500).allow('', null),
  }),
};

exports.getById = {
  params: Joi.object({ id: mongoId.required() }),
};

exports.delete = {
  params: Joi.object({ id: mongoId.required() }),
};
