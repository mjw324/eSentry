const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');
const nodemailer = require('nodemailer');
const db = require('./db');
const bot_token = process.env.DEVBUILD == 1 ? process.env.TELEGRAM_DEVBOT_TOKEN : process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(bot_token, { polling: true });
const monitorIntervals = new Map();


// SMTP configuration for server email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 465,
  secure: true, // true for port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // Only use this for development or trusted networks
  }
});


function sendEmailAlert(item, keywords, recipientEmail) {
  const mailOptions = {
    from: `"Monitor Alert" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: `New Item Found: ${item.name}`,
    html: `🔍 <b>Search:</b> ${keywords} <br/><br/>
           🏷️ <b>Product:</b> ${item.name} <br/><br/>
           💰 <b>Price:</b> ${item.price}<br/><br/>
           <a href="${item.link}">🛒 View Item on eBay</a>
           <br><br>
           <hr>
           <p><i>If the found item doesn't fully match your search criteria, please visit <a href="https://www.esentry-notify.com/">eSentry</a> to refine your search with excluded keywords.</i></p>
           <p><i>If you no longer wish to receive alerts, you can delete your monitor on <a href="https://www.esentry-notify.com/">eSentry</a>.</i></p>`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(`Error sending email: ${error}`);
    }
    console.log(`Email sent: ${info.messageId}`);
  });
}


async function retrieveMonitor(url, monitorObj) {
  const response = await axios(url);
  const html = response.data;
  const $ = cheerio.load(html);
  monitorObj.newScraped = [];

  $('li.s-item.s-item__pl-on-bottom').each((index, element) => {
    const itemName = $(element).find('div.s-item__title').text().replace('New Listing', '');
    const itemPrice = $(element).find('span.s-item__price').text();
    const itemLink = $(element).find('a.s-item__link').attr('href');

    monitorObj.newScraped.push({ name: itemName, price: itemPrice, link: itemLink });
  });

  // Initial population of scraped items if empty
  if (monitorObj.scraped.length === 0) {
    monitorObj.scraped = [...monitorObj.newScraped];
    monitorObj.newScraped = [];
  } else {
    let difference = monitorObj.newScraped.filter(newItem => !monitorObj.scraped.some(scrapedItem => newItem.name === scrapedItem.name));

    if (difference.length) {
      console.log("New items found:", difference.slice(0, 3)); // Log the first three new items found

      difference.slice(0, 3).forEach(item => {
        console.log(`New Item Found! Link: ${item.link}`);
        // Send Telegram alert if chatid is present
        if (monitorObj.chatid) {
          console.log(monitorObj.chatid);
          bot.sendMessage(monitorObj.chatid, `🔍 <b>Search:</b> ${monitorObj.keywords}\n\n🏷️ <b>Product:</b> ${item.name}\n\n💰 <b>Price:</b> ${item.price}\n\n<a href="${item.link}">🛒 View Item on eBay</a>`, { parse_mode: "HTML" });
        }
        // Send email alert if email is present
        if (monitorObj.email) {
          sendEmailAlert(item, monitorObj.keywords, monitorObj.email);
        }
      });
      
      // Update the database with the most recent link from the first item in the difference array
      const mostRecentItem = difference[0];
      db.pool.query('UPDATE monitors SET recentlink = ? WHERE id = ?', [mostRecentItem.link, monitorObj.id], function (error) {
        if (error) console.log(error);
      });

    } else {
      console.log(`No new results for ${monitorObj.keywords}`);
    }

    // Update scraped items after processing
    monitorObj.scraped = [...monitorObj.newScraped];
  }
}

function addScraper(monitorObj, milliseconds) {
  var url = `https://www.ebay.com/sch/i.html?_from=R40&_sacat=0&LH_BIN=1&_sop=10&rt=nc&_nkw=`;

  // take specified keywords and replace whitespace chars with the char '+' for URL
  url += monitorObj.keywords.replace(/ /g, "+");
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
  monitorObj.scraped = [];
  monitorObj.newScraped = [];
  // setInterval will call retrieveMonitor in the specified interval of milliseconds
  const intervalID = setInterval(() => {
    retrieveMonitor(url, monitorObj).catch(error => {
      console.error(`Failed to retrieve monitor for keywords "${monitorObj.keywords}" and chatid "${monitorObj.chatid}":`, error);
    });
  }, milliseconds);
  console.log(`Starting scraper for monitor ID ${monitorObj.id} with interval ID ${intervalID}`);
  monitorIntervals.set(monitorObj.id, intervalID)
  console.log(`Current monitorIntervals:`, monitorIntervals)
}

function stopScraper(monitorID) {
  const intervalID = monitorIntervals.get(monitorID)
  if (intervalID) {
    console.log(`Stopping scraper for monitor ID ${monitorID} with interval ID ${intervalID}`)
    clearInterval(intervalID)
    monitorIntervals.delete(monitorID)
  } else {
    console.log(`No active scraper interval found for monitor ID ${monitorID}.`)
  }
}

module.exports = { addScraper, stopScraper };