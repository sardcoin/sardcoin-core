'use strict';

module.exports = (sequelize, DataType) => {
    let PackageTokens = sequelize.define('PackageTokens', {
        token: {
            type: DataType.STRING(30),
            primaryKey: true
        },
        package_id:   DataType.INTEGER(10),
        consumer: DataType.INTEGER(11),
        prepare: DataType.INTEGER(11)
    }, {
        freezeTableName: true,
        timestamps: false,
        tableName: 'package_tokens'
    });

    PackageTokens.associate = function (models) {
        PackageTokens.hasMany(models.Coupon, {foreignKey: 'id', sourceKey: 'package_id'});
        PackageTokens.hasMany(models.User, {foreignKey: 'id', sourceKey: 'consumer'});
    };

    return PackageTokens;
};