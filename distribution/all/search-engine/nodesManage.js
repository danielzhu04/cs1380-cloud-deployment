const distribution = require('../../../config.js');
const id = distribution.util.id;

let localServer = null;
const searchGroupConfig = {gid: 'search'};
const searchGroup = {};    
const n1 = {ip: '127.0.0.1', port: 9001};
const n2 = {ip: '127.0.0.1', port: 9002};
const n3 = {ip: '127.0.0.1', port: 9003};

function addNodesToGroup() {
    searchGroupConfig[id.getSID(n1)] = n1;
    searchGroupConfig[id.getSID(n2)] = n2;
    searchGroupConfig[id.getSID(n3)] = n3;
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
                    cb(e,v)
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

module.exports = {
    setUpNodes: setUpNodes, 
    shutDownNodes: shutDownNodes, 
    localServer: localServer, 
}