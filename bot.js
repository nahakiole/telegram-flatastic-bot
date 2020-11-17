const {Telegraf} = require('telegraf')

const {Flatastic} = require('./flatastic.js')
const LocalSession = require('telegraf-session-local')

require('dotenv').config()

let flatastic = new Flatastic(process.env.FLATASTIC_TOKEN)

const bot = new Telegraf(process.env.BOT_TOKEN)

bot.use((new LocalSession({database: 'example_db.json'})).middleware())

bot.start((ctx) => ctx.reply('Welcome!'))
bot.help((ctx) => ctx.reply('Send me a sticker'))

let users = {}
flatastic.getInformation(function (data) {
    for (const key in data.flatmates) {
        let user = data.flatmates[key];
        users[user.id] = user;
    }
})

var cron = require('node-cron');

cron.schedule('00 15 * * *', () => {

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

            if (task.currentUser !== lastUser) {
                tasks += "\n<b>" + users[task.currentUser].firstName + "</b>\n";
            }

            var daysUntilTask = (task.timeLeftNext / 60 / 60 / 24);
            var passed = 'heute';
            if (daysUntilTask < 0) {
                passed = "vor " + Math.ceil(Math.abs(daysUntilTask)) + " Tag/en"
            }
            if (daysUntilTask > 1) {
                continue;
            }
            tasks += task.title + " "
            tasks += passed + " fällig\n";

            lastUser = task.currentUser;
        }

        bot.telegram.sendMessage(process.env.TELEGRAM_GROUP, tasks, {
            parse_mode: 'HTML'
        })

    })

})

cron.schedule('0 12 * * *', () => {
    flatastic.getShoppingList(function (data) {
        var output = "";
        data = data.filter(function (a) {
            return a.bought === 0;
        })
        if (data.length === 0) {

        } else {
            output = "Momentan ist folgendes auf der Einkaufsliste:\n";
            for (const dataKey in data) {
                let item = data[dataKey];
                if (item.bought) {
                    continue;
                }

                output += item.itemName + " hinzugefügt von " + users[item.inserterId].firstName + "\n"
            }
            bot.telegram.sendMessage(process.env.TELEGRAM_GROUP, output)
        }

    })
});

bot.hears(/einkaufsliste|ichoufe|einkaufen|kaufen|shopping/i, (ctx) => {
    console.dir(ctx.update.message.chat)
    flatastic.getShoppingList(function (data) {
        var output = "";
        data = data.filter(function (a) {
            return a.bought === 0;
        })
        console.log(data)
        if (data.length === 0) {
            output = "Die Einkaufsliste ist leer."
        } else {
            output = "<b>Einkaufsliste</b>\n";
            for (const dataKey in data) {
                let item = data[dataKey];
                if (item.bought) {
                    continue;
                }

                output += item.itemName + " hinzugefügt von " + users[item.inserterId].firstName + "\n"
            }
        }

        ctx.replyWithHTML(output);
    })
});

bot.hears(/counter/i, (ctx, next) => {
    ctx.session.counter = ctx.session.counter || 0
    ctx.session.counter = ctx.session.counter * 2
    ctx.replyWithMarkdown(`Counter updated, new value: \`${ctx.session.counter}\``)
    return next()
})

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

            if (task.currentUser !== lastUser) {
                tasks += "\n<b>" + users[task.currentUser].firstName + "</b>\n";
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

            tasks += passed + " fällig\n";

            lastUser = task.currentUser;
        }

        console.log(tasks);
        ctx.replyWithHTML(tasks);
    })

});


bot.launch()







