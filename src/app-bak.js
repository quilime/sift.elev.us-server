const config = require('dotenv').config();
const express = require('express');
const cors = require('cors');

if (config.error) throw config.error;

const app = express();
const upload = require('./upload');


// enable Cross-origin resource sharing
app.use(cors({
  origin: '*',
  optionsSuccessStatus: 200,
}));


// route middleware to ensure user is logged in
function checkAuth(req, res, next) {
    // if (1) { //req.isAuthenticated()
      return next();
    // }
    // res.redirect("/login");
}


app.post('/upload', checkAuth, upload.post);
app.get('/', (req, res) => {
   res.send('<pre>' + process.env.SERVER_NAME+' 200 OK\nHEAD: ' + process.env.GITHEAD);
});


app.listen(process.env.PORT, () => {
  console.log('Listening on port', process.env.PORT);
});
