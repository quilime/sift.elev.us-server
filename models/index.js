const config = require('dotenv').config();
if (config.error) throw config.error;

const { Sequelize, DataTypes, Model } = require('sequelize');

const connection_str = `mysql://${process.env.MYSQL_USER}:${process.env.MYSQL_PASS}@${process.env.MYSQL_HOSTNAME}:${process.env.MYSQL_PORT}/${process.env.MYSQL_DB}`;
var sequelize = new Sequelize(connection_str);


class Image extends Model {};
Image.init({
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  uuid: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  href: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING
  },  
  size: {
    type: DataTypes.INTEGER
  },    
  width: {
    type: DataTypes.INTEGER
  },  
  height: {
    type: DataTypes.INTEGER
  },  
  fileInfo: {
    type: DataTypes.JSON
  },
  client_ip: {
    type: DataTypes.STRING(45)
  },
  client_agent: {
    type: DataTypes.TEXT,
  }
}, {
  sequelize,
  modelName: 'Image'
});


class User extends Model{};
User.init({
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },  
  username: {
    type: DataTypes.STRING,
  },
  password: {
    type: DataTypes.STRING
  },
  passwordCreatedAt: {
    type: Sequelize.DATE
  }
}, {
  sequelize,
  modelName: 'User'
});


sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  // .then(Image.sync({ alter: true }))
  // .then(User.sync({ alter: true }))
  .catch((err)=>{
    console.error('Unable to connect to the database:', err);
  });

module.exports = {
  User: User,
  Image: Image
}

