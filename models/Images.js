const { Sequelize, DataTypes, Model } = require('sequelize');
class Image extends Model {};

Image.init({
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  localpath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  href: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fileInfo: {
    type: DataTypes.JSONTYPE
  }
}, {
  // Other model options go here
  sequelize, // We need to pass the connection instance
  modelName: 'Image' // We need to choose the model name
});

// module.exports = function session(Sequelize, DataTypes) {
//   return Sequelize.define('sessions', {
//     id: {
//       type: DataTypes.INTEGER,
//       primaryKey: true,
//       autoIncrement: true,
//     },
//     session: DataTypes.JSONB,
//     uuid: {
//       type: DataTypes.UUID,
//       allowNull: false,
//       unique: true,
//     },
//     url_id: DataTypes.STRING,
//     client_ip: { type: 'inet' },
//   });
// };
