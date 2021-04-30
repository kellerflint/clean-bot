const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require("fs");

const prefix = '!';

// in hours
const runInterval = 1; // 1
const earlyReminderInterval = 24; // 24
const lateReminderInterval = 12; // 12
const earlyReminderThreshold = 6; // 6
const lateReminderThreshold = 48; // 48

function between(min, max) {
    return Math.floor(
        Math.random() * (max - min) + min
    )
}

function sendReminder(messageClient, task) {
    messageClient.channels.cache.find(i => i.name === 'general').send('@everyone ' + task.task);
}

function reminders() {
    fs.readFile("data.json", function (err, data) {
        if (err) throw err;
        const tasks = JSON.parse(data);
        tasks.forEach(e => {
            console.log("Checking reminders")

            console.log("Date: " + new Date(e.lastreminder).toString());

            console.log("Hours: " + Math.abs((new Date(Date.now()) - new Date(e.lastreminder)) / 36e5));

            let dateCreatedHours = Math.abs((new Date(Date.now()) - new Date(e.datetime)) / 36e5);
            let lastReminderHours = Math.abs((new Date(Date.now()) - new Date(e.lastreminder)) / 36e5);

            if (dateCreatedHours < earlyReminderThreshold) {
                if (lastReminderHours > earlyReminderInterval) {
                    sendReminder(client, e);
                    console.log("ran early");
                    for (let i = 0; i < tasks.length; i++) {
                        if (tasks[i].id == e.id) {
                            tasks[i].lastreminder = Date.now();
                        }
                    }

                }
            } else if (earlyReminderThreshold < dateCreatedHours && dateCreatedHours < lateReminderThreshold) {
                if (lastReminderHours > lateReminderInterval) {
                    sendReminder(client, e);
                    console.log("ran late");
                    for (let i = 0; i < tasks.length; i++) {
                        if (tasks[i].id == e.id) {
                            tasks[i].lastreminder = Date.now();
                        }
                    }
                }
            } else {
                sendReminder(client, e);
                console.log("ran else");
                for (let i = 0; i < tasks.length; i++) {
                    if (tasks[i].id == e.id) {
                        tasks[i].lastreminder = Date.now();
                    }
                }
            }

            fs.writeFile("data.json", JSON.stringify(tasks), err => {
                if (err) throw err;
                console.log("Done writing!");
            });

        });
    });

}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    setInterval(reminders, runInterval * 3600000);
});

client.on('message', msg => {

    // for @ing the bot
    if (msg.author.bot) return false;
    if (msg.content.includes('@here') || msg.content.includes('@everyone')) return false;
    if (msg.content.startsWith(prefix)) {

        // parse command
        const args = msg.content.substr(1).split(" ");

        // single command
        let command = args[0].toLocaleLowerCase();

        if (command == "ping") {
            msg.channel.send("clean-bot online");
            return false;
        } else if (command == "test") {
            reminders();
            return false;
        }

        if (args.length < 2) {
            msg.channel.send("Invalid input. The command you entered does not exist.");
            return false;
        }

        // commands with one or more parameters
        let taskName = args[1].toLocaleLowerCase();

        switch (command) {
            case "task":
                fs.readFile("data.json", function (err, data) {
                    if (err) throw err;
                    const tasks = JSON.parse(data);

                    let newTask = {
                        id: between(1000, 9999),
                        task: taskName,
                        datetime: Date.now(),
                        lastreminder: Date.now()
                    };

                    tasks.push(newTask);

                    fs.writeFile("data.json", JSON.stringify(tasks), err => {
                        if (err) throw err;
                        console.log("Done writing!");
                    });

                    sendReminder(client, newTask);

                });
                break;
            default:
                msg.channel.send("Invalid input. The command you entered does not exist.");
                break;
        }
    }

});

fs.readFile("secrets.json", function (err, data) {
    if (err) throw err;
    const f = JSON.parse(data);
    client.login(f.token);
});


//nodemon --inspect index.js

//remember to create data.json on new systems