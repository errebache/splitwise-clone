const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    console.log('Validating request body:', req.body);
    const { error } = schema.validate(req.body);
    if (error) {
      console.log('Validation error details:', error.details);
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// Validation schemas
const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    full_name: Joi.string().min(2).max(100).required()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  createGroup: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional(),
    currency: Joi.string().length(3).default('EUR')
  }),

  updateGroup: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional(),
    currency: Joi.string().length(3).optional()
  }),

  createExpense: Joi.object({
    group_id: Joi.alternatives().try(
      Joi.number().integer().positive(), 
      Joi.string().pattern(/^\d+$/)
    ).required(),
    description: Joi.string().min(1).max(255).required(),
    amount: Joi.number().positive().required(),
    currency: Joi.string().length(3).required(),
    category: Joi.string().max(100).required(),
    date: Joi.alternatives().try(
      Joi.date(),
      Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
    ).required(),
    split_type: Joi.string().valid('equal', 'custom').default('equal'),
    paid_by: Joi.alternatives().try(
      Joi.number().integer().positive(), 
      Joi.string().pattern(/^\d+$/)
    ).required(),
    is_settled: Joi.boolean().optional(),
    participants: Joi.array().items(
      Joi.object({
        user_id: Joi.alternatives().try(
          Joi.number().integer().positive(), 
          Joi.string().pattern(/^\d+$/)
        ).required(),
        amount_owed: Joi.number().positive().required()
      })
    ).min(1).required()
  }),

  createPayment: Joi.object({
    amount: Joi.number().positive().required(),
    currency: Joi.string().length(3).required(),
    method: Joi.string().valid('paypal', 'card').required(),
    description: Joi.string().max(500).optional()
  }),

  createRefund: Joi.object({
    amount: Joi.number().positive().required(),
    currency: Joi.string().length(3).required(),
    reason: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional(),
    payment_id: Joi.number().integer().positive().optional()
  })
};

module.exports = { validateRequest, schemas };