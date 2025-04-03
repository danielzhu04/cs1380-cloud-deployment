const distribution = require('../../../../config.js');
const id = distribution.util.id;
const engineConfig = require('../engineConfig.js')
const fs = require('fs');

let localServer = null;
const searchGroupConfig = engineConfig.searchGroupConfig
const gid = engineConfig.searchGroupConfig.gid
const searchGroup = {};    
const n1 = engineConfig.workerNodes.n1
const n2 = engineConfig.workerNodes.n2
const n3 = engineConfig.workerNodes.n3

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
            distribution.local.groups
                .put(searchGroupConfig, searchGroup, (e, v) => {
                    cb(e,localServer)
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
function setUpURLs(dataPath, cb) {
    try {
        let URLs = []
        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        const readURLs = fileContent.split('\n');
        readURLs.forEach(url => {
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

function shardURLs(cb) {
    if (dataset.length === 0) {
        cb(null, 'empty') 
        return
    }

    let cntr = 0;
      // Send the dataset to the worker nodes. 
      dataset.forEach((o) => {
        const key = Object.keys(o)[0];
        const value = o[key];
        distribution[gid].store.put(value, key, (e, v) => {
          cntr++;
          // Return to main repl once done. 
          if (cntr === dataset.length) {
            cb(e, v)
            return; 
          }
        });
    });
}

module.exports = {
    setUpNodes: setUpNodes, 
    shutDownNodes: shutDownNodes,
    setUpURLs: setUpURLs,  
    shardURLs: shardURLs, 
}