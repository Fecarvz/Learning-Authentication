require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption")
// const md5 = require("md5")
const bcrypt = require("bcryptjs")
const saltRounds = 10;

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect(process.env.DATABASE_URL);

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});

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
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
        const newUser = new User({
            email: req.body.username,
            password: hashedPassword
        });
        await newUser.save();
        res.status(201).render("secrets");
    } catch (err) {
        res.status(500).send({ message: "Erro ao registrar a conta, tente novamente" });
    }
});





app.post("/login", async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;

        const user = await User.findOne({ email: username });
        if (user) {
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (isPasswordValid) {
                res.status(200).render("secrets");
            } else {
                res.status(200).render("login", { message: "Credenciais inválidas. Tente novamente." });
            }
        } else {
            res.status(200).render("login", { message: "Usuário não encontrado. Por favor, registre-se." });
        }
    } catch (err) {
        res.status(500).render("login", { message: "Erro interno, tente novamente mais tarde." });
    }
});


app.listen(3000, () => {
    console.log("Server iniciou na porta 3000")
})