'use strict';

module.exports = (sequelize, DataType) => {
    let Verifier = sequelize.define('Verifier', {
        producer: {
            type: DataType.INTEGER(11),
            primaryKey: true
        },
        verifier: {
            type: DataType.INTEGER(11),
            primaryKey: true
        },
    }, {
        freezeTableName: true,
        timestamps: false,
        tableName: 'verifiers'
    });

    Verifier.associate = function (models) {
        Verifier.hasMany(models.User, {foreignKey: 'id', sourceKey: 'producer'});
        Verifier.hasMany(models.User, {foreignKey: 'id', sourceKey: 'verifier'});
    };

    return Verifier;
};