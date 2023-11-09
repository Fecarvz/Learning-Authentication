require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption")

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://127.0.0.1:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});

const User = new mongoose.model("User", userSchema);

app.get("/", (req, res) => {
    res.render("home");
})

app.get("/login", (req, res) => {
    res.render("login");
})

app.get("/register", (req, res) => {
    res.render("register");
})

app.post("/register", async (req, res) => {
    try {
        const newUser = new User({
            email: req.body.username,
            password: req.body.password
        })
        await newUser.save();
    } catch(err) {
        res.status(500).send({message: "Erro ao registrar a conta, tente novamente"});
    } finally {
        res.status(201).render("secrets");
    }
})

app.post("/login", async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;

        const user = await User.findOne({email: username});
        if(user){
            if(user.password === password)
                res.status(200).render("secrets");
        } else {
            res.status(200).render("login");
        }
    } catch(err) {
        res.status(500).render("login", {message: "Erro interno, tente novamente mais tarde."});
    }
})


app.listen(3000, () => {
    console.log("Server iniciou na porta 3000")
})