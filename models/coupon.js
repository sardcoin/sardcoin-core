'use strict';

module.exports = (sequelize, DataType) => {
    let Coupon = sequelize.define('Coupon', {
        id: {
            type: DataType.INTEGER(11),
            autoIncrement: true,
            primaryKey: true
        },
        title:       DataType.STRING(255),
        description: DataType.STRING(255),
        image:       DataType.STRING(100),
        timestamp:   DataType.DATE,
        price:       DataType.INTEGER(10),
        valid_from:  DataType.DATE,
        valid_until: DataType.DATE,
        state:       DataType.INTEGER(11),
        constraints: DataType.STRING(255),
        owner:       DataType.INTEGER(11),
        consumer:    DataType.INTEGER(11),
        // quantity:    DataType.INTEGER(11), // non esiste più
        token:       DataType.STRING(255),
    }, {
        freezeTableName: true,
        timestamps: false,
        tableName: 'coupons'
    });

    return Coupon;
};