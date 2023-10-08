//--------------------------------   TASK 2   -----------------------------
// ADMIN CONSOLE:
// Change Bot name: use Telegram Bot API URL to change name  like bot.setMyName("Tphri maa avicoomar");
// Block user: set isBlocked to true in my database
// Delete user: delete entry from my database
// Change token: will figure this out later

//BC api ko restrict kaise karu??

const express = require("express");
const { google } = require("googleapis");
const dotenv = require('dotenv');
var jwt = require("jsonwebtoken");
const path = require('path');

const { MongoClient, ServerApiVersion } = require('mongodb');

dotenv.config();

const ADMINISTRATORS = ["avnaneet@gmail.com", "xyz@gmail.com"];

const app = express();

//cors related stuff (COMMENT LATER)
const cors = require('cors');
app.use(cors());

const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
)

//Mongo db stuff
const uri = "mongodb+srv://avnaneet:Avnaneet%40123@cluster0.ctszd6b.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
const coll = client.db("WeatherBotDB").collection("WeatherBotCollection");

app.use(express.static(path.join(__dirname, 'build')));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.get("/getUsersInfo", (req, res) => {
    if (!req.header("Authorization")) { res.send("No JWT Header present") }
    else {
        try{
            console.log(jwt.verify(req.header("Authorization"), "SOME_SECRET_KEY"));
            // res.send("Sensitive data");
            coll.find({}).toArray().then(data => {
                res.send(data)
            });
        }
        catch(err){
            res.send("JWT Verification falied");
        }
        
    }
});

app.get("/deleteUser", (req, res) => {
    if (!req.header("Authorization")) { res.send("No JWT Header present") }
    else {
        try{
            console.log(jwt.verify(req.header("Authorization"), "SOME_SECRET_KEY"));
            coll.deleteOne({ chatId: parseInt(req.query.chatId) }).then(data => res.send(data));
        }
        catch(err){
            res.send("JWT Verification falied");
        }
        
    }
});

app.get("/blockUser", (req, res) => {
    if (!req.header("Authorization")) { res.send("No JWT Header present") }
    else {
        try{
            console.log(jwt.verify(req.header("Authorization"), "SOME_SECRET_KEY"));
            const query = { chatId: parseInt(req.query.chatId) };
            const update = {
                $set: {
                    isBlocked: true,
                }
            };
            coll.updateOne(query, update);
        }
        catch(err){
            res.send("JWT Verification falied");
        }
    }
});

app.get('/auth/google', (req, res) => {
    const url = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
        ]
    })
    res.redirect(url);
});

app.get('/redirect', async (req, res) => {
    const { code } = req.query;
    oAuth2Client.getToken(code, async (err, token) => {

        if (err) { res.send("Error-------Write something meaningful later") }

        console.log(token);
        oAuth2Client.setCredentials(token);

        //Get Google account details
        let people = google.people({ version: "v1", auth: oAuth2Client });
        let userInfo = await people.people.get({
            resourceName: 'people/me',
            personFields: 'emailAddresses,names',
        })
        userInfo.data.emailAddresses.forEach(ele => {
            if (ADMINISTRATORS.includes(ele.value)) {
                //check if admin or not, if yes then sign a jwt and send, if no then res.send("not an admin")
                // in every API call check if jwt is valid or not.
                const jwt_token = jwt.sign(ele.value, "SOME_SECRET_KEY");
                res.cookie("jwt_token", jwt_token);
                res.cookie("access_token", token.access_token);
                res.redirect("/");
            }
            else {
                res.send("This account is not an ADMIN!");
            }
        });

        // res.redirect("http://localhost:5000/")
    });
});

app.get('/revoke', async (req, res) => {
    res.clearCookie("jwt_token");
    res.clearCookie("access_token");
    oAuth2Client.revokeToken(req.query.access_token)
        .then(() => {
            res.redirect("/");
            // res.send({ revokeStatus: true });
        })
        .catch(err => res.redirect("/"));
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));