'use strict';

module.exports = (sequelize, DataType) => {
    let PackageTokens = sequelize.define('PackageTokens', {
        token: {
            type: DataType.STRING(30),
            primaryKey: true
        },
        package_id:   DataType.INTEGER(10),

    }, {
        freezeTableName: true,
        timestamps: false,
        tableName: 'package_tokens'
    });

    PackageTokens.associate = function (models) {
        PackageTokens.hasMany(models.Coupon, {foreignKey: 'id', sourceKey: 'package_id'});
    };

    return PackageTokens;
};