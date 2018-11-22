const Joi = require('joi');

const createCouponSchema = {
    query: {},
    body: {
        title:          Joi.string().allow('').min(5).max(50).required().label("The title must be between 5 and 40 characters long, is required "),
        description:    Joi.string().min(5).max(255).allow(null).label("The description must be between 5 and 255 characters long "),
        image:          Joi.string().required().label("Image is required"),
        price:          Joi.number().required().label("Price is required"),
        visible_from:   Joi.number().allow(null),
        valid_from:     Joi.number().required().label("Valid From is required"),
        valid_until:    Joi.number().allow(null),
        purchasable:    Joi.number().required().integer(),
        constraints:    Joi.string().allow(null),
        quantity:       Joi.number().integer().required().label("The quantity is required"),
    },
    params: {},
};

const updateCouponSchema = {
    query: {},
    body: {
        id:             Joi.number().required().label("Id is required"),
        title:          Joi.string().allow('').min(5).max(50).required().error(new Error("Title is required, between 5 and 255 characters long")),
        description:    Joi.string().min(5).max(255).allow(null).label("The description must be between 5 and 255 characters long "),
        image:          Joi.string().required().label("Image is required"),
        price:          Joi.number().required().label("Price is required"),
        visible_from:   Joi.number().allow(null),
        valid_from:     Joi.number().required().label("Valid From is required"),
        valid_until:    Joi.number().allow(null),
        constraints:    Joi.string().allow(null),
        quantity:       Joi.number().integer(),
        purchasable:    Joi.number().integer().required()
    },
    params: {}
};


const validateCouponSchema = {
    query: {},
    body: {
        token:    Joi.string().required().label("Token is required"),
    },
    params: {}
};

module.exports = {
    createCouponSchema,
    updateCouponSchema,
    validateCouponSchema
};