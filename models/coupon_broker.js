'use strict';

module.exports = (sequelize, DataType) => {
    let CouponBroker = sequelize.define('CouponBroker', {
        coupon_id: {
            type: DataType.INTEGER(11),
            primaryKey: true
        },
        broker_id: {
            type: DataType.INTEGER(5),
            primaryKey: true
        },
        quantita:     DataType.INTEGER(2),

    }, {
        freezeTableName: true,
        timestamps: false,
        tableName: 'coupon_broker'
    });

    CouponBroker.associate = function (models) {
        CouponBroker.hasMany(models.Coupon, {foreignKey: 'id', sourceKey: 'coupon_id'});
        CouponBroker.hasMany(models.User, {foreignKey: 'id', sourceKey: 'broker_id'});
    };

    return CouponBroker;
};