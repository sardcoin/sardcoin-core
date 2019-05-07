'use strict';

const Category = require('../models/index').Category;
const CouponsCategories = require('../models/index').CouponsCategories;
const Sequelize = require('../models/index').sequelize;
const Op = require('../models/index').Sequelize.Op;

const HttpStatus = require('http-status-codes');

/** Category CRUD **/
const insert = async (req, res) => {
    let creation;

    try {
        creation = await Category.create({
            name: req.body.name
        });

        return res.status(HttpStatus.CREATED).send({
            created: true,
            name: creation.get('name')
        });
    } catch (e) {
        console.error(e);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'An error occurred while creating a new category'
        })
    }
};
const getAll = async (req, res) => {
    let categories;

    try {
        categories = await Category.findAll();

        if (categories.length === 0) {
            return res.status(HttpStatus.NO_CONTENT).send({});
        }

        return res.status(HttpStatus.OK).send(categories);
    } catch (e) {
        console.error(e);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'An error occurred while retrieving the categories'
        })
    }
};
const update = async (req, res) => {
    let categoryUpdated;

    try {
        categoryUpdated = await Category.update({name: req.body.name}, {where: {id: req.body.id}});

        if (categoryUpdated[0] === 0) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: true,
                message: 'The requested category to update does not exist.'
            })
        }

        return res.status(HttpStatus.OK).send({
            updated: true,
            name: req.body.name
        });
    } catch (e) {
        console.error(e);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'An error occurred while updating the category'
        })
    }
};
const remove = async (req, res) => {
    let categoryRemoved;

    try {
        categoryRemoved = await Category.destroy({where: {id: req.body.id}});

        if (categoryRemoved === 0) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: true,
                message: 'The requested category to delete does not exist.'
            })
        }

        return res.status(HttpStatus.OK).send({
            deleted: true,
            id: req.body.id,
            name: req.body.name
        });
    } catch (e) {
        console.error(e);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'An error occurred while deleting the category'
        })
    }
};

/** CouponCategories Creation and deletion**/
const assignCategory = async (req, res) => {
    let creation;

    try {
        creation = await CouponsCategories.create({
            coupon_id: req.body.coupon_id,
            category_id: req.body.category_id
        });

        return res.status(HttpStatus.OK).send({
            created: true,
            coupon_id: parseInt(creation.get('coupon_id')),
            category_id: parseInt(creation.get('category_id'))
        });
    } catch (e) {
        console.error(e);
        if (e.message.includes('foreign key constraint fails')) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: true,
                message: 'A foreign key constraint fails. Either the coupon_id or the category_id references to an unknown child.'
            })
        }
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'An error occurred while creating a new category'
        })
    }
};
const removeCategory = async (req, res) => {
    let couponCatRemoved;

    try {
        couponCatRemoved = await CouponsCategories.destroy({where: {coupon_id: req.body.coupon_id, category_id: req.body.category_id}});

        if (couponCatRemoved === 0) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: true,
                message: 'The tuple category-coupon to delete does not exist.'
            })
        }

        return res.status(HttpStatus.OK).send({
            deleted: true,
            coupon_id: req.body.coupon_id,
            category_id: req.body.category_id
        });
    } catch (e) {
        console.error(e);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'An error occurred while deleting the category associated to the coupon'
        })
    }
};

module.exports = {insert, getAll, update, remove, assignCategory, removeCategory};