const {Telegraf} = require('telegraf')

const {Flatastic} = require('./flatastic.js')

require('dotenv').config()

var pjson = require('./package.json');


let flatastic = new Flatastic(process.env.FLATASTIC_TOKEN)

const bot = new Telegraf(process.env.BOT_TOKEN)
bot.start((ctx) => ctx.reply('Welcome!'))
bot.help((ctx) => ctx.reply('Send me a sticker'))

let users = {}
flatastic.getInformation(function (data) {
    for (const key in data.flatmates) {
        let user = data.flatmates[key];
        users[user.id] = user;
    }

})


bot.hears(/version/i, (ctx) => {
    ctx.replyWithHTML( pjson.version);
})

bot.hears(/einkaufsliste|ichoufe|einkaufen|kaufen|shopping/i, (ctx) => {
    flatastic.getShoppingList(function (data) {
        var output = "";
        data = data.filter(function (a){
            return a.bought === 0;
        })
        console.log(data)
        if (data.length === 0){
            output = "Die Einkaufsliste ist leer."
        }
        else {
            output = "<b>Einkaufsliste</b>\n";
            for (const dataKey in data) {
                let item = data[dataKey];
                if (item.bought){
                    continue;
                }

                output += item.itemName + " hinzugefügt von " + users[item.inserterId].firstName  +"\n"
            }
        }

        ctx.replyWithHTML(output);
    })
});


bot.hears(/task|aufgabe|ämtli/i, (ctx) => {

    flatastic.getTaskList(function (data) {
        var tasks = "";
        data = data.sort(function (x, y) {
            let n = x.currentUser - y.currentUser;
            if (n !== 0) {
                return n;
            }

            return x.timeLeftNext - y.timeLeftNext;
        });
        let lastUser = 0;
        for (const dataKey in data) {
            let task = data[dataKey];

            if (task.currentUser !== lastUser){
                tasks += "\n<b>"+users[task.currentUser].firstName+ "</b>\n";
            }

            tasks += task.title + " "

            var daysUntilTask = (task.timeLeftNext / 60 / 60 / 24);
            var passed = 'heute';
            if (daysUntilTask < 0) {
                passed = "vor " + Math.ceil(Math.abs(daysUntilTask)) + " Tag/en"
            }
            if (daysUntilTask > 1) {
                passed = "in " + Math.ceil(Math.abs(daysUntilTask)) + " Tag/en"
            }

            tasks += passed +" fällig\n";

            lastUser = task.currentUser;
        }

        console.log(tasks);
        ctx.replyWithHTML(tasks);
    })

});


bot.launch()







