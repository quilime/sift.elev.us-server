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
  
  let email = req.body.email;

  db.User.findOne({ where : { email : email } })

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
    .then((user) => {
      user.password = genLoginCode();
      user.passwordCreatedAt = Date.now();
      return user.save({ fields: ['password', 'passwordCreatedAt'] });
    })
    .then((user) => {
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
    .then((user) => {
      console.log(`Sent email to ${user.email}`);
    })
    .catch((err) => {
      console.log('New User Error', err);
    })
};

const login = async (req, res) => {
  try {
    console.log("login");
    res.json({ "log": "mein" });
  } catch (err) {
    res.send(err);
  }
};

const check = async(req, res) => {
  res.json({ status: "not logged in" });
};

module.exports = {
  gen: gen,
  login: login,
  check: check
}
