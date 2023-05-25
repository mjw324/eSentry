# eSentry
Takes an eBay search link, scrapes the items from the page and will notify you of any updates on Telegram that match the specified requirements.



## TO DO
### Server
Reconfigure exclude_keywords (both in POST monitor requests and MySQL database), so that it is an array of strings to be excluded. This is to give fuller customization.
    Example: Right now excluded_keywords could be "pro max", which would exclude both pro and max. The revision to an array could exclude the string "pro max" together and still provide the pro results.
