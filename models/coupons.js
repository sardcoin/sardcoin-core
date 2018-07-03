'use strict';

// TODO: check data types

module.exports = (sequelize, DataType) => {
    let Coupons = sequelize.define('Coupons', {
        id:             DataType.STRING(20),
        title:          DataType.STRING(50),
        description:    DataType.STRING(100),
        timestamp:      DataType.STRING(11),
        price:          DataType.STRING(40),
        valid_from:     DataType.DATEONLY,
        valid_until:    DataType.DATEONLY,
        state:          DataType.STRING(100),
        constraints:    DataType.STRING(2),
        owner:          DataType.STRING(50),
        consumer:       DataType.STRING(5)
    }, {
        freezeTableName: true,
        timestamps: false,
        tableName: 'users'
    });

    return Coupons;
};