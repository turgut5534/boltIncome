const { DataTypes } = require('sequelize');
const sequelize = require('../connection/db'); 

const User = sequelize.define('User', {
    firstName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true 
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    has_zus: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
});

sequelize.sync()

module.exports = User;
