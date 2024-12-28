const { DataTypes } = require('sequelize');
const sequelize = require('../connection/db'); 

const Income = sequelize.define('Income', {
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,  // assuming user_id should not be null
    },
    price: {
        type: DataTypes.FLOAT, // Use FLOAT for decimal values
        allowNull: false
    },
    cash: {
        type: DataTypes.FLOAT, // Use FLOAT for decimal values
        allowNull: false
    },
    total: {
        type: DataTypes.FLOAT, // Use FLOAT for decimal values
        allowNull: false
    },
    
    net_price: {
        type: DataTypes.FLOAT, // Use FLOAT for decimal values
        allowNull: false
    },
    from: {
        type: DataTypes.DATE, // Use FLOAT for decimal values
        allowNull: false
    },
    to: {
        type: DataTypes.DATE, // Use FLOAT for decimal values
        allowNull: false
    },
    file: {
        type: DataTypes.STRING, // Use FLOAT for decimal values
        allowNull: true
    },
    has_zus: {
        type: DataTypes.BOOLEAN, // Use FLOAT for decimal values
        allowNull: true
    }
});

// Sync the model with the database (this will create the table if it doesn't exist)
sequelize.sync();

module.exports = Income;
