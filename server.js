const express = require('express');
const app = express();
const url = require('url');
const port = 3000;
const axios = require('axios');
const cheerio = require('cheerio');
const { resolve } = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');


// Enable CORS for all origins
app.use(cors());

// Define your API routes here
// For example, let's create a simple GET route at '/api/hello'
// app.get('/api/hello', (req, res) => {
//   res.json({ message: 'Hello, World!' });
// });


// Function to create the table
function createTable() {
  const db = new sqlite3.Database('your_database.db');

  db.serialize(() => {
    db.run(
      'CREATE TABLE IF NOT EXISTS word_counts (domain_name TEXT, web_link TEXT, word_count INTEGER, favourite BOOLEA)'
    );

    console.log('Table was created.');

    db.close();
  });
}

  // Function to count words on a webpage
async function countWords(rurl) {
    try {
      const response = await axios.get(rurl);
      const $ = cheerio.load(response.data);
      const pageContent = $('body').text();
      const wordCount = pageContent.trim().split(/\s+/).length;
  
      return wordCount;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }
  // Function to store word count in the database
  function storeWordCount(rurl, wordCount) {
    const db = new sqlite3.Database('wordCount.db');
    const urlObj  = url.parse(rurl);
    const domainName = urlObj.hostname;
    db.serialize(() => {
      db.run(
        'CREATE TABLE IF NOT EXISTS word_counts (domain_name TEXT, web_link TEXT, word_count INTEGER, favourite BOOLEA)'
      );
  
      const insertStatement = db.prepare(
        'INSERT INTO word_counts (web_link, word_count, domain_name, favourite) VALUES (?, ?, ?, ?)'
      );
      insertStatement.run(rurl, wordCount, domainName, false);
      insertStatement.finalize();
      //console.log('Word count stored in the database.');
  
      db.close();
    });
    resolve({web_link: rurl, domain_name: domainName, word_count: wordCount, favourite: false})
  }
  // Retrieve word count from the database
  function retrieveWordCount(rurl) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database('wordCount.db');
  
      db.get(
        'SELECT * FROM word_counts WHERE web_link = ?',
        [rurl],
        (error, rows) => {
          if (error) {
           // console.error('Error:', error);
            reject(error);
          } else {
            if (rows) {
              //console.log("Selected Data from table");
              resolve(rows);
            } else {
              //console.log("Data was not found ");
              resolve(null);
            }
          }
  
          db.close();
        }
      );
    });
  }
  // REST endpoint to retrieve word count for a given URL
app.get('/wordcount', async (req, res) => {
    const rurl = req.query.url;
   // console.log("GET URL...", rurl);
  
    //const domain_name = hostname.replace(/^[^.]+\./g,'');
    //console.log("domain_name", domain_name);
   
    try {
      // Check if word count exists in the database
      const existingData = await retrieveWordCount(rurl);
      //console.log("Selected Data: ", existingData);
      if (existingData == null) {
        //console.log("Enter to count word")
         // Count words on the webpage and store in the database
         const wordCount = await countWords(rurl);
        // console.log("Word count was: ", wordCount)
         const resultObj =  storeWordCount(rurl, wordCount);
   
         res.json(resultObj);
      } else {
        res.json(existingData);
      }
    } catch (error) {
      res.status(500).json({ error: 'An error occurred' });
    }
  });

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  createTable();
});
