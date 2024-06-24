//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encypt = require("mongoose-encryption");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

const secret = process.env.SECRET;
userSchema.plugin(encypt, {secret: secret, encryptedFields: ['password']});

const User = new mongoose.model("User", userSchema);

app.get("/", function(req, res){
    res.render("home");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});


app.post("/register", function(req, res){
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });
    newUser.save()
        .then(function(result){
            console.log("User details added successfully");
            res.render("secrets");
        })
        .catch(function(err){
            console.log(err);
        })
});


app.post("/login", function(req, res){
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email: username})
        .then(function(foundUser){
            if(foundUser.password === password){
                res.render("secrets");
                console.log("login successfull");
            }else{
                console.log("Wrong Password");
            }
        })
        .catch(function(err){
            console.log(err);
        })
});


app.listen("3000", function(req, res){
    console.log("The server is started on port 3000");
});