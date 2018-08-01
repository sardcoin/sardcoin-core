const Joi = require('joi');

const createCouponSchema = {
    query: {},
    body: {
        title:          Joi.string().allow('').min(5).max(50).required(),
        description:    Joi.string().min(5).max(255).allow(null),
        price:          Joi.number().required(),
        valid_from:     Joi.number(),
        valid_until:    Joi.number().allow(null),
        state:          Joi.number().integer(),
        constraints:    Joi.string().allow(null),
        owner:          Joi.number().integer().required(),
        consumer:       Joi.number().integer().allow(null)
    },
    params: {}
};

module.exports = {
    createCouponSchema
};