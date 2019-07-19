'use strict';

module.exports = (sequelize, DataType) => {
    let Category = sequelize.define('Category', {
        id: {
            type: DataType.INTEGER(5),
            autoIncrement: true,
            primaryKey: true
        },
        name: DataType.STRING(30),
    }, {
        freezeTableName: true,
        timestamps: false,
        tableName: 'categories'
    });

    Category.associate = function (models) {
        // Category.belongsTo(models.CouponsCategories, {foreignKey: 'id', sourceKey: 'source_id'});
    };

    return Category;
};