const distribution = require('../../../../config.js');
const id = distribution.util.id;
const engineConfig = require('../engineConfig.js')
const fs = require('fs');
const log = require('./log')
const SE_ERROR = log.ERROR
const SE_LOG = log.LOG

let localServer = null;
const searchGroupConfig = engineConfig.searchGroupConfig
const gid = engineConfig.searchGroupConfig.gid
const searchGroup = {};    
const n1 = engineConfig.workerNodes.n1
const n2 = engineConfig.workerNodes.n2
const n3 = engineConfig.workerNodes.n3
const batchSize = 4;
const kURLs = 10;

function addNodesToGroup() {
    searchGroup[id.getSID(n1)] = n1;
    searchGroup[id.getSID(n2)] = n2;
    searchGroup[id.getSID(n3)] = n3;
}

function shutDownNodes(cb) {
    const remote = {service: 'status', method: 'stop'};
    remote.node = n1;
      distribution.local.comm.send([], remote, (e, v) => {
        remote.node = n2;
        distribution.local.comm.send([], remote, (e, v) => {
          remote.node = n3;
          distribution.local.comm.send([], remote, (e, v) => {
                cb(); 
            });
        });
    });
}

function setUpNodes(cb) {
    // 2. Call main setup function (after ensuring all nodes have been shutdown)
    const startNodes = () => {
        addNodesToGroup()
    
        const groupInstantiation = () => {
            // Create the groups
            distribution.local.groups.put(searchGroupConfig, searchGroup, (e, v) => {
                    distribution.search.groups.put(searchGroupConfig, searchGroup, (e,v) => {
                        if (Object.keys(e).length == 0) {
                            cb(null,localServer)
                        } else {
                            cb(e, null)
                        }
                    })
            });
        };

        // Now, start the nodes listening node
        distribution.node.start((server) => {
          localServer = server;
    
            // Start the nodes
            distribution.local.status.spawn(n1, (e, v) => {
                distribution.local.status.spawn(n2, (e, v) => {
                    distribution.local.status.spawn(n3, (e, v) => {
                        groupInstantiation();
                    });
                });
            });
        });
    }; 

    // 1. Stop the nodes if they are running
    shutDownNodes(startNodes); 
}

let dataset = [] 
let datasetKeys = []
function setUpURLs(dataPath, cb) {
    try {
        let URLs = []
        // const fileContent = fs.readFileSync(dataPath, 'utf-8');
        const path = require('path');
        const fileContent = fs.readFileSync(path.join(__dirname, dataPath), 'utf-8');
        const readURLs = fileContent.split('\n');
        readURLs.forEach(url => {
            datasetKeys.push(url)
            const kv = {}
            kv[url] = url
            URLs.push(kv)
        });
        dataset = URLs
        cb(null, URLs.length)
    } catch (err) {
        cb(err, null)
    }
}

function setUpServer(batchKeys, cb) {
    const config = { gid: gid, datasetKeys: batchKeys };
    SE_LOG("SETUP SERVER CALLED w/ config:", config.gid, config.datasetKeys);
    distribution[gid].search.setup(config, (e, v) => {
        // Maybe do updating index here (might need to change mr)
        // distribution.local.store.get(searchdb) <-- get object of terms: [{}]
        // then just directly do put 
        let newdb = v;
        distribution.local.store.get("searchdb", (e, v) => {
            // note to self: must delete old searchdb file before running program
            if (!e) { // have a searchdb file
                console.log("have a search db file already");
                Object.keys(v).forEach((key) => {
                    if (!(key in newdb)) {
                        newdb[key] = [];
                    }
                    newdb[key] = newdb[key].concat(v[key]);
                });

                // sort everything
                Object.keys(newdb).forEach((term) => {
                    newdb[term].sort((x, y) => {
                        return Object.values(y)[0] - Object.values(x)[0];
                    });
                    newdb[term] = newdb[term].slice(0, kURLs);
                });
            } 
            // else {
            //     console.log('error getting searchdb, ', e);
            // }
            distribution.local.store.put(newdb, 'searchdb', (e, v) => {
                cb(e, v);
            });
        });
        // distribution.local.store.put(v, 'searchdb', (e, v) => {
        //     cb(e, v);
        // });
    });
}

function processBatch(batch, cb) {
    let cntr = 0;
    let batchKeys = []; // Collect keys for this batch
    
    batch.forEach(o => {
      const key = Object.keys(o)[0];
      const value = o[key];
      batchKeys.push(key);
      
      // Shard: Store the URL's value with its key.
      distribution[gid].store.put(value, key, (e, v) => {
        cntr++;
        if (e) {
          console.log("ERROR ON PROCESS BATCH", e)
          return cb(e);
        }
        // When all URLs in the batch have been processed:
        if (cntr === batch.length) {
          // Now setup the server for this batch:
          console.log("BEFORE SETUP SERVICE CALL")
          setUpServer(batchKeys, (e, v) => {
            if (e) {
              console.log("ERROR ON SETUP SERVER: ", e)
              return cb(e);
            }
            cb(null, v);
          });
        }
      });
    });
}

function processAllBatches(finalCallback) {
    if (dataset.length === 0) {
      return finalCallback(null, "All batches processed");
    }
    
    // Extract the next batch (up to 4 URLs)
    const batch = dataset.splice(0, batchSize);
    processBatch(batch, (err, result) => {
      if (err) return finalCallback(err);
      // After processing this batch, process the next one recursively.
      setTimeout(() => {
        processAllBatches(finalCallback);
      }, 500); // 500 ms delay – adjust as needed
    });
}

// function shardURLs(cb) {
//     if (dataset.length === 0) {
//         cb(null, 'empty') 
//         return
//     }

//     let cntr = 0;
//       // Send the dataset to the worker nodes. 
//       dataset.forEach((o) => {
//         const key = Object.keys(o)[0];
//         const value = o[key];
//         distribution[gid].store.put(value, key, (e, v) => {
//           cntr++;
//           // Return to main repl once done. 
//           if (cntr === dataset.length) {
//             cb(e, v)
//             return; 
//           }
//         });
//     });
// }

// function setUpServer(cb) {
//     const config = {gid: gid, datasetKeys: datasetKeys}
//     SE_LOG("SETUP UP SERVER CALLED w/ config: ", config.gid, config.datasetKeys)
//     distribution[gid].search.setup(config, (e, v) => {
//         distribution.local.store.put(v, 'searchdb', (e,v) => {
//             cb(e, v)
//             return;
//         })
//     }); 
// }

function searchKeyTerm(searchTerms, cb) {
    const config = {gid: gid, terms: searchTerms}
    distribution[gid].search.query(config, (e,v) => {
        // console.log("Returning from query service, ", e, v)
        if (v) {
            cb(null, v)
            return; 
        } else {
            cb(e, null)
            return; 
        }
    })
}

module.exports = {
    setUpNodes: setUpNodes, 
    shutDownNodes: shutDownNodes,
    setUpURLs: setUpURLs,  
    // shardURLs: shardURLs, 
    processAllBatches: processAllBatches,
    setUpServer: setUpServer,
    searchKeyTerm: searchKeyTerm 
}