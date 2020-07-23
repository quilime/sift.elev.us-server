const { Sequelize, DataTypes } = require("sequelize");


// set up database
const sequelize = new Sequelize({
  database: process.env.DB_NAME,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  dialect: process.env.DB_DIALECT,
});


const Image = sequelize.define("Image", {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  uuid: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  uploader: {
    type: DataTypes.UUID,
    allowNull: false,
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
});


const User = sequelize.define("User", {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
  },
  invite: {
    type: DataTypes.STRING,
  },  
  uuid: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  }
});


sequelize.authenticate()
  .then(() => console.log('DB Connected'))
  .then(Image.sync({ alter: false }))
  .then(User.sync({ alter: false }))
  .catch((err)=> console.error('Unable to connect to the DB', err));


module.exports = {
  User: User,
  Image: Image
}
