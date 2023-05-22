const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const db = require('./db');


async function retrieveMonitor(keywords, chatID, monitors) {
        // take string keywords and replace whitespace chars with the char '+' for URL
        var keywordsURL = keywords.replace(/ /g, "+");
        // console.log(keywordsURL);
        const response = await axios(`https://www.ebay.com/sch/i.html?_from=R40&_nkw=${keywordsURL}&_sacat=0&_sop=10&rt=nc&LH_BIN=1`);
        const html = await response.data;
        const $ = cheerio.load(html);
        const items = $('li.s-item.s-item__pl-on-bottom');
        monitors.newScraped = [];
        items.each((index, element) => {
            const itemName = $(element).find('div.s-item__title').text();
            const itemPrice = $(element).find('span.s-item__price').text();
            const itemLink = $(element).find('a.s-item__link').attr('href');
            const price = Number(itemPrice.replace(/[^0-9.-]+/g, ""));
            if(itemName != "Shop on eBay Price") { // Creates array of all items found without the Shop on Ebay item
                monitors.newScraped.push({
                    name: itemName,
                    price: itemPrice,
                    link: itemLink
                });
                // console.log(`Name: ${itemName} Price: ${itemPrice}`);
            }
        });
        if(monitors.scraped.length === 0) { // If scrapedMonitors is empty, it will be filled with newScrapedMonitors
            monitors.scraped = monitors.newScraped;
            monitors.newScraped = [];
        } else {
            // Create array that will hold the difference between scrapedMonitors and newScrapedMonitors
            var difference = [];
            for (let i = 0; i < monitors.newScraped.length; i++) {
                let itemExists = false;
                for (let j = 0; j < monitors.scraped.length; j++) {
                  if (monitors.newScraped[i].name === monitors.scraped[j].name) { // assuming each item object has a unique id property
                    itemExists = true;
                    break;
                  }
                }
                if (!itemExists) {
                  difference.push(monitors.newScraped[i]);
                }
              }
            // console.log("Difference between newScrapedMonitors and scrapedMonitors: ");
            // console.log(difference);
            if(difference.length > 0) { // If there is a difference, it will be sent to the user
                difference.forEach(item => {
                    console.log(`New Item Found! Link: ${item.link}`);
                    bot.sendMessage(chatID, `${item.name} for ${item.price} Link: ${item.link}`);
                    // Store the link of the most recent item found in the database
                    db.pool.query('UPDATE monitors SET recentlink = ? WHERE keywords = ? AND chatid = ?', [
                        item.link, keywords, chatID
                      ], function(error, results, fields) {
                        if (error) console.log(error);
                      });
                });

            }
            monitors.scraped = monitors.newScraped;
            monitors.newScraped = []; // newScrapedMonitors will be emptied
        }
};

function addScraper(keywords, chatID, milliseconds) {
    let monitors = {scraped: [], newScraped: []};
    // setInterval will call retrieveMonitor in the specified interval of milliseconds
    setInterval(() => {
        retrieveMonitor(keywords, chatID, monitors).catch(error => {
            console.error(`Failed to retrieve monitor for keywords "${keywords}" and chatID "${chatID}":`, error);
        });
    }, milliseconds);
}

module.exports.addScraper = addScraper;