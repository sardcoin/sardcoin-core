'use strict';

const Sequelize = require('sequelize');
const User = require('../models/index').User;
const Passport = require('../app').passport;
const bcrypt = require('bcrypt-nodejs');
const jwt = require('jsonwebtoken');


exports.getUserFromUsername = function (req, res, next) {
    const usern = req.params.usern;

    User.findOne({where: {username: usern}})
        .then(user => {

            if (user === null)
                res.json("This username doesn't exist in the platform.");
            else
                res.json(user.email);
        })
        .catch(err => {
            res.json(err);
        });
};

exports.createUser = function (req, res, next) {

    const Op = Sequelize.Op;
    const user = req.body;
    const password = bcrypt.hashSync(user.password);

    User.findAll({
        where: {
            [Op.or] : [
                { username: user.username },
                { email: user.email }
            ]
        }
    })
        .then(userbn => {
            // user not null means a username or an email already exists in the system and
            // the registration must be rejected

            if(userbn.length !== 0) {
                res.status(400).send('The username or email chosen already exists.');
            } else {
                // A new user can be created

                User.create({
                    username: user.username,
                    email: user.email,
                    company_name: user.company_name,
                    vat_number: user.vat_number,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    birth_place: user.birth_place,
                    birth_date: new Date(user.birth_date),
                    fiscal_code: user.fiscal_code,
                    address: user.address,
                    province: user.province,
                    city: user.city,
                    zip: user.zip,
                    password: password,
                    user_type: user.user_type,
                    checksum: '0'
                })
                    .then(newUser => {
                        res.send({
                            created:    true,
                            first_name: newUser.get('first_name'),
                            last_name:  newUser.get('last_name')
                        });
                    })
                    .catch(err => {
                        console.log("User cannot be created");
                        res.send(err);
                    })
            }
        })
    ;
};

exports.getUserById = function (req, res, next) {

    const userId = req.params.id;

    User.findOne({where: {id: userId}})
        .then(user => {
            res.send(user);
        })
        .catch(err => {
            res.send(err);
        })
};

exports.updateUser = function (req, res, next) {

    const user = req.body;
    const password = bcrypt.hashSync(user.password);

    User.update({
        username: user.username,
        email: user.email,
        company_name: user.company_name,
        vat_number: user.vat_number,
        first_name: user.first_name,
        last_name: user.last_name,
        birth_date: new Date(user.birth_date),
        fiscal_code: user.fiscal_code,
        address: user.address,
        province: user.province,
        city: user.city,
        zip: user.zip,
        password: password
    }, {
        where: {
            username: user.username
        }
    })
        .then(newUser => {
            res.send("User " + newUser.get('first_name') + ' ' + newUser.get('last_name') + ' has been successful updated');
        })
        .catch(err => {
            console.log("User cannot be updated");
            res.send(err);
        });
};

exports.deleteUser = function (req, res, next) {

    User.destroy({where: {user: req.body.username}})
        .then(() => {
            res.send("user" + req.body.username + " destroyed");
        })
        .catch(err => {
            console.log("User cannot be deleted");
            reject(err);
        })
};

exports.basicLogin = function (req, res, next) {

    Passport.authenticate('basic', {session: false}, function (err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(401).json({
                logged: false,
                error: 'unauthorized'
            })
        } else {
            const token = jwt.sign(user.dataValues, 'your_jwt_secret');
            return res.json({user, token});
        }
    })(req, res, next);
};