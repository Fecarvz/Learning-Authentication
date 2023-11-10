require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const mongoose = require('mongoose');
const ejs = require('ejs');
const passportLocalMongoose = require('passport-local-mongoose');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.DATABASE_URL)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(async function (id, done) {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function (accessToken, refreshToken, profile, done) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return done(err, user);
  });
}));







app.get('/', (req, res) => {
  res.render('home');
});

app.get("/auth/google", 
  passport.authenticate("google", {scope: ["profile"]})
);

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/secrets', async (req, res) => {
  try {
    const foundUsers = await User.find({secret: {$ne: null}});
    if(foundUsers) {
      res.render("secrets", {usersWithSecrets: foundUsers});
    }
  } catch (err) {
    console.log(err)
  }
});

app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) {
    res.render('submit');
  } else {
    res.redirect('/login');
  }
})

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
})

app.post('/register', (req, res) => {
  User.register({ username: req.body.username }, req.body.password, (err, user) => {
    if (err) {
      console.error(err);
      res.redirect('/register');
    } else {
      passport.authenticate('local')(req, res, function () {
        res.redirect('/secrets');
      });
    }
  });
});

app.post('/login', (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate('local')(req, res, function () {
        res.redirect('/secrets');
      });
    }
  })
});

app.post("/submit", async (req,res) => {
  try {
    const secret = req.body.secret;
    const user = await User.findById(req.user.id);
    if (user){
      user.secret = secret;
      await user.save();
      res.redirect("secrets");
    }
  } catch (err) {
    console.log(err);
    res.redirect("/secrets");
  }
})

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
