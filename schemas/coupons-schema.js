const Joi = require('joi');

const createCouponSchema = {
    query: {},
    body: {
        title:          Joi.string().alphanum().min(5).max(50).required(),
        description:    Joi.string().alphanum().max(255),
        price:          Joi.number().integer().required(),
        valid_from:     Joi.number(),
        valid_until:    Joi.number(),
        state:          Joi.number().integer(),
        constraints:    Joi.string().alphanum().max(255),
        owner:          Joi.number().integer().required(),
        consumer:       Joi.number().integer()
    },
    params: {}
};

module.exports = {
    createCouponSchema
};