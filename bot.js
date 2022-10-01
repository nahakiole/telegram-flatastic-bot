const {Telegraf} = require('telegraf')

const {Flatastic} = require('./flatastic.js')
const LocalSession = require('telegraf-session-local')
var add = require('date-fns/add')
var format = require('date-fns/format')
let eoLocale = require('date-fns/locale/de')

const JSONdb = require('simple-json-db');
const db = new JSONdb('database.json');
const fs = require('fs')
let Imgflip = require('imgflip').default


require('dotenv').config()

var pjson = require('./package.json');
const imgflip = new Imgflip({
    username: process.env.IMGFLIP_USER,
    password: process.env.IMGFLIP_PASSWORD
})

let flatastic = new Flatastic(process.env.FLATASTIC_TOKEN)

const bot = new Telegraf(process.env.BOT_TOKEN)

//bot.use((new LocalSession({database: 'example_db.json'})).middleware())

bot.start((ctx) => ctx.reply('Hey, ich bin der WG Bot!'))
bot.help((ctx) => ctx.reply('Frag mich welche Tasks offen sind'))

let users
if (db.has("users")) {
    users = db.get('users')
} else {
    users = {};
    db.set('users', users);
}

flatastic.getInformation(function (data) {
    for (let i = 0; i < data.flatmates.length; i++) {
        let user = data.flatmates[i];
        users[user.id] = user;
    }
    db.set('users', users);
})

var cron = require('node-cron');

cron.schedule('0 17 * * *', () => {
    setTimeout(function () {
        listTasks()
    }, 60 * 1000 * Math.random())
})

let taskTemplate = {
    1650985: {
        templatesDE: ["chasch du no d chuchi ufrume?"],
        templatesEN: ["can you please clean the kitchen? It's overdue."]
    },
    1446700: {
        templatesDE: ["chasch du no go ichoufe?"],
        templatesEN: ["can you please go buy the groceries? It's overdue."]
    },
    1446702: {
        templatesDE: ["chöntisch du bitte no d läbensmittu ufrume?"],
        templatesEN: ["can you please remove the overdue food?"]
    },
    1446733: {
        templatesDE: ["du sötisch no dr balkon ufrume."],
        templatesEN: ["you should clean the balcony."]
    },
    1926990: {
        templatesDE: ["hesch e idee für e kreative task? Schüsch chasch mau ufem board go luegä."],
        templatesEN: ["do you have an idea for a creative task? Else you can check the board."]
    },
    2297251: {
        templatesDE: ["cha öpper pflanze ufem balkon giessä?"],
        templatesEN: ["can you please water the plant on the balcony?"]
    },
    2512334: {
        templatesDE: ["chasch du no dr ofe putze?"],
        templatesEN: ["can you please clean the oven?"]
    },
    2216033: {
        templatesDE: ["chöntisch du no d tüecher wäsche?"],
        templatesEN: ["can you please wash the cloths?"]
    },
    1446630: {
        templatesDE: ["chöntisch du no ds bad putze?"],
        templatesEN: ["can you please clean the bathroom?"]
    },
    1242269: {
        templatesDE: ["chasch du d bluemä giessä?"],
        templatesEN: ["can you please water the flowers?"]
    },
    1446646: {
        templatesDE: ["chasch du no stoubsuge?"],
        templatesEN: ["can you please vacuum the floor?"]
    },
    1446703: {
        templatesDE: ["chasch du no ds wohnzimmer ufrume?"],
        templatesEN: ["can you please clean the living room?"]
    },
    1242308: {
        templatesDE: ["chasch du no d zahlige mache?"],
        templatesEN: ["can you please do the payments?"]
    },
    1241468: {
        templatesDE: ["chasch du no d petflasche entsorge?"],
        templatesEN: ["can you please dispose the pet bottles?"]
    },
    1446712: {
        templatesDE: ["chasch du no mitem roboter füecht ufnäh?"],
        templatesEN: ["can you please vacuum the floor with the robot?"]
    },
    2012692: {
        templatesDE: ["chasch du no e wg abe organisiere?"],
        templatesEN: ["can you please organize a WG event?"]
    }
}

function getText(user, days, templates) {
    let template = getRandom(templates.templatesDE);
    if (user.language === '1') {
        template = getRandom(templates.templatesEN)
    }
    return template.replace("{name}", user.firstName).replace("{days}", days);
}


function getRandom(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function listTasks() {
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

            var daysUntilTask = (task.timeLeftNext / 60 / 60 / 24);

            var passed = 'heute';
            if (daysUntilTask < 0) {
                passed = "vor " + Math.ceil(Math.abs(daysUntilTask)) + " Tag/en"
            }
            if (daysUntilTask > 1) {
                passed = "in " + Math.ceil(Math.abs(daysUntilTask)) + " Tag/en"
                continue;
            }
            if (task.rotationTime === -1) {
                continue;
            }

            if (task.currentUser !== lastUser) {
                if (task.currentUser === 1181336) {
                    tasks += "\nHallo Zäme, ";
                } else {
                    tasks += "\nHey " + users[task.currentUser].firstName + ", ";
                }

            }

            if (taskTemplate[task.id]) {
                if (lastUser === task.currentUser) {
                    tasks += " U "
                }

                tasks += getText(users[task.currentUser], Math.abs(Math.round(daysUntilTask)), taskTemplate[task.id])
                lastUser = task.currentUser;
                continue;
            }

            tasks += task.title + " "
            tasks += passed + " fällig\n";

            lastUser = task.currentUser;
        }

        let taskList = tasks.trim().split("\n");
        console.log(taskList)

        taskList.forEach(function (task) {
            setTimeout(function () {
                bot.telegram.sendMessage(process.env.TELEGRAM_GROUP, task, {
                    parse_mode: 'HTML'
                })
            }, 3000 * Math.random())
        });

    })
}


cron.schedule('15 15 * * *', () => {
    showShoppingList()
});

bot.hears(/version/i, (ctx) => {
    console.dir(ctx.update)
    ctx.replyWithHTML("Ich bin auf Version " + pjson.version);
})

bot.hears(/meme/i, async (ctx) => {
    await imgflip.meme(`80707627`, {
        captions: [
            `We di anderä ihres ämtli nid mache.`,
        ],
        path: `memes/anderä.png`
    })

    ctx.replyWithPhoto({source: fs.readFileSync('memes/anderä.png')})
})


bot.hears(/showshopping/i, (ctx) => {
    showShoppingList()
});

function showShoppingList() {
    flatastic.getShoppingList(function (data) {
        var output = "";
        data = data.filter(function (a) {
            return a.bought === 0;
        })
        if (data.length === 0) {

        } else {
            output = "Momentan ist folgendes auf der Einkaufsliste:\n";
            let items = [];
            for (const dataKey in data) {
                let item = data[dataKey];
                if (item.bought) {
                    continue;
                }
                items.push(item.itemName)
            }
            output += items.join(", ")

            let oldList = db.get("shoppingList");
            console.log(oldList)
            if (oldList === items.join(", ")) {
                return;
            }
            db.set("shoppingList", items.join(", "))

            bot.telegram.sendMessage(process.env.TELEGRAM_GROUP, output).then(function (message) {
                bot.telegram.pinChatMessage(process.env.TELEGRAM_GROUP, message.message_id)
            })
        }
    })
}


bot.hears(/dailytask/i, (ctx) => {
    listTasks()
})

bot.hears(/wgabe/i, (ctx) => {
    var nextDates = [];

    let test = new Date();
    for (let i = 0; i < 10; i++) {
        test = add(test, {
            days: 1,
        })
        nextDates.push(format(test, "EEEE, dd.MM.yyyy", {
            locale: eoLocale
        }))
    }

    bot.telegram.sendPoll(process.env.TELEGRAM_GROUP, 'Nächster WG Abend?',
        nextDates,
        {is_anonymous: false, allows_multiple_answers: true})
})


bot.hears(/showtasks/i, (ctx) => {

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

            passed = passed + " fällig\n";
            if (task.rotationTime === -1) {
                passed = "\n"
            }

            tasks += passed

            lastUser = task.currentUser;
        }

        console.log(tasks);
        ctx.replyWithHTML(tasks);
    })

});


bot.launch()







