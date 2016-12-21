require('dotenv').config();

const StubHub = require('../lib/stubhub');

const KINGS_GAME_TEST_EVENT_ID = 9640686;

const stubhubClient = new StubHub({
    applicationToken: process.env.APPLICATION_TOKEN,
    consumerKey: process.env.CONSUMER_KEY,
    consumerSecret: process.env.CONSUMER_SECRET,
});

stubhubClient.getEvent(KINGS_GAME_TEST_EVENT_ID)
    .then((data) => {
        console.log(data.body);
    })
    .catch((err) => {
        console.error('something bad happened =[');
        console.error(err);
    });
