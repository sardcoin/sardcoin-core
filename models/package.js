'use strict';

module.exports = (sequelize, DataType) => {
    let Package = sequelize.define('Package', {
        id: {
            type: DataType.INTEGER(11),
            autoIncrement: true,
            primaryKey: true
        },
        title:        DataType.STRING(255),
        description:  DataType.STRING(255),
        image:        DataType.STRING(100),
        timestamp:    DataType.DATE,
        price:        DataType.INTEGER(10),
        visible_from: DataType.DATE,
        valid_from:   DataType.DATE,
        valid_until:  DataType.DATE,
        purchasable:  DataType.INTEGER(11),
        constraints:  DataType.STRING(255),
        owner:        DataType.INTEGER(11),
    }, {
        freezeTableName: true,
        timestamps: false,
        tableName: 'package'
    });

    Package.associate = function (models) {
        Package.hasMany(models.User, {foreignKey: 'id', sourceKey: 'owner'});
        Package.hasMany(models.CouponBroker, {foreignKey: 'coupon_id', sourceKey: 'id'});
    };

    return Package;
};