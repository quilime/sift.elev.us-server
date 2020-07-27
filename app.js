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
const { DB, User, Image } = require('./models');

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
  if (!user || user.password)
    return res.redirect(process.env.PROXY_URL + "/noauth");
  req.user = user;
  next(null, req);
})(req, res, next);


// set up app
const app = express();
app.use(cors({
  origin: 'https://sift.elev.us',
  optionsSuccessStatus: 200,
  credentials: true
}));
app.use(passport.initialize());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));  // parse application/x-www-form-urlencoded
app.use(cookieParser());
// app.use(morgan);

const root = (req, res) => res.json({ server: process.env.SERVER_NAME, status: '200', build: process.env.BUILD, head: process.env.GITHEAD });
app.get("/", root);
app.get(process.env.PROXY_URL + "/", root);

// register
app.post(process.env.PROXY_URL + "/register", async (req, res) => {

  const { email } = req.body;

  try {
    if (email) {

      const password = generatePassword();

      let user = await User.findOne({ where: { email: email }});

      // user exists, so update row with new password
      if (user) {
        user = await user.update({ password: password });
      }
      else {
        if (process.env.INVITE_ONLY == '1') {
          throw "Registration is by invitation only";
        }
        user = await User.create({
          email: email,
          password: password,
          username: email.split("@")[0],
          uuid: uuidv4()
        });
      }

      // we're done with sequelize so reduce user to basic keys
      user = user.toJSON();

      // create JWT with user's uuid and the generated password
      let payload = {
        uuid: user.uuid,
        password: password
      };
      let token = jwt.sign(payload, jwtOpts.secretOrKey);

      console.log('jtw token created', token, 'payload', payload);
      res.cookie("token", token, { maxAge: Number(process.env.COOKIE_MAX_AGE), httpOnly: true });
      console.log('cookie created server side', token);

      user.token = token;

      if (process.env.SEND_EMAIL == 0) {
        console.log("Email-send disabled.");
      } else {
        let mailResponse = await sendPasswordViaEmail(user);
        console.log('mailResponse', mailResponse);
      }

      res.json({
        email: email,
        password: password,
        msg: "Password emailed to " + email
      });

    } else {
      throw "Invalid Email";
    }
  } catch (err) {
    console.error(err);
    res.json({ error : err });
  }
});


// login
app.post(process.env.PROXY_URL + "/login", async (req, res) => {
  try {
    // decode token from cookie
    const token = req.cookies["token"];

    if (!token) {
      throw "No token found in cookie -- Are cookies enabled?"
    }

    var decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const { password } = req.body;

    console.log('cookies', req.cookies, 'decodedToken', decodedToken);

    if (password && decodedToken.uuid) {

      let user = await User.findOne({where: { uuid: decodedToken.uuid }});

      if (!user) {
        throw "User not found";
      }
      if (user.password === password) {
        // delete password
        user = await user.update({ password: null });
      } else {
        throw "Incorrect password";
      }

      let payload = {
        uuid: user.uuid
      };
      let newToken = jwt.sign(payload, jwtOpts.secretOrKey);

      // replace token in client cookie
      res.cookie("token", newToken, { maxAge: Number(process.env.COOKIE_MAX_AGE), httpOnly: true });
      res.json({
        user: user,
        token: newToken,
        message: "Login successful!"
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


// get user settings
app.get(process.env.PROXY_URL + "/settings", checkAuth, async (req, res) => {
  try {
    let user = await User.findOne({ where: { uuid: req.user.uuid }});
    res.json(user.toJSON());
  } catch (err) {
    res.json(err);
  }
});


// set username
app.post(process.env.PROXY_URL + "/settings", checkAuth, async (req, res) => {
  let user = await req.user.update({ username: req.body.username });
  res.json({ user: user.toJSON() });
});


// upload
app.post(process.env.PROXY_URL + "/upload", checkAuth, upload.post);


// get all users
app.get(process.env.PROXY_URL + "/users", checkAuth, (req, res) => {
  User.findAll().then(users => res.json(users.reverse()));
});


// get all images
app.get(process.env.PROXY_URL + "/images", checkAuth, async (req, res) => {
  try {
    let images = await DB.query("SELECT Images.*, Users.username FROM `Images`, `Users` where Images.uploader = Users.uuid;");
    res.json(images[0].reverse());
  } catch(err) {
    res.json(err);
  }
});


// get an image
app.get(process.env.PROXY_URL + "/images/:uuid", checkAuth, async (req, res) => {
  try {
    const uuid = req.params.uuid;
    // Image.findOne({ where: { uuid: req.params.uuid }}).then(image => res.json(image));
    let images = await DB.query("SELECT Images.*, Users.username FROM `Images`, `Users` where Images.uuid='" + uuid + "' AND Images.uploader = Users.uuid LIMIT 1;");
    if (images[0][0]) {
      res.json(images[0][0]);
    } else {
      throw "Image not found";
    }
  } catch(err) {
    res.json(err);
  }
});


// update an image
app.post(process.env.PROXY_URL + "/images/:uuid", checkAuth, async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const description = req.body.description;
    const image = await Image.findOne({ where: { uuid: uuid }});
    if (!image) throw "Image not found";
    const update = await image.update({ description: description });
    const images = await DB.query("SELECT Images.*, Users.username FROM `Images`, `Users` where Images.uuid='" + uuid + "' AND Images.uploader = Users.uuid LIMIT 1;");
    if (images[0][0]) {
      res.json(images[0][0]);
    } else {
      throw "Image not found";
    }
  } catch(err) {
    res.json(err);
  }
});



// delete an image
app.post(process.env.PROXY_URL + "/images/:uuid/delete", checkAuth, async (req, res) => {
  console.log('delete images-----');
  try {
    const imageUUID = req.body.uuid;
    const userUUID = req.user.uuid;
    const image = await Image.findOne({ where: { uuid: imageUUID, uploader: userUUID }});
    if (!image) throw "Image not found, or not authorized to delete.";
    const deleted = await image.destroy();
    res.json({ image: image, deleted: deleted });
  } catch(err) {
    res.json(err);
  }
});



// get images by uploader
app.get(process.env.PROXY_URL + "/images/uploadedby/:username", checkAuth, async (req, res) => {
  try {
    let user = await User.findOne({ where: { username: req.params.username }});
    let images = await DB.query("SELECT Images.*, Users.username FROM `Images`, `Users` where Images.uploader = Users.uuid AND Images.uploader = '"+user.uuid+"';");
    res.json(images[0].reverse());
  } catch(err) {
    res.json(err);
  }
});


// start app
app.listen(process.env.PORT, () => {
  console.log("Listening on port " + process.env.PORT);
});
