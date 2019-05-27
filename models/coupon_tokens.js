'use strict';

module.exports = (sequelize, DataType) => {
    let CouponToken = sequelize.define('CouponToken', {
        token: {
            type: DataType.STRING(30),
            primaryKey: true
        },
        coupon_id: DataType.INTEGER(11),
        consumer:  DataType.INTEGER(11),
        package:   DataType.INTEGER(11),
        verifier:  DataType.INTEGER(11)
    }, {
        freezeTableName: true,
        timestamps: false,
        tableName: 'coupon_tokens'
    });

    CouponToken.associate = function (models) {
        CouponToken.hasMany(models.User, {foreignKey: 'id', sourceKey: 'consumer'});
        CouponToken.hasMany(models.User, {foreignKey: 'id', sourceKey: 'verifier'});
        CouponToken.hasMany(models.Coupon, {foreignKey: 'id', sourceKey: 'coupon_id'});
        CouponToken.hasMany(models.Package_tokens, {foreignKey: 'token', sourceKey: 'package'});

    };

    return CouponToken;
};