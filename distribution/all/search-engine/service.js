const distribution = require('../../../config.js');
const log = require('./utils/log');

const fs = require('fs')
const SE_ERROR = log.ERROR
const SE_LOG = log.LOG


const https = require('https');
const {convert} = require('html-to-text');
const natural = require('natural');

function search(config) {
    const context = {};
    context.gid = config.gid || 'all';
    context.hash = config.hash || global.distribution.util.id.naiveHash;

    function stemHTML(html) {
        if (typeof html != "string") {
            return new Error("Non-string HTML contents");
        }
        const words = html.trim().split(/\s+/);
        console.log("words is ", words);
        stemmed = [];
        words.forEach(word => {
            stemmed.push(natural.PorterStemmer.stem(word.replace(/[^a-zA-Z0-9]/g, '')));
        });
        return stemmed; // return a list of stemmed words 
    }
    
    function getHTTP(config, callback) {
      const fullURL = config["URL"];
      const agent = new https.Agent({
        rejectUnauthorized: false
      });

      return new Promise((resolve, reject) => {
        const req = https.get(fullURL, { agent }, (res) => {
          let data = '';
    
          res.on('data', chunk => {
            data += chunk;
          });
    
          res.on('end', () => {
            resolve(convert(data)); // Return the plain text
          });
    
          res.on('error', (err) => {
            reject(err);
          });
        });
    
        req.on('error', (err) => {
          reject(err);
        });
    
        req.setTimeout(10000, () => {
          req.destroy(); // Clean up the request
          reject(new Error('Request timeout'));
        });
      }); 
    }

    function setup(configuration, callback) {
        // Assume these are the endpoints for the book txts.
        const gid = configuration["gid"];
        const mapper = async (key, value, config) => {
          const urlBase = "https://atlas.cs.brown.edu/data/gutenberg/";
          const fullURL = urlBase + value;
          const gid = config["gid"]
          const store = distribution.local.store;

          // Store the fetched text with key = original incomplete URL
          const plainText = await distribution[gid].search.getHTTP({ URL: fullURL });
          console.log("GOT TEXT FROM: ", fullURL, "PUTTING CONTENT IN NODE (MAP STAGE)")
          const mapperResult = await new Promise((resolve, reject) => {
            store.put(plainText, key, (err) => {
              if (err) {
                return reject(err);
              }
              // Pass the desired output through resolve so that mapperResult gets set properly.
              resolve([{ [fullURL]: plainText }]);
            });
          });
          
          return mapperResult;
        };
        
        const reducer = (key, values, config) => {
          // key is the url
          // values is a list of html contents
        
          const gid = config["gid"];
          const termsToUrls = {};
          values.forEach((html) => {
              const terms = distribution[gid].search.stemHTML(html);
              if (terms instanceof Error) {
                console.log("TERMS RETURNED AN ERROR");
                return terms;
              }
              
              terms.forEach((term) => {
                  if (!(term in termsToUrls)) {
                      termsToUrls[term] = {};
                  }
                  if (!(key in termsToUrls[term])) {
                      termsToUrls[term][key] = 0;
                  }
                  termsToUrls[term][key] += 1;
              })
          });

          console.log("AFTER POPULATING TERMSTOURLS");
          console.log("Terms to urls is ", termsToUrls);

          const toReturn = [];
          Object.keys(termsToUrls).forEach((term) => {
              const tempList = [termsToUrls[term]];
              toReturn.push({[term]: tempList});
          });
          
          // console.log("AFTER CONVERTING TERMSTOURLS TO LIST FORMAT");
          // console.log("ToReturn is ", toReturn);
          return toReturn;
        };  

        const datasetKeys = configuration.datasetKeys
        distribution[context.gid].mr.exec({keys: datasetKeys, map: mapper, reduce: reducer}, (e, v) => {
          console.log("AFTER RUNNING MR EXEC");
          console.log("E IS ", e);
          console.log("V IS ", v);
          callback(e, v);
          return;
          // distribution[context.gid].store.put(v, "searchdb", (e, v) => {
          //   console.log("AFTER STORE PUT, e is ", e);
          //   console.log("AFTER STORE PUT, v is ", v);
          //   console.log("AFTER STORE PUT, cb is ", callback);
          //   callback(e, v);
          // });
        });
    }

    function findMatchingInIndex(indexingFile, keyTerms) {
      keyTerms = keyTerms.replace(/\n/g, ' ');
      keyTerms = keyTerms.trim();

      const matchingLines = [];
      try {
        const data = fs.readFileSync(indexingFile, 'utf8');
        const fileContents = data.split('\n');

        fileContents.forEach((entry) => {
          const entryContents = entry.split(' | ');
          if (entryContents[0]) {
            const term = entryContents[0].trim();
            
            // Matching criteria of what should be returned. 
            if (term.toLowerCase()
                .split(' ')
                .some(str => keyTerms.includes(str) || str.includes(keyTerms))) {
              matchingLines.push(entry);
            }
          }
        });
      } catch (e) {
        console.log("Not a valid global index file, ", indexingFile, " -- can't be read. ", e)
        return null; 
      }

      // Print matching lines. 
      return matchingLines
    }

    function query(configuration, callback) {
      let globalIndexFile = "../../../test/search-mock-files/global-index.txt"; 
      const results = findMatchingInIndex(globalIndexFile, configuration.terms)
      callback(null, results);
    }

    return {
        getHTTP, 
        setup,
        query,
        stemHTML
    }
}

module.exports = search;