const distribution = require('../../../config.js');
const log = require('./utils/log');
const SE_ERROR = log.ERROR
const SE_LOG = log.LOG

function search(config) {
const context = {};
    context.gid = config.gid || 'all';
    context.hash = config.hash || global.distribution.util.id.naiveHash;

    function setup(configuration, callback) {
        // Assume these are the endpoints for the book txts.
        const gid = configuration["gid"];
        function getText(cb) {
          const mapper = (key, value) => {
            const urlBase = "https://atlas.cs.brown.edu/data/gutenberg/";
            const fullURL = urlBase + value;
            return [{ [fullURL]: value }];
          };
        
          const reducer = (key, values) => {
            console.log("IN REDUCER: key: ", key, "values: ", values)
            const https = require('https');
            const store = distribution.local.store;
        
            // Construct the full URL
            const fullURL = urlBase + key;
        
            https.get(fullURL, (res) => {
              let data = '';
              res.on('data', chunk => data += chunk);
              res.on('end', () => {
                // Store the fetched text with key = original incomplete URL
                store.put(data, key, (err, _) => {
                  if (err) {
                    console.error(`Failed to store content for ${key}:`, err);
                  } else {
                    console.log(`Stored content for ${key}`);
                  }
                });
              });
            }).on('error', (e) => {
              console.error(`Error fetching ${fullURL}:`, e);
            });
        
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
        setup,

        query: (configuration, callback) => {
            callback(null, configuration);
        }
    }
}

module.exports = search;