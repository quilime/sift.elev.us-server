const config = require('dotenv').config();
if (config.error) throw config.error;

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const passportJwt = require("passport-jwt");
const { createTransport } = require("nodemailer");
const { v4: uuidv4 } = require("uuid");

const upload = require('./upload');
const login = require('./login');
const { User, Image } = require('./models');

const morgan = require('morgan')('combined');


// set up mailer
const mailTransport = createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
});


// 6 digit password generator
const generatePassword = () => {
  return Math.floor(100000 + Math.random() * 900000);
};


// mail transport
const sendPasswordViaEmail = (user) => {
  if (process.env.SEND_EMAIL == 0) return "Email-send disabled.";
  return mailTransport.sendMail({
    from: process.env.FROM_EMAIL,
    to: user.email,
    subject: "Your Login Code 🔑",
    // plain text email body
    text: "Your single-use login code\n\n" + user.password,
    // html email body
    html: "Your single-use login code<br /><br /><strong style='font-size:2em;'>" + user.password + "</strong>",
  });
};


// JWT auth strategy for passport
const jwtOpts = {
  jwtFromRequest: (req) => {
    let token = null;
    // get JWT from cookie
    if (req && req.cookies) token = req.cookies["token"];
    return token;  
  },
  secretOrKey: process.env.JWT_SECRET
};
passport.use(new passportJwt.Strategy(jwtOpts, (jwt_payload, next) => {
  User.findOne({ where: { uuid: jwt_payload.uuid }})
  .then((user) => {
    next(null, user);
  })
  .catch((err) => {
    console.log(err);
    next(null, false);
  });
}));


// auth middleware
const checkAuth = (req, res, next) => passport.authenticate("jwt", function(err, user, info) {
  if (err) return next(err);
  if (!user || user.password) return res.redirect(process.env.PROXY_URL + "/noauth");
  req.user = user;
  next(null, req);
})(req, res, next);


// set up app
const app = express();
app.use(cors({ 
  origin: '*', 
  optionsSuccessStatus: 200, 
  credentials: true
}));
app.use(passport.initialize());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));  // parse application/x-www-form-urlencoded
app.use(cookieParser());
app.use(morgan);
app.get(process.env.PROXY_URL + "/", function(req, res) {
  res.json({ server: process.env.SERVER_NAME, status: '200', build: process.env.BUILD });
});


// register
app.post(process.env.PROXY_URL + "/register", (req, res) => {

  console.log('Cookies: ', req.cookies);

  const { email } = req.body;
  try {
    if (email) {
      const password = generatePassword();

      User.findOne({ where: { email: email }})
        .then((user) => {
          // create a new user if doesn't exist
          if (user) {
            return user.update({ password: password });
          }
          else {
            return User.create({ email: email, password: password, uuid: uuidv4() });
          }
        })
        .then((user) => {

          // create JWT with user's uuid and the generated password
          let payload = {
            uuid: user.uuid,
            password: password
          };
          let token = jwt.sign(payload, jwtOpts.secretOrKey);

          console.log('jtw token created', token, 'payload', payload);

          // store token in cookie
          res.cookie("token", token, { httpOnly: true });

          console.log('cookie created server side', token);

          return user;
        })
        .then(user => sendPasswordViaEmail(user))
        .then((emailSendResult) => {
          console.log(emailSendResult);
          res.json({ msg: "One-time password " + password + " emailed to " + email });
        });
      }
      else {
        throw "Invalid Email";
      }
  } catch (err) {
    console.error(err);
    res.json({ error : err });
  }
});


// login
app.post(process.env.PROXY_URL + "/login", (req, res) => {

  try {
    // decode token from cookie
    const token = req.cookies["token"];

    if (!token) {
      throw "No token found in cookie -- Are cookies enabled?"
    }

    console.log(req.cookies);

    var decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const { password } = req.body;

    console.log('cookies', req.cookies, 'decodedToken', decodedToken);

    if (password && decodedToken.uuid) {
      User.findOne({where: { uuid: decodedToken.uuid }})
        .then((user) => {
          if (!user) {
            throw "User not found";
          }
          if (user.password === password) {
          // delete password after it's been used
            return user.update({ password: null });
          } else {
            throw "Incorrect password";
          }
        })
        .then((user) => {
        // create new token with just user uuid

          let payload = {
            uuid: user.uuid
          };
          let newToken = jwt.sign(payload, jwtOpts.secretOrKey);

          // replace token in client cookie
          res.cookie("token", newToken, { httpOnly: true });
          res.json({ user: user, message: "Login successful!" });
        })
        .catch(err => {
          res.status(401).json({ error: err });
        });
    }
    else {
      throw "Go to /register to generate a new password.";
    }
  }
  catch (err) {
    res.status(500).json({ error: err });
  }
});


// no auth
app.get(process.env.PROXY_URL + "/noauth", (req, res) => {
  res.json({ authorized: false, message: "Unauthenticated" });
});


// login get
app.get(process.env.PROXY_URL + "/login", checkAuth, (req, res) => {
  res.json({ user: req.user, message: "Authenticated" });
});


// logout
app.post(process.env.PROXY_URL + "/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out"});
});


// protected route
app.get(process.env.PROXY_URL + "/protected", checkAuth, (req, res) => {
  res.json({ message: "This is a protected route." });
});


// user settings
app.get(process.env.PROXY_URL + "/settings", checkAuth, (req, res) => {
  res.json({ user: req.user });
});


// start app
app.listen(process.env.PORT, () => {
  console.log("Listening on port " + process.env.PORT);
});


// upload
app.post(process.env.PROXY_URL + "/upload", checkAuth, upload.post);


// get all users
app.get(process.env.PROXY_URL + "/users", checkAuth, (req, res) => {
  User.findAll().then(users => res.json(users));
});


// get all images
app.get(process.env.PROXY_URL + "/images", checkAuth, (req, res) => {
  Image.findAll().then(images => res.json(images));
});

/*
app.get('/login/check', login.check);
app.post('/login/gen', login.gen);
app.post('/logout', login.logout);
app.post('/login', 
  passport.authenticate('local-login', { 
    failureRedirect: '/login/check' 
  }), 
  login.login);
app.get('/', (req, res) => {
  res.send('<pre>' + process.env.SERVER_NAME + ' 200 OK\nHEAD: ' + process.env.GITHEAD);
});
app.get('/settings', 
  checkAuth,//require('connect-ensure-login').ensureLoggedIn(), 
  (req, res) => {
    res.json({ user : req.user });
  });


app.listen(process.env.PORT, () => {
  console.log('Listening on port', process.env.PORT);
});
*/
