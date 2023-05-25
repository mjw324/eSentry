const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const db = require('./db');

// keywords object JSON format. Example is for a "new" condition "iphone" with a price range of $100-$500, excluding "pro" and "max" keywords
// {
//   "keywords": "iphone",
//   "min": 100,
//   "max": 500,
//   "new": true,
//   "open_box": false,
//   "used": false,
//   "exclude": "pro max"
// }
async function retrieveMonitor(url, chatid, monitors, keywords) {
  const response = await axios(url);
  const html = await response.data;
  const $ = cheerio.load(html);
  const items = $('li.s-item.s-item__pl-on-bottom');
  monitors.newScraped = [];
  // Loop through each item found and add it to the newScrapedMonitors array
  items.each((index, element) => {
    // itemName sometimes has the format of "New Listing<item name>", which is when we remove it
    const itemName = $(element).find('div.s-item__title').text().replace('New Listing', '');
    const itemPrice = $(element).find('span.s-item__price').text();
    const itemLink = $(element).find('a.s-item__link').attr('href');

    monitors.newScraped.push({
      name: itemName,
      price: itemPrice,
      link: itemLink
    });
  });
  if (monitors.scraped.length === 0) { // If scrapedMonitors is empty (when scraping loop first starts), it will be filled with newScrapedMonitors
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
    console.log("Difference between newScrapedMonitors and scrapedMonitors: ");
    console.log(difference);
    if (difference.length > 0) { // If there is a difference, the first three will be sent to the user
      
      // The following commented out code is for every item found in the difference. For less spam on the user's end, only the first three will be sent
      
      // difference.forEach(item => {
      //   console.log(`New Item Found! Link: ${item.link}`);
      //   bot.sendMessage(chatid, `${item.name} for ${item.price} Link: ${item.link}`);
      //   // Store the link of the most recent item found in the database
      //   db.pool.query('UPDATE monitors SET recentlink = ? WHERE keywords = ? AND chatid = ?', [
      //     item.link, keywords, chatid
      //   ], function (error, results, fields) {
      //     if (error) console.log(error);
      //   });
      // });
      
      for (let i = 0; i < Math.min(3, difference.length); i++) {
        let item = difference[i];
        console.log(`New Item Found! Link: ${item.link}`);
        bot.sendMessage(chatid, `🔍 <b>Search:</b> \n${keywords} \n\n🏷️ <b>Product:</b> \n${item.name} \n\n💰 <b>Price:</b> \n${item.price}\n\n<a href="${item.link}">🛒 Item on eBay</a>`, {parse_mode: "HTML"});
        // Store the link of the most recent item found in the database
        db.pool.query('UPDATE monitors SET recentlink = ? WHERE keywords = ? AND chatid = ?', [
          item.link, keywords, chatid
        ], function (error, results, fields) {
          if (error) console.log(error);
        });
      }
    }
    monitors.scraped = monitors.newScraped;
    monitors.newScraped = []; // newScrapedMonitors will be emptied
  }
};

function addScraper(monitorObj, milliseconds) {

  var url = `https://www.ebay.com/sch/i.html?_from=R40&_sacat=0&LH_BIN=1&_sop=10&rt=nc&_nkw=`;

  // take specified keywords and replace whitespace chars with the char '+' for URL
  url+= monitorObj.keywords.replace(/ /g, "+");
  // add exclude keywords to URL if specified
  monitorObj.exclude_keywords ? url += `+-${monitorObj.exclude_keywords.replace(/ /g, "+-")}` : null;
  // add conditions to url if specified
  let condition = '';
  monitorObj.condition_new ? condition += '1000|' : null;
  monitorObj.condition_open_box ? condition += '1500|' : null;
  monitorObj.condition_used ? condition += '3000|' : null;
  if (condition.endsWith('|')) {
    condition = condition.slice(0, -1);  // removes trailing pipe char '|'
  }
  // If condition is not empty, add parameter to the URL
  condition ? url += `&LH_ItemCondition=${condition}` : null;

  // add price range filter if specified
  monitorObj.min_price ? url += `&_udlo=${monitorObj.min_price}` : null;
  monitorObj.max_price ? url += `&_udhi=${monitorObj.max_price}` : null;

  // console.log(`URL: ${url}`);
  let monitors = {scraped: [], newScraped: []};
  // setInterval will call retrieveMonitor in the specified interval of milliseconds
  setInterval(() => {
    retrieveMonitor(url, monitorObj.chatid, monitors, monitorObj.keywords).catch(error => {
      console.error(`Failed to retrieve monitor for keywords "${monitorObj.keywords}" and chatid "${monitorObj.chatid}":`, error);
    });
  }, milliseconds);
}

module.exports.addScraper = addScraper;