'use strict';

module.exports = (sequelize, DataType) => {
    let PackagesCategories = sequelize.define('PackagesCategories', {
        package_id: {
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
        tableName: 'packages_categories'
    });

    PackagesCategories.associate = function (models) {
        PackagesCategories.hasMany(models.Package,   {foreignKey: 'id', sourceKey: 'packeage_id'});
        PackagesCategories.hasMany(models.Category, {foreignKey: 'id', sourceKey: 'category_id'});
    };

    return PackagesCategories;
};