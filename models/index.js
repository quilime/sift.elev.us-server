const config = require('dotenv').config();
if (config.error) throw config.error;

const { Sequelize, DataTypes, Model } = require('sequelize');

const connection_str = `mysql://${process.env.MYSQL_USER}:${process.env.MYSQL_PASS}@${process.env.MYSQL_HOSTNAME}:${process.env.MYSQL_PORT}/${process.env.MYSQL_DB}`;
var sequelize = new Sequelize(connection_str);

class Image extends Model {};
module.exports.Image = Image.init({
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
    type: DataTypes.STRING,
  }
}, {
  // Other model options go here
  sequelize, // We need to pass the connection instance
  modelName: 'Image' // We need to choose the model name
});


sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .then(Image.sync({ alter: true }))
  .catch((err)=>{
    console.error('Unable to connect to the database:', err);
  });

// (async() => {
//   try {
//     await sequelize.authenticate();
//     console.log('Connection has been established successfully.');
//   } catch (error) {
//     console.error('Unable to connect to the database:', error);
//   }
// });

// (async() => {
//   await Image.sync({ alter: true });
//   console.log("The table for the Image model was just (re)created!");
// })();
