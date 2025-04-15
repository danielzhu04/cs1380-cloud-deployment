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
        // console.error("words is ", words);
        stemmed = [];
        words.forEach(word => {
          const stemmedWord = natural.PorterStemmer.stem(word.replace(/[^a-zA-Z0-9]/g, ''));
          if (stemmedWord != '') {
            stemmed.push(stemmedWord);
          }
        });
        // console.error("words post stemming are ", stemmed);
        // stemmed.forEach((word) => {
        //   console.error("THE CURRENT WORD IS ", word)
        // })
        return stemmed; // return a list of stemmed words 
    }
    
    function getHTTP(config, retries = 3) {
      // const fullURL = config["URL"];
      // const agent = new https.Agent({
      //   rejectUnauthorized: false
      // });

      // return new Promise((resolve, reject) => {
      //   const req = https.get(fullURL, { agent }, (res) => {
      //     let data = '';
    
      //     res.on('data', chunk => {
      //       data += chunk;
      //     });
    
      //     res.on('end', () => {
      //       data = convert(data)
      //       data = data.normalize('NFKC');
      //       data = data.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
      //       data = data.replace(/\\,/g, '\\');
      //       resolve(data); // Return the plain text
      //     });
    
      //     res.on('error', (err) => {
      //       reject(err);
      //     });
      //   });
    
      //   req.on('error', (err) => {
      //     reject(err);
      //   });
    
      //   // req.setTimeout(10000, () => {
      //   //   req.destroy(); // Clean up the request
      //   //   reject(new Error('Request timeout'));
      //   // });
      // }); 
      const fullURL = config["URL"];
      const agent = new https.Agent({
        rejectUnauthorized: false,
        keepAlive: true,       // Enable persistent connection reuse
        maxSockets: 4,         // Limit the number of simultaneous sockets if needed
      });

      return new Promise((resolve, reject) => {
        const req = https.get(fullURL, { agent }, (res) => {
          let data = '';

          res.on('data', chunk => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              // Convert HTML to plain text.
              data = convert(data);
              // Normalize Unicode to ensure consistency.
              data = data.normalize('NFKC');
              // Remove control characters that might break later JSON processing.
              data = data.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
              // Fix any stray commas after a backslash.
              data = data.replace(/\\,/g, '\\');
              resolve(data);
            } catch (conversionError) {
              reject(conversionError);
            }
          });

          res.on('error', (err) => {
            reject(err);
          });
        });

        req.on('error', (err) => {
          reject(err);
        });

        req.setTimeout(10000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
      }).catch(err => {
        // Retry on socket hang up errors (or other errors, as desired).
        if (retries > 0 && err.message.includes("socket hang up")) {
          console.log(`Retrying ${fullURL}. Retries left: ${retries} due to error: ${err.message}`);
          // Wait 500ms before retrying (adjust delay if necessary)
          return new Promise(resolve => setTimeout(resolve, 500))
            .then(() => getHTTP(config, retries - 1));
        }
        return Promise.reject(err);
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
          // console.error("GOT TEXT FROM: ", fullURL, "PUTTING CONTENT IN NODE (MAP STAGE)")
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
                console.error("TERMS RETURNED AN ERROR");
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

          console.error("AFTER POPULATING TERMSTOURLS");
          // console.error("Terms to urls is ", termsToUrls); // return terms to URLs
          // Then modify mr reducer as well to handle object outputs instead of map outputs 
          return termsToUrls;

          const toReturn = [];
          Object.keys(termsToUrls).forEach((term) => {
              const tempList = [termsToUrls[term]];
              toReturn.push({[term]: tempList});
          });
          
          // console.error("AFTER CONVERTING TERMSTOURLS TO LIST FORMAT");
          // NOTE TO SELF: check if there is a current searchdb and if there is, append the results to that 
          console.error("ToReturn is ", toReturn);
          return toReturn;
        };  

        const datasetKeys = configuration.datasetKeys
        distribution[context.gid].mr.exec({keys: datasetKeys, map: mapper, reduce: reducer}, (e, v) => {
          console.error("AFTER RUNNING MR EXEC");
          console.error("E IS ", e);
          // console.error("V IS ", v);
          // v.forEach((currObj) => {
          //   console.error("The current object is ", currObj);
          // })
          callback(e, v);
          return;
          // distribution[context.gid].store.put(v, "searchdb", (e, v) => {
          //   console.error("AFTER STORE PUT, e is ", e);
          //   console.error("AFTER STORE PUT, v is ", v);
          //   console.error("AFTER STORE PUT, cb is ", callback);
          //   callback(e, v);
          // });
        });
    }

    function findMatchingInIndex(file, keyTerms) {
      // console.log("THE FILE: ", file, "term: ", keyTerms)
      keyTerms = keyTerms.replace(/\n/g, ' ');
      keyTerms = keyTerms.trim();

      let matchingLines = [];
      if (file != null) {   
        // console.log("FILE IS NOT NUL!")
        Object.keys(file).forEach(key => {
          // console.log("key: ", key)
          // console.log('value: ', file[key])
          const term = key
          const freqs = file[key]
          // console.log('term: ', term, 'freq: ', freqs, 'keyTerms: ', keyTerms)
          // Matching criteria of what should be returned. 
          // if (term.toLowerCase()
          //     .split(' ')
          //     .some(str => keyTerms.includes(str) || str.includes(keyTerms))) {
          //   matchingLines.push(entry);
          // }
          if (keyTerms.trim() == term.toLocaleLowerCase().trim()) {
            match = {key, freqs}
            matchingLines.push(match)
          } else {
            // console.log("keyterm: ", keyTerms, 'term: ', term)
          }
        })
      } 

      // Print matching lines. 
      return matchingLines
    }

    function query(configuration, callback) {
      // console.log("ENTERED QUERY SERVICE: ", configuration)
      distribution.local.store.get('searchdb', (e,v) => {
        // console.log("THE LOCAL GET NODE ID: ", distribution.node.config)
        // console.log('In QUERY, getting values of searchdb', v, "e: ", e)
        if (v) {
          let results = findMatchingInIndex(v, configuration.terms)
          // console.log("RESULT FOUND: ", results)
          callback(null, results);
        } else {
          callback(null, [])
        }
      })  
    }

    return {
        getHTTP, 
        setup,
        query,
        stemHTML
    }
}

module.exports = search;