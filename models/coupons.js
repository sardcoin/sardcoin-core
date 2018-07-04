'use strict';

// TODO: check data types

module.exports = (sequelize, DataType) => {
    let Coupons = sequelize.define('Coupons', {
        id:             DataType.INTEGER(11),
        title:          DataType.STRING(255),
        description:    DataType.STRING(255),
        timestamp:      DataType.TIMESTAMP,
        price:          DataType.INTEGER(10),
        valid_from:     DataType.DATE,
        valid_until:    DataType.DATE,
        state:          DataType.INTEGER(11),
        constraints:    DataType.STRING(255),
        owner:          DataType.INTEGER(11),
        consumer:       DataType.INTEGER(11)
    }, {
        freezeTableName: true,
        timestamps: false,
        tableName: 'users'
    });

    return Coupons;
};