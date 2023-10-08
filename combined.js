//--------------------------------   TASK 1   -----------------------------
// ask if want to subscribe or not, if yes then ask location, 
/* store data in DB like this: 
{
    chatId :
    firstName :
    location : 
    isBlocked : <false> by default, can be changed using admin panel 
}
if entry exists in DB means subscribed, else not subscribed
*/
// send daily updates

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { MongoClient, ServerApiVersion } = require('mongodb');

// replace the value below with the Telegram token you receive from @BotFather
const token = '6643391375:AAF9NMQ6ESKs_QO8DUCjICZsJrphofVgA50';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

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

//Web Hooks :->
var awaitingLocationMap = new Map();
bot.onText(/\/subscribe/, async msg => {
    if (await coll.findOne({ chatId: msg.chat.id })) {
        bot.sendMessage(msg.chat.id, "You are already subscribed!");
        return;
    }
    bot.sendMessage(msg.chat.id, "Enter location: ");
    awaitingLocationMap.set(msg.chat.id, true);
});

bot.onText(/\/stop/, msg => {
    try {
        coll.deleteOne({ chatId: msg.chat.id });
    }
    catch (err) {
        console.error("MongoDB error: ", err);
        throw err;
    }
    bot.sendMessage(msg.chat.id, "We won't send you daily weather updates from now on.")
    return;
});

bot.onText(/\/changelocation/, async msg => {
    if (await coll.findOne({ chatId: msg.chat.id })) {
        // bot.sendMessage(msg.chat.id, "You are already subscribed!");
        bot.sendMessage(msg.chat.id, "Enter location: ");
        awaitingLocationMap.set(msg.chat.id, true);
    }
    else {
        bot.sendMessage(msg.chat.id, `You are not subscribed. Do you want to subscribe for daily weather updates?
/subscribe`);
    }
});

bot.on("message", async msg => {

    //check user isBlocked or not, if blocked then send generic message and return
    try {
        if ((await coll.findOne({ chatId: msg.chat.id })).isBlocked) {
            bot.sendMessage(msg.chat.id, "You are blocked by the bot administrator!");
            return;
        }
    }
    catch (err) { console.log(err) }

    if (msg.text === "/subscribe" || msg.text === "/stop" || msg.text === "/changelocation") {
        return;
    }
    else if (awaitingLocationMap.get(msg.chat.id)) {
        const query = { chatId: msg.chat.id };
        const update = {
            $set: {
                chatId: msg.chat.id,
                firstName: msg.chat.first_name,
                location: msg.text,
                lastUpdateSent: new Date(),
                isBlocked: false,
            }
        };

        try {
            coll.updateOne(query, update, { upsert: true });
        }
        catch (err) {
            console.error("MongoDB error: ", err);
            throw err;
        }
        bot.sendMessage(msg.chat.id, `OK! We will send you daily weather updates for ${msg.text}`)
        awaitingLocationMap.set(msg.chat.id, false);
    }
    else {
        bot.sendMessage(msg.chat.id, `Hello ${msg.chat.first_name}, list of commands:
/subscribe
/stop
/changelocation
        `)
    }
});

//Daily updates: (Send daily update to everyone between 9:00 AM and 10:00 AM, temporarily sending every minute)
const sendUpdate = function () {
    coll.find({}).toArray().then(arr => {
        arr.forEach(ele => {
            if (!ele.isBlocked) {
                axios.get("http://api.weatherapi.com/v1/current.json?key=6f7a2008c8b140c2bed111612230710&q=" + ele.location)
                    .then(response => {
                        bot.sendMessage(ele.chatId, `
                        It is ${response.data.current.condition.text} in ${response.data.location.name}, ${response.data.location.region}, ${response.data.location.country} 
                    `).catch(err => console.log("Unable to send weather update to " + ele.chatId));
                    })
                    .catch(err => {
                        bot.sendMessage(ele.chatId, `Unable to fetch details for given location! 
Change Location? /changelocation`);
                    });
            }
        })
    });
}
//sending update every 10 seconds for testing, change delay to 24 hours
setInterval(sendUpdate, 10000);

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