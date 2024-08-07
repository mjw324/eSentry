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

function sendEmailAlert(items, keywords, recipientEmail) {
  const itemsHtml = items.map(item => `
    <div style="margin-bottom: 20px; text-align: center;">
      <img src="${item.image}" alt="${item.name}" style="max-width: 100%; height: auto; border-radius: 5px;">
      <h3 style="color: #3C6E71;">${item.name}</h3>
      <p style="color: #393a3d; font-size: 16px;">Price: <strong>${item.price}</strong></p>
      <a href="${item.link}" style="font-size: 14px; color: #F4743B; text-decoration: none;"><strong>View Item on eBay</strong></a>
    </div>
  `).join('');

  const mailOptions = {
    from: `"Monitor Alert" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: `New eBay Listing Found - ${keywords}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #393a3d;">
        <div style="background-color: #F4743B; padding: 10px; border-radius: 5px; margin: 30px auto; width: fit-content;">
          <h2 style="color: #3C6E71; font-size: 22px; text-align: center;">New Items Found!</h2>
          <p style="color: #FFFFEB; font-size: 18px; text-align: center;">Results for your ${keywords}</p>
        </div>
        ${itemsHtml}
        <br>
        <hr style="margin-top: 30px;">
        <h1 style="color: #3C6E71; font-size: 24px; text-align: center;">
          Discover Rare eBay Finds Instantly.
        </h1>
        <p style="color: #0C1717; text-align: center; font-size: 18px; margin-top: 20px;">
          <strong>eSentry alerts you about new eBay listings matching your customized preferences, ensuring you never miss out on the perfect deal.</strong>
        </p>
        <p style="color: #0C1717; font-size: 12px; text-align: center;"><i>If the found item doesn't fully match your search criteria, please visit <a href="https://www.esentry-notify.com/" style="color: #F4743B; text-decoration: none;">eSentry</a> to refine your search with excluded keywords.</i></p>
        <p style="color: #0C1717; font-size: 12px; text-align: center;"><i>If you no longer wish to receive alerts, you can delete your monitor on <a href="https://www.esentry-notify.com/" style="color: #F4743B; text-decoration: none;">eSentry</a>.</i></p>
      </div>
    `
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
    const itemImage = $(element).find('div.s-item__image-wrapper img').attr('src');
    monitorObj.newScraped.push({ name: itemName, price: itemPrice, link: itemLink, image: itemImage });
  });

  // Initial population of scraped items if empty
  if (monitorObj.scraped.length === 0) {
    monitorObj.scraped = [...monitorObj.newScraped];
    monitorObj.newScraped = [];
  } else {
    let difference = monitorObj.newScraped.filter(newItem => !monitorObj.scraped.some(scrapedItem => newItem.name === scrapedItem.name));
    if (difference.length) {
      console.log("New items found:", difference.slice(0, 3)); // Log the first three new items found
    
      // Constructing the base message content for Telegram
      let baseMessageContent = '🔍';
      if (monitorObj.keywords) baseMessageContent += ` <b>Search</b> ${monitorObj.keywords}`;
      if (monitorObj.seller) baseMessageContent += ` <b>From Seller:</b> ${monitorObj.seller}`;
    
      // Send Telegram alert if chatid is present
      if (monitorObj.chatid) {
        let messageContent = baseMessageContent;
        difference.slice(0, 3).forEach(item => {
          messageContent += `\n\n🏷️ <b>Product:</b> ${item.name}\n💰 <b>Price:</b> ${item.price}\n<a href="${item.link}">🛒 View Item on eBay</a>\n`;
        });
        bot.sendMessage(monitorObj.chatid, messageContent, { parse_mode: "HTML" })
            .catch(error => {
              if (error.response && error.response.statusCode === 400) {
                console.error(`Error sending Telegram message: ${error.response.body.description}`);
                stopScraper(monitorObj.id);
              }
            });
      }
    
      // Send email alert if email is present
      if (monitorObj.email) {
        let emailKeywords = monitorObj.keywords ? `Search ${monitorObj.keywords}` : '';
        emailKeywords += monitorObj.seller ? ` from Seller ${monitorObj.seller}` : '';
        sendEmailAlert(difference.slice(0, 3), emailKeywords, monitorObj.email);
      }
    
      // Update the database with the most recent link from the first item in the difference array
      const mostRecentItem = difference[0];
      db.pool.query('UPDATE monitors SET recentlink = ? WHERE id = ?', [mostRecentItem.link, monitorObj.id], function (error) {
        if (error) console.log(error);
      });
    } else {
      console.log(`No new results for ${monitorObj.keywords}`);
    }

    // Update scraped items after processing (shallow copy ... for better performance)
    monitorObj.scraped = [...monitorObj.newScraped];
  }
}

function addScraper(monitorObj, milliseconds) {
  var url = `https://www.ebay.com/sch/i.html?_from=R40&_sacat=0&LH_BIN=1&_sop=10&rt=nc&_nkw=`;
  
  // take specified keywords and replace whitespace chars with the char '+' for URL
  monitorObj.keywords ? url += monitorObj.keywords.replace(/ /g, "+") : null;
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
  monitorObj.seller ? url += `&_saslop=1&_sasl=${monitorObj.seller}` : null;
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

async function grabItemSoldHistory(monitorObj) {
  // ipg can change between 60, 120, and 240 - change according to how many items you want to scrape. This affects response time
  var url = `https://www.ebay.com/sch/i.html?LH_Complete=1&LH_Sold=1&LH_PrefLoc=1&_ipg=120&_nkw=`;
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
    monitorObj.seller ? url += `&_saslop=1&_sasl=${monitorObj.seller}` : null;
    // Retrieve the sold history of the item
    const response = await axios(url);
    const html = response.data;
    const $ = cheerio.load(html);
    soldHistory = [];
    $('li.s-item.s-item__pl-on-bottom').each((index, element) => {
      const itemPrice = $(element).find('span.s-item__price').first().text();
      if (!itemPrice) {
        console.warn('Item price not found, skipping item.');
        return; // Skip this iteration if price is not found
      } else{
        // Price needs to be in this format: '$975.00', else it will be skipped
        if (!itemPrice.match(/^\$\d+(\.\d{2})?$/)) {
          console.warn('Invalid price format, skipping item.');
          return; // Skip this iteration if price is not in the correct format
        }
      }
      let soldDate = $(element).find('div.s-item__caption div.s-item__caption--row span.POSITIVE').first().text().replace('Sold', '').trim();
      if(!soldDate) {
        console.warn('Sold Date not found, skipping item.');
        return; // Skip this iteration if price is not found
      }
      soldHistory.push({ price: itemPrice, date: soldDate });
    });
    return soldHistory;
}

async function retrieveAmazonMonitor(url, monitorObj) {
  try {
    const response = await axios(url);
    const html = response.data;
    const $ = cheerio.load(html);

    if (!html || html.trim() === '') {
      console.error(`No HTML returned for URL: ${url}`);
      stopAmazonScraper(monitorObj.id);
      return;
    }

    // Find the element that contains the used price
    const usedPriceElement = $('div[data-csa-c-slot-id="usedAccordionRow"] span.a-price.a-text-normal span.a-offscreen');
    
    // Extract the price
    const usedPrice = usedPriceElement.first().text();

    if (usedPrice) {
      if (monitorObj.currentPrice !== usedPrice) {
        console.log(`Used Price for ${url}: ${usedPrice}`);
        monitorObj.currentPrice = usedPrice;

        // Alert the user via Telegram
        if (monitorObj.chatid) {
          const messageContent = `🔍 <b>Amazon Monitor</b>\n🏷️ <b>Product:</b> ${url}\n💰 <b>Used Price:</b> ${usedPrice}`;
          bot.sendMessage(monitorObj.chatid, messageContent, { parse_mode: "HTML" })
            .catch(error => {
              if (error.response && error.response.statusCode === 400) {
                console.error(`Error sending Telegram message: ${error.response.body.description}`);
                stopAmazonScraper(monitorObj.id);
              }
            });
        }

        // Alert the user via Email
        if (monitorObj.email) {
          const items = [{ name: url, price: usedPrice, link: url, image: '' }];
          sendEmailAlert(items, 'Amazon Used Price Monitor', monitorObj.email);
        }
      }
    } else {
      console.log(`No used price found for ${url}`);
    }

  } catch (error) {
    console.error('Error retrieving the monitor data:', error);
    stopAmazonScraper(monitorObj.id);
  }
}

function addAmazonScraper(monitorObj, milliseconds) {
  const url = monitorObj.url;
  monitorObj.currentPrice = null;

  const intervalID = setInterval(() => {
    retrieveAmazonMonitor(url, monitorObj).catch(error => {
      console.error(`Failed to retrieve monitor for URL "${url}":`, error);
    });
  }, milliseconds);

  console.log(`Starting Amazon scraper for monitor URL ${url} with interval ID ${intervalID}`);
  monitorIntervals.set(monitorObj.id, intervalID);
  console.log(`Current monitorIntervals:`, monitorIntervals);
}

function stopAmazonScraper(monitorID) {
  const intervalID = monitorIntervals.get(monitorID);
  if (intervalID) {
    console.log(`Stopping Amazon scraper for monitor ID ${monitorID} with interval ID ${intervalID}`);
    clearInterval(intervalID);
    monitorIntervals.delete(monitorID);
  } else {
    console.log(`No active scraper interval found for monitor ID ${monitorID}.`);
  }
}

module.exports = { addScraper, stopScraper, grabItemSoldHistory, addAmazonScraper, stopAmazonScraper };