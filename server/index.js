
let ejs = require('ejs');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot('5896178858:AAFvanOCKcfotzURZKer4SglYsb2nE0IGaA', { polling: true });
var scrapedPhones = [];
var newScrapedPhones = [];

async function retrievePhoneList() {
        const response = await axios('https://www.ebay.com/sch/i.html?_from=R40&_nkw=iphone+13+pro+-max+unlocked+-cracked+-read+-parts+-board+-motherboard+-Non-Functional+-12+-LCD+-Display+-Shop+-mystery&_sacat=0&_sop=10&rt=nc&LH_BIN=1');
        const html = await response.data;
        const $ = cheerio.load(html);
        const phones = $('li.s-item.s-item__pl-on-bottom');
        const newPhone = true;
        newScrapedPhones = [];
        phones.each((index, element) => {
            const phoneName = $(element).find('div.s-item__title').text();
            const phonePrice = $(element).find('span.s-item__price').text();
            const phoneLink = $(element).find('a.s-item__link').attr('href');
            const price = Number(phonePrice.replace(/[^0-9.-]+/g, ""));
            if(price <= 700 && price >= 350) { // Creates array of all phones found under price limit
                newScrapedPhones.push({
                    name: phoneName,
                    price: phonePrice,
                    link: phoneLink
                });
                console.log(`Name: ${phoneName} Price: ${phonePrice}`);
            }
        }); 
        if(scrapedPhones.length === 0) { // If scrapedPhones is empty, it will be filled with newScrapedPhones
            scrapedPhones = newScrapedPhones;
            newScrapedPhones = [];
        } else {
            // Create array that will hold the difference between scrapedPhones and newScrapedPhones
            var difference = [];
            for (let i = 0; i < newScrapedPhones.length; i++) {
                let phoneExists = false;
                for (let j = 0; j < scrapedPhones.length; j++) {
                  if (newScrapedPhones[i].name === scrapedPhones[j].name) { // assuming each phone object has a unique id property
                    phoneExists = true;
                    break;
                  }
                }
                if (!phoneExists) {
                  difference.push(newScrapedPhones[i]);
                }
              }
            console.log("Difference between newScrapedPhones and scrapedPhones: ");
            console.log(difference);
            if(difference.length > 0) { // If there is a difference, it will be sent to the user
                difference.forEach(phone => {
                    console.log(`New Phone Found! Link: ${phone.link}`);
                    bot.sendMessage('6274459892', `${phone.name} for ${phone.price} Link: ${phone.link}`);
                });
            }
            scrapedPhones = newScrapedPhones; // scrapedPhones will be updated with newScrapedPhones
            newScrapedPhones = []; // newScrapedPhones will be emptied
        }
};

setInterval(retrievePhoneList, 10000);
