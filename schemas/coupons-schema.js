const Joi = require('joi');

const createCouponSchema = {
    query: {},
    body: {
        title:        Joi.string().allow('').min(5).max(80).required().error(new Error("The title must be between 5 and 70 characters long, is required ")),
        description:  Joi.string().min(5).max(500).allow(null).error(new Error("The description must be between 5 and 255 characters long ")),
        image:        Joi.string().required().error(new Error("Image is required")),
        price:        Joi.number().required().error(new Error("Price is required")),
        visible_from: Joi.number().allow(null).error(new Error("Visible From must be a number or null")),
        valid_from:   Joi.number().required().error(new Error("Valid From is required and must be a number")),
        valid_until:  Joi.number().allow(null).error(new Error("Valid Until must be a number or null")),
        purchasable:  Joi.number().allow(null).error(new Error("Purchasable must be a number or null")),
        constraints:  Joi.string().allow(null).error(new Error("Constraints must be a string or null")),
        quantity:     Joi.number().integer().required().error(new Error("The quantity is required")),
        brokers:      Joi.array().allow(null).error(new Error("broker must be a array or null")),
        pack:         Joi.array().allow(null).error(new Error("coupons must be a array or null")),
        categories:   Joi.array().required().error(new Error("categories must be an array and it is required")),
        type:         Joi.number().integer().allow(null).error(new Error("Type must be a number or null")),
    },
    params: {},
};

const updateCouponSchema = {
    query: {},
    body: {
        id:             Joi.number().required().label("Id is required"),
        title:          Joi.string().allow('').min(5).max(80).required().error(new Error("Title is required, between 5 and 255 characters long")),
        description:    Joi.string().min(5).max(5000).allow(null).label("The description must be between 5 and 255 characters long "),
        image:          Joi.string().required().label("Image is required"),
        price:          Joi.number().required().label("Price is required"),
        visible_from:   Joi.number().allow(null),
        valid_from:     Joi.number().required().label("Valid From is required"),
        valid_until:    Joi.number().allow(null),
        constraints:    Joi.string().allow(null),
        quantity:       Joi.number().allow(null),
        purchasable:    Joi.number().allow(null),
        brokers:        Joi.array().allow(null).error(new Error("broker must be a array or null")),
        categories:     Joi.array().allow(null).error(new Error("categories must be a array or null")),
        type:           Joi.number().integer().allow(null).error(new Error("Type must be a number or null")),
        package:        Joi.array().allow(null).error(new Error("coupons must be a array or null")),

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
