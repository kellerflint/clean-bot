// clean-bot: Version 1
// author: Keller Flint

const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require("fs");

// things loaded from secrets
var guildId;
var channelId;

fs.readFile("secrets.json", function (err, data) {
    if (err) throw err;
    const f = JSON.parse(data);

    // production creds
    //guildId = f.guildId;
    //channelId = f.channelId;

    // dev creds
    guildId = f.devGuildId;
    channelId = f.devChannelId;

    client.login(f.token);
});

const prefix = '!';

// in hours
const runInterval = 1;
const earlyReminderInterval = 12;
const lateReminderInterval = 6;
const earlyReminderThreshold = 24;
const lateReminderThreshold = 48;

function between(min, max) {
    return Math.floor(
        Math.random() * (max - min) + min
    )
}

function updateTaskReminderDate(tasks, item) {
    for (let i = 0; i < tasks.length; i++) {
        if (tasks[i].id == item.id) {
            tasks[i].lastreminder = Date.now();
        }
    }
    return tasks;
}

const removeEmptyOrNull = (obj) => {
    Object.keys(obj).forEach(k =>
        (obj[k] && typeof obj[k] === 'object') && removeEmptyOrNull(obj[k]) ||
        (!obj[k] && obj[k] !== undefined) && delete obj[k]
    );
    return obj;
};

function sendReminder(task) {
    //messageClient.channels.cache.find(i => i.name === 'general').send();
    client.guilds.resolve(guildId).channels.resolve(channelId).send(`Task: **${task.task}** \nID: ${task.id} \nAssigned: ${task.assignedTo}\nDescription: ${task.desciption}`);
}

function sendMessage(message) {
    //messageClient.channels.cache.find(i => i.name === 'general').send();
    client.guilds.resolve(guildId).channels.resolve(channelId).send(message);
}

function reminders() {
    fs.readFile("data.json", function (err, data) {
        if (err) throw err;
        let tasks = JSON.parse(data);
        tasks.forEach(e => {
            console.log("Checking reminders")

            console.log("Date: " + new Date(e.lastreminder).toString());

            console.log("Hours: " + Math.abs((new Date(Date.now()) - new Date(e.lastreminder)) / 36e5));

            let dateCreatedHours = Math.abs((new Date(Date.now()) - new Date(e.datetime)) / 36e5);
            let lastReminderHours = Math.abs((new Date(Date.now()) - new Date(e.lastreminder)) / 36e5);

            if (dateCreatedHours < earlyReminderThreshold) {
                if (lastReminderHours > earlyReminderInterval) {
                    sendReminder(e);
                    console.log("ran early");
                    tasks = updateTaskReminderDate(tasks, e);
                }
            } else if (earlyReminderThreshold < dateCreatedHours && dateCreatedHours < lateReminderThreshold) {
                if (lastReminderHours > lateReminderInterval) {
                    sendReminder(e);
                    console.log("ran late");
                    tasks = updateTaskReminderDate(tasks, e);
                }
            } else if (lastReminderHours > runInterval) {
                sendReminder(e);
                console.log("ran else");
                tasks = updateTaskReminderDate(tasks, e);
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

    if (msg.author.bot) return false;
    if (msg.content.startsWith(prefix)) {

        // parse command
        const args = msg.content.substr(1).split(" ");

        // single command
        let command = args[0].toLocaleLowerCase();

        if (command == "ping") {
            msg.channel.send("clean-bot online");
            return false;
        } else if (command == "reminders") {
            fs.readFile("data.json", function (err, data) {
                if (err) throw err;
                let tasks = JSON.parse(data);
                tasks.forEach(e => {
                    sendReminder(e);
                });
            });
            return false;
        } else if (command == "help") {
            msg.channel.send("Commands: \n" +
                "**!help** -> Show list of available commands\n" +
                "**!ping** -> Test if clean-bot is online\n" +
                "**!reminders** -> Show a list of all incomplete tasks\n" +
                "**!task {TaskName} {@username} {Task Description ...}** -> Assign a task. All arguments after the TaskName are optional. No spaces in the TaskName but there can be spaces in the description\n" +
                "**!done {id}** -> Complete a task with the given ID");
            return false;
        }

        if (args.length < 2) {
            msg.channel.send("Invalid input. The command you entered does not exist.");
            return false;
        }

        // commands with one or more parameters
        let taskName = args[1];

        switch (command) {
            case "task":
                fs.readFile("data.json", function (err, data) {
                    if (err) throw err;
                    const tasks = JSON.parse(data);

                    let mentions = "@everyone";
                    let isAssigned = false;

                    if (args.length > 2 && args[2].startsWith("<@")) {
                        mentions = args[2];
                        isAssigned = true;
                    }

                    console.log(args[2]);

                    let desciption = "";
                    if (args.length > 3) {
                        let wordArray = [];
                        if (isAssigned) {
                            wordArray = args.splice(3, args.length);
                        } else {
                            wordArray = args.splice(2, args.length);
                        }
                        desciption = wordArray.join(" ");
                    }

                    let newTask = {
                        id: between(1000, 9999),
                        task: taskName,
                        datetime: Date.now(),
                        lastreminder: Date.now(),
                        assignedTo: mentions,
                        desciption: desciption
                    };

                    //client.guilds.resolve(guildId).channels.resolve(channelId).send(`${mention}`);

                    //console.log(msg);

                    tasks.push(newTask);

                    fs.writeFile("data.json", JSON.stringify(tasks), err => {
                        if (err) throw err;
                        console.log("Done writing!");
                    });

                    sendReminder(newTask);

                });
                break;
            case "done":
                fs.readFile("data.json", function (err, data) {
                    if (err) throw err;
                    let tasks = JSON.parse(data);
                    // rebuilding the json array like this is so god damn stupid but when I use delete it insists on leaving null values in my json and splice doesn't seem to work at all
                    let newTasks = [];

                    for (let i = 0; i < tasks.length; i++) {
                        if (tasks[i].id == args[1]) {
                            sendMessage("Task: " + tasks[i].task + " ID:" + tasks[i].id + " resolved.");
                        } else {
                            newTasks.push(tasks[i]);
                        }
                    }

                    fs.writeFile("data.json", JSON.stringify(newTasks), err => {
                        if (err) throw err;
                        console.log("Done writing!");
                    });

                });
                break;
            default:
                msg.channel.send("Invalid input. The command you entered does not exist.");
                break;
        }
    }

});


//nodemon --inspect index.js for dev stuff

//remember to create data.json on new systems & secrets.json

// use npm install discord.js to install dependent packages

// running on the server with pm2:  npm install pm2@latest -g
// pm2 start index.js
// https://pm2.keymetrics.io/docs/usage/quick-start/