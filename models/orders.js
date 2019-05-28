'use strict';

module.exports = (sequelize, DataType) => {
    let Order = sequelize.define('Order', {
        id: {
            type: DataType.INTEGER(11),
            autoIncrement: true,
            primaryKey: true
        },
        consumer:      DataType.INTEGER(5),
        purchase_time: DataType.DATE,
    }, {
        freezeTableName: true,
        timestamps: false,
        tableName: 'orders'
    });

    Order.associate = function (models) {
        Order.belongsTo(models.OrderCoupon, {foreignKey: 'id', sourceKey: 'source_id'});
    };

    return Order;
};