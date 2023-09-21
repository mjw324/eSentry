# eSentry

eSentry is a powerful web application designed to monitor eBay for items as requested by the users! It monitors item listings real-time and notifies users of any new listings that meet their filters. eSentry then sends a Telegram message within seconds of the new listing to the user.

## Features

- **eBay Listing Monitoring**: Input an eBay item you desire and let eSentry do the rest. It will continuously monitor the search results and notify you of any new listings.
  
- **Telegram Notifications**: Receive real-time notifications on Telegram whenever there's an update that matches your request.

- **Customizable Keyword Exclusion**: Specify a desired price range, excluded keywords, or the item condition for a more tailored monitoring experience.
  

## How to Setup eSentry Locally
Sidenote: This is not recommended as it is complex to run locally. eSentry will soon be hosted on a domain I created!
### Prerequisites

- Node.js
- Telegram Bot Token
- VSCode

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/mjw324/eSentry.git
   ```

2. **Navigate to the Project Server Directory**:
   ```bash
   cd eSentry/server
   ```

3. **Install Server Dependencies**:
   ```bash
   npm install
   ```

4. **Setup Server Environment Variables**:
   - Create a `.env` file in the root directory.
   - Add the following variables (note: ```SCRAPE_REFRESH_RATE``` is in milliseconds):
     ```
        DB_HOST="YOUR_DB_HOST"
        DB_USER="YOUR_DB_USER"
        DB_PASSWORD="YOUR_DB_PASSWORD"
        DB_NAME="YOUR_DB_NAME"
        GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
        GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
        TELEGRAM_BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN"
        SCRAPE_REFRESH_RATE=10000
     ```

5. **Start the Server**:
   ```bash
   npm start
   ```
6. **Repeat Steps 2 & 3 for the Client**
7. **Start the Client**
```bash
   npm start
   ```

## Usage

1. **Access the Client Interface**: Open your browser and navigate to `http://localhost:3000`.

2. **Input eBay Search Link**: On the homepage, input your desired eBay search link.

3. **Specify Requirements**: Define any specific requirements or keywords you want to exclude.

4. **Receive Notifications**: Once set up, you'll start receiving notifications on Telegram for any updates that match your criteria.

## To-Do

- Reconfigure `exclude_keywords` (both in POST monitor requests and MySQL database) to be an array of strings for better customization.
