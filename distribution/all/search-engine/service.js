const distribution = require('../../../config.js');
const log = require('./utils/log');
// const SE_ERROR = log.ERROR
// const SE_LOG = log.LOG

const https = require('https');
const {convert} = require('html-to-text');

function search(config) {
    const context = {};
    context.gid = config.gid || 'all';
    context.hash = config.hash || global.distribution.util.id.naiveHash;
    
    function getHTTP(config, callback) {
      console.log("IN THE GETHTTP FUNC");
      const fullURL = config["URL"];
      const agent = new https.Agent({
        rejectUnauthorized: false
      });

      console.log("About to run https get");
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
      // const httpGet = https.get(fullURL, { agent }, (res) => {
      //   let data = '';
      //   res.on('data', chunk => { 
      //       data += chunk;
      //       // console.log("GETTING MORE DATA");
      //   });
      //   res.on('error', (error) => {
      //       console.log("ERROR WITH HTTP RES");
      //       callback(error);
      //       return;
      //   });

      //   res.on('end', () => {
      //     // console.log("REQUEST SUCCEEDED");
      //     callback(null, convert(data)); // return URL + html page content
      //     return;
      //   });
      // })
      
      // httpGet.on('error', (e) => {
      //   console.log("ERROR 2");
      //   callback(e);
      //   return;
      // });
      // httpGet.setTimeout(10000, () => {
      //   console.log("REQUEST TOOK TOO LONG");
      //   callback(new Error('Request timeout'));
      //   return;
      // });
      // console.log("outside of https get");
    }

    function setup(configuration, callback) {
        // Assume these are the endpoints for the book txts.
        const gid = configuration["gid"];
        const mapper = async (key, value, config) => {
          console.log("IN RAW MAPPER");
          const urlBase = "https://atlas.cs.brown.edu/data/gutenberg/";
          const fullURL = urlBase + value;
          console.log("fullURL is ", fullURL);
          // const https = functions[0]
          const gid = config["gid"]
          const store = distribution.local.store;

          // Store the fetched text with key = original incomplete URL
          // console.log("GID: ", gid)
          console.log("ABOUT TO RUN GETHTTP");
          const plainText = await distribution[gid].search.getHTTP({ URL: fullURL });
          store.put(plainText, key, (err, _) => {
            if (err) {
              console.log("ERROR 1");
              // console.error(`Failed to store content for ${key}:`, err);
            } else {
              // console.log("STORED CONTENT SUCCESSFULLY");
              // console.log(`Stored content for ${key}`);
            }
            // console.log("ABOUT TO RET FROM RAW MAPPER");
            return [{ [fullURL]:  plainText}]; // return URL + html page content
          })

          // distribution[gid].search.getHTTP({"URL" : fullURL}, (e, data) => {
          //   // console.log("Error is ", e);
          //   // console.log("Error is ", e);
          //   // console.log("Error is ", e);
          //   // console.log("Error is ", e);
          //   // console.log("AFTER GETTING HTML DATA");
          //   // console.log("AFTER GETTING HTML FOR LINK",fullURL, "DATA: ", data)
          //   store.put(data, key, (err, _) => {
          //     if (err) {
          //       console.log("ERROR 1");
          //       // console.error(`Failed to store content for ${key}:`, err);
          //     } else {
          //       // console.log("STORED CONTENT SUCCESSFULLY");
          //       // console.log(`Stored content for ${key}`);
          //     }
          //     // console.log("ABOUT TO RET FROM RAW MAPPER");
          //     return [{ [fullURL]:  data}]; // return URL + html page content
          //   });
          // })
        };
        
        const reducer = (key, values) => {
          // key is the url
          // values is a list of html contents
          console.log("IN INDEX REDUCER")
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
          console.log("RETURNED FROM EXEC IN SETUP\n")
          distribution[gid].store.put(v, "searchdb", (e, v) => {
            console.log("PUT RESULTS IN STORE")
            callback(e, v);
          });
        });

        
    }
    return {
        getHTTP, 

        setup,

        query: (configuration, callback) => {
            console.log("In the query function");
            callback(null, configuration);
        },
    }
}

module.exports = search;