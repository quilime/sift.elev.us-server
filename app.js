const config = require('dotenv').config();
if (config.error) throw config.error;

const express = require('express');
const cors = require('cors');
const app = express();
const upload = require('./upload');
const login = require('./login');
const db = require('./models');

// enable cross-origin resource sharing
app.use(cors({
  origin: '*',
  optionsSuccessStatus: 200,
}));
app.use(express.json());

// middleware to ensure user is logged in
const checkAuth = (req, res, next) => {
  // if (req.isAuthenticated()) 
  return next();
  // else 
  // res.redirect("/login");
};

const index = (req, res) => {
  res.send('<pre>' + process.env.SERVER_NAME + ' 200 OK\nHEAD: ' + process.env.GITHEAD);
};


app.post('/upload', checkAuth, upload.post);
app.get('/login/check', login.check);
app.post('/login/gen', login.gen);
app.post('/logout', login.logout);
app.post('/login', login.login);
app.get('/', index);


app.listen(process.env.PORT, () => {
  console.log('Listening on port', process.env.PORT);
});

