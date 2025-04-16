const distribution = require('../../../config.js');
const log = require('./utils/log');
const path = require('path')
const https = require('https');
const {convert} = require('html-to-text');
const natural = require('natural');

function search(config) {
    const context = {};
    context.gid = config.gid || 'all';
    context.hash = config.hash || global.distribution.util.id.consistentHash;

    function stemHTML(html) {
        if (typeof html != "string") {
            return new Error("Non-string HTML contents");
        }
        const words = html.trim().split(/\s+/);
        stemmed = [];
        words.forEach(word => {
          const stemmedWord = natural.PorterStemmer.stem(word.replace(/[^a-zA-Z0-9]/g, ''));
          if (stemmedWord != '') {
            stemmed.push(stemmedWord);
          }
        });
        return stemmed; // return a list of stemmed words 
    }
    
    function getHTTP(config, retries = 3) {
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
        const mapper = async (key, value, config) => {
          const urlBase = "https://atlas.cs.brown.edu/data/gutenberg/";
          const fullURL = urlBase + value;
          const gid = config["gid"]

          // Store the fetched text with key = original incomplete URL
          const plainText = await distribution[gid].search.getHTTP({ URL: fullURL });
          const mapperResult = await new Promise((resolve, reject) => {
              // Pass the desired output through resolve so that mapperResult gets set properly.
              resolve([{ [fullURL]: plainText }]);
            // });
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

          // Then modify mr reducer as well to handle object outputs instead of map outputs 
          return termsToUrls; 
        };  

        const datasetKeys = configuration.datasetKeys
        const start = performance.now();
        distribution[context.gid].mr.exec({keys: datasetKeys, map: mapper, reduce: reducer}, (e, v) => {
          const end = performance.now();
          log.elapsed.mrTime += end - start;
          log.elapsed.numMr += 1;
          callback(e, v);
          return;
        });
    }

    function findMatchingInIndex(file, keyTerms) {
      keyTerms = keyTerms.replace(/\n/g, ' ');
      keyTerms = keyTerms.trim();

      let matchingLines = [];
      if (file != null) {   
        Object.keys(file).forEach(key => {
          const term = key
          const freqs = file[key]
          if (keyTerms.trim() == term.toLocaleLowerCase().trim()) {
            match = {key, freqs}
            matchingLines.push(match)
          } 
        })
      } 

      // Print matching lines. 
      return matchingLines
    }

    function query(configuration, callback) {
      const start = performance.now();
      // distribution.local.store.get('searchdb', (e,v) => {
      //   if (v) {
      //     const end = performance.now();
      //     console.log(`Querier latency (ms/query): ${(end - start).toFixed(2)}`);
      //     console.log(`Querier throughput (queries/s): ${(1/ ((end - start) / 1000)).toFixed(2)}`);
      //     let results = findMatchingInIndex(v, configuration.terms)
      //     callback(null, results);
      //   } else {
      //     callback(null, [])
      //   }
      // })  
      let term = configuration.terms.replace(/\n/g, ' ');
      term = term.trim();
      distribution.local.store.get(term, (err, topKArray) => {
        const end = performance.now();
        console.log(`Querier latency (ms/query): ${(end - start).toFixed(2)}`);
        console.log(`Querier throughput (queries/s): ${(1/ ((end - start) / 1000)).toFixed(2)}`);
        if (err || !Array.isArray(topKArray)) {
          return callback(null, []); // no results
        }
        // topKArray is e.g. [ { "https://...": freq }, { ... }, ... ]
        searchResult = [{
          key: term,        // or the stemmedSearchTerms if you prefer
          freqs: topKArray
        }];
        // console.log("TK", topKArray)
        callback(null, searchResult);
      });
    }

    return {
        getHTTP, 
        setup,
        query,
        stemHTML
    }
}

module.exports = search;