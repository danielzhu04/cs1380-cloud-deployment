const distribution = require('../../../config.js');
const log = require('./utils/log');
const SE_ERROR = log.ERROR
const SE_LOG = log.LOG

const https = require('https');

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
          callback(null, data) // return URL + html page content
        });
      }).on('error', (e) => {
        console.log("ERROR: ", e)
        callback(e)
      });
    }

    function setup(configuration, callback) {
        // Assume these are the endpoints for the book txts.
        const gid = configuration["gid"];
        function getText(cb) {
          SE_LOG("IN GET TEXT")
          const mapper = (key, value, config) => {
            const urlBase = "https://atlas.cs.brown.edu/data/gutenberg/";
            const fullURL = urlBase + value;
            // const https = functions[0]
            const gid = config["gid"]
            const store = distribution.local.store;
            
            // Store the fetched text with key = original incomplete URL
            console.log("GID: ", gid)
            distribution[gid].search.getHTTP({"URL" : fullURL}, (e, data) => {
              // console.log("AFTER GETTING HTML FOR LINK",fullURL, "DATA: ", data)
              store.put(data, key, (err, _) => {
                if (err) {
                  console.error(`Failed to store content for ${key}:`, err);
                } else {
                  console.log(`Stored content for ${key}`);
                }
                return [{ [fullURL]:  data}]; // return URL + html page content
              });
            })
          };
        
          const reducer = (key, values) => {
            // console.log("IN REDUCER: key: ", key, "values: ", values)
            // Even though we're doing async work, we must return something
            // for the reducer interface. Returning null for now.
            return { [key]: null };
          };  
          
          const datasetKeys = configuration.datasetKeys
          distribution[context.gid].mr.exec({keys: datasetKeys, map: mapper, reduce: reducer}, (e, v) => {
              if (!e) {
                  cb(null, v)
              }
          });
        }

        getText((e, v) => {
            callback(null, "Success");
        })
        
    }
    return {
        getHTTP, 

        setup,

        query: (configuration, callback) => {
            callback(null, configuration);
        }
    }
}

module.exports = search;