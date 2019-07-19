'use strict';

module.exports = (sequelize, DataType) => {
    let CouponsCategories = sequelize.define('CouponsCategories', {
        coupon_id: {
            type: DataType.INTEGER(11),
            primaryKey: true
        },
        category_id: {
            type: DataType.INTEGER(5),
            primaryKey: true
        },
    }, {
        freezeTableName: true,
        timestamps: false,
        tableName: 'coupons_categories'
    });

    CouponsCategories.associate = function (models) {
        CouponsCategories.hasMany(models.Coupon,   {foreignKey: 'id', sourceKey: 'coupon_id'});
        CouponsCategories.hasMany(models.Category, {foreignKey: 'id', sourceKey: 'category_id'});
    };

    return CouponsCategories;
};