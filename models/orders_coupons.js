'use strict';

module.exports = (sequelize, DataType) => {
    let OrderCoupon = sequelize.define('OrderCoupon', {
        id: {
            type: DataType.INTEGER(11),
            primaryKey: true
        },
        order_id: DataType.INTEGER(11),
        coupon_token: DataType.STRING(30),
        package_token:  DataType.STRING(30),
    }, {
        freezeTableName: true,
        timestamps: false,
        tableName: 'orders_coupons'
    });

    OrderCoupon.associate = function (models) {
        OrderCoupon.hasMany(models.Order,  {foreignKey: 'id', sourceKey: 'order_id'});
        OrderCoupon.hasMany(models.CouponToken, {foreignKey: 'token', sourceKey: 'coupon_token'});
        OrderCoupon.hasMany(models.PackageTokens, {foreignKey: 'token', sourceKey: 'package_token'});
    };

    return OrderCoupon;
};