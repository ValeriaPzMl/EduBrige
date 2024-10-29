const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));
app.engine("ejs", require("ejs").renderFile);
app.set("view engine", "ejs");

app.route('/')
    .get((req, res) => {
        res.render("home");
    })
    .post((req, res) => {

    });

app.listen(3000);