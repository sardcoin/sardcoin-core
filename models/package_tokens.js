'use strict';

module.exports = (sequelize, DataType) => {
    let Package_tokens = sequelize.define('Package_tokens', {
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

    Package_tokens.associate = function (models) {
        Package_tokens.hasMany(models.Coupon, {foreignKey: 'id', sourceKey: 'package_id'});
    };

    return Package_tokens;
};