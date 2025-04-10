const distribution = require('../../../config.js');
const log = require('./utils/log');
const fs = require('fs')
const SE_ERROR = log.ERROR
const SE_LOG = log.LOG

const https = require('https');
const {convert} = require('html-to-text');

function search(config) {
    const context = {};
    context.gid = config.gid || 'all';
    context.hash = config.hash || global.distribution.util.id.naiveHash;
    
    function getHTTP(config, callback) {
      fullURL = config["URL"]
      const agent = new https.Agent({
        rejectUnauthorized: false
      });
      https.get(fullURL, { agent }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log("REQUEST SUCCEEDED")
          callback(null, convert(data)) // return URL + html page content
        });
      }).on('error', (e) => {
        console.log("ERROR: ", e)
        callback(e)
      });
    }

    function setup(configuration, callback) {
        // Assume these are the endpoints for the book txts.
        const gid = configuration["gid"];
        const mapper = (key, value, config) => {
          console.log("IN RAW MAPPER");
          const urlBase = "https://atlas.cs.brown.edu/data/gutenberg/";
          const fullURL = urlBase + value;
          // const https = functions[0]
          const gid = config["gid"]
          const store = distribution.local.store;

          // Store the fetched text with key = original incomplete URL
          // console.log("GID: ", gid)
          distribution[gid].search.getHTTP({"URL" : fullURL}, (e, data) => {
            // console.log("AFTER GETTING HTML FOR LINK",fullURL, "DATA: ", data)
            store.put(data, key, (err, _) => {
              if (err) {
                console.log("ERROR IS ", err);
                // console.error(`Failed to store content for ${key}:`, err);
              } else {
                console.log("STORED CONTENT SUCCESSFULLY");
                // console.log(`Stored content for ${key}`);
              }
              console.log("ABOUT TO RET FROM RAW MAPPER");
              return [{ [fullURL]:  data}]; // return URL + html page content
            });
          })
        };
        
        const reducer = (key, values) => {
          // key is the url
          // values is a list of html contents
          const termsToUrls = {};
          values.forEach((html) => {
              const terms = html.split(" ");
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

          const toReturn = [];
          Object.keys(termsToUrls).forEach((term) => {
              const tempList = [termsToUrls[term]];
              // console.log("templist is ", tempList);
              toReturn.push({[term]: tempList});
          });
          return toReturn;
        };  

        const datasetKeys = configuration.datasetKeys
        distribution[context.gid].mr.exec({keys: datasetKeys, map: mapper, reduce: reducer}, (e, v) => {
          distribution[gid].store.put(v, "searchdb", (e, v) => {
            callback(e, v);
          });
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
          // console.log("ENTRY: ", entry, " ENTRY CONTENT: ", entryContents)
          if (entryContents[0]) {
            const term = entryContents[0].trim();
            if (term.includes(keyTerms)) {
              matchingLines.push(entry);
            }
          }
        });
        
      } catch (e) {
        console.log("Not a valid global index file, ", indexingFile, " -- can't be read. ", e)
        return null; 
      }

      // Print matching lines
      console.log("matching lines: ", matchingLines)
      return matchingLines
    }

    function query(configuration, callback) {
      let globalIndexFile = "../../../test/search-mock-files/global-index.txt"; 
      console.log("In the query function; Configs: ", configuration);
      const results = findMatchingInIndex(globalIndexFile, configuration.terms)
      callback(null, results);
    }


    return {
        getHTTP, 
        setup,
        query,
    }
}

module.exports = search;