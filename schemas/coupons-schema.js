const Joi = require('joi');

const createCouponSchema = {
    query: {},
    body: {
        title:          Joi.string().allow('').min(5).max(50).required().label("the title must be between 5 and 40 characters long, is required "),
        description:    Joi.string().min(5).max(255).allow(null).label("the description must be between 5 and 255 characters long "),
        image:          Joi.string().required().label("Image is required"),
        price:          Joi.number().required().label("Price is required"),
        valid_from:     Joi.number().required().label("Date is required"),
        valid_until:    Joi.number().allow(null),
        state:          Joi.number().integer(),
        constraints:    Joi.string().allow(null),
        owner:          Joi.number().integer().required().label("Owner is required"),
        consumer:       Joi.number().integer().allow(null),
        quantity:       Joi.number().integer()
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
        valid_from:     Joi.number().required().label("Date is required"),
        valid_until:    Joi.number().allow(null),
        state:          Joi.number().integer(),
        constraints:    Joi.string().allow(null),
        owner:          Joi.number().integer().required().label("Owner is required"),
        consumer:       Joi.number().integer().allow(null),
        quantity:       Joi.number().integer()
    },
    params: {}
};


const validateCouponSchema = {
    query: {},
    body: {
        token:             Joi.string().required().label("Token is required"),
        consumer:       Joi.number().integer().required().label("Consumer is required"),
        state:           Joi.number().integer().required().label("State is required"),
    },
    params: {}
};

const verifierCouponSchema = {
    query: {},
    body: {
        token:             Joi.string().required().label("Token is required"),
        verifier:       Joi.number().integer().required().label("Verifier is required"),
        state:           Joi.number().integer().required().label("State is required"),
    },
    params: {}
};


module.exports = {
    createCouponSchema,
    updateCouponSchema,
    validateCouponSchema,
    verifierCouponSchema
};