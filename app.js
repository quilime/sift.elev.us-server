const config = require('dotenv').config();
const express = require('express');
const cors = require('cors');

if (config.error) throw config.error;

const app = module.exports = express();
app.use(cors({
  origin: '*',
  optionsSuccessStatus: 200,
}));

require(__dirname + '/upload.js');

app.get('/', function(req, res){
   res.send('<pre>'+process.env.SERVER_NAME+' 200 OK\n' + process.env.GITHEAD);
});

app.listen(process.env.PORT, () => {
  console.log('Listening on port', process.env.PORT);
});
