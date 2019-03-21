'use strict';

module.exports = (sequelize, DataType) => {
    let OrderCoupon = sequelize.define('OrderCoupon', {
        order_id: {
            type: DataType.INTEGER(5),
            primaryKey: true
        },
        coupon_id: {
            type: DataType.INTEGER(11),
            primaryKey: true
        },
        quantity:  DataType.INTEGER(2),
    }, {
        freezeTableName: true,
        timestamps: false,
        tableName: 'orders_coupons'
    });

    OrderCoupon.associate = function (models) {
        OrderCoupon.hasMany(models.Order,  {foreignKey: 'id', sourceKey: 'order_id'});
        OrderCoupon.hasMany(models.Coupon, {foreignKey: 'id', sourceKey: 'coupon_id'});
    };

    return OrderCoupon;
};