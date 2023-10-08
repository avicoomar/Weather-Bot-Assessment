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