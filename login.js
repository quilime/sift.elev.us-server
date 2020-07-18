const db = require('./models');
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

// TODO: move to env
const emailTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
});


// 6 digit password for login
const genLoginCode = () => {
  return Math.floor(100000 + Math.random() * 900000);
}



const gen = (req, res) => {

  db.User.findOne({ where : { email : req.body.email } })

  // if there is no user with that email, then create it 
  .then((res) => {
    if (!res) {
      return db.User.create({
        email: req.body.email
      })
    }
    else {
      return res;
    }
  })

  // generate login code and update the user row
  .then((user) => {
    user.password = genLoginCode();
    user.passwordCreatedAt = Date.now();
    return user.save({ fields: ['password', 'passwordCreatedAt'] });
  })

  // email the user the password
  .then((user) => {
    // if (1) return user;
    return emailTransport.sendMail({
      from: process.env.FROM_EMAIL, 
      to: user.email,
      subject: "SIFT One-time Login Key 🗝",
      text: "Your one-time login key\n\n" + user.password, // plain text body
      html: "Your one-time login key 🗝<br /><br /><strong>" + user.password + "</strong>", // html body
    })
    .then((status) => {
      console.log(status);
      return user;
    })
  })

  // complete
  .then((user) => {
    console.log(user.toJSON());
    console.log(`Sent email to ${user.email}`);
    res.json({ email: user.email });
  })

  .catch((err) => {
    console.log('New User Error', err);
  })
};

const login = async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  db.User.findOne({ where : { 
    email: req.body.email,
    password: req.body.password
  } })

  .then((user) => {
    if (user) {
      // user.password = "";
      // return user.save();
      return user;
    } 
    else {
      throw new Error('Invalid Login');
    }
  })

  .then((user) => { 
    console.log(user.toJSON());
    res.json({ 
      loggedIn : true,
      email: user.email 
    });
  })

  .catch((err) => {
    console.log(err);
    res.json({ 
      error : 'Invalid Login', 
      email : email 
    });
  });
};

const check = async(req, res) => {
  res.json({ status: "not logged in" });
};

module.exports = {
  gen: gen,
  login: login,
  check: check
}
