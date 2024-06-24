//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encypt = require("mongoose-encryption");
// const md5 = require("md5"); 
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: "Our big secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

// const secret = process.env.SECRET;
// userSchema.plugin(encypt, {secret: secret, encryptedFields: ['password']});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req, res){
    res.render("home");
});

app.get("/auth/google", 
    passport.authenticate('google', {scope: ["profile"]})
);

app.get("/auth/google/secrets", 
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/secrets');
    });

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});


// app.post("/register", function(req, res){

//     bcrypt.hash(req.body.password, saltRounds, function(err, hash){
//         const newUser = new User({
//             email: req.body.username,
//             password: hash
//         });
//         newUser.save()
//             .then(function(result){
//                 console.log("User details added successfully");
//                 res.render("secrets");
//             })
//             .catch(function(err){
//                 console.log(err);
//             })
//     });

    
// });


// app.post("/login", function(req, res){
//     const username = req.body.username;
//     const password = req.body.password;

//     User.findOne({email: username})
//         .then(function(foundUser){
//                 bcrypt.compare(password, foundUser.password, function(err, result){
//                     if(result === true){
//                         res.render("secrets");
//                         console.log("login successfull");
//                     }else{
//                         console.log("Wrong Password");
//                     }       
//                 }); 
//         })
//         .catch(function(err){
//             console.log(err);
//         })
// });

app.get("/secrets", function(req, res){
    // if(req.isAuthenticated()){
    //     res.render("secrets");
    // }else{
    //     res.redirect("/login");
    // }
    User.find({"secret": {$ne: null}})
        .then(function(foundUsers){
            res.render("secrets", {usersWithSecrets: foundUsers});
        })
        .catch(function(err){
            console.log(err);
        })
});

app.get("/submit", function(req, res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});

app.post("/submit", function(req, res){
    const submitterSecret = req.body.secret;
    User.findById(req.user.id)
        .then(function(foundUser){
            foundUser.secret = submitterSecret;
            foundUser.save()
                .then(function(result){
                    res.redirect("/secrets");
                })
                .catch(function(err){
                    console.log(err);
                })
        })
        .catch(function(err){
            console.log(err);
        })
});


app.post("/register", function(req, res){
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/login", function(req, res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    })

});

app.get("/logout", function(req, res){
    req.logout(function(err){
        if(err){
            console.log(err);
        }else{
            res.redirect("/");
        }
    })
    
});

app.listen("3000", function(req, res){
    console.log("The server is started on port 3000");
});