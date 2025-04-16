const local = global.distribution.local;
const id = global.distribution.util.id

function store(config) {
  const context = {};
  context.gid = config.gid || 'all';
  context.hash = config.hash || global.distribution.util.id.consistentHash;

  /* For the distributed store service, the configuration will
          always be a string */
  function getShard(v, key) {
    let nidToNode = {}
    let nids = []
    Object.keys(v).forEach(key => {
      const node = v[key]
      const nid = id.getNID(node)
      nidToNode[nid] = node 
      nids.push(nid)
    })
    
    let KID = id.getID(key) 
    let nodeToStore = nidToNode[context.hash(KID, nids)]
    return nodeToStore
  }

  return {
    get: (configuration, callback) => {
      // Get all nids and determine which node to store on. 
      local.groups.get(context.gid, (e,v) => {
        let key = configuration
        let nodeToStore = getShard(v, key)
        // console.log("The node to get our kv on: ", nodeToStore)
        local.comm.send([{key: key, gid: context.gid}], 
          {node: nodeToStore, service: 'store', method: 'get'}, (e,v) => {
            callback(e, v); 
          })
    })
    },

    put: (state, configuration, callback) => {
      // Get all nids and determine which node to store on. 
      // console.log("IN DISTRIBUTED PUT");
      // console.log("State is ", state);
      // console.log("Config is ", configuration);
      // console.log("Callback is ", callback);
      local.groups.get(context.gid, (e, v) => {
        // console.log("After groups get local");
        // console.log("E is ", e);
        // console.log("V is ", v);
        let key = configuration
        if (configuration == null) {
          key = id.getID(state)
        }
        let nodeToStore = getShard(v, key)
        // console.log("The node to store our kv on: ", nodeToStore)
        // console.log("ABOUT TO DO LOCAL COMM SEND IN PUT");
        local.comm.send([state, {key: key, gid: context.gid}], 
          {node: nodeToStore, service: 'store', method: 'put'}, (e, v) => {
            // console.log('successfully sent in mem, ', e, v)
            // if (e) {
            //   console.log("ERROR IN DISTRIBUTED PUT: ", e)
            // }
            callback(e, v); 
          })
    })
    },

    del: (configuration, callback) => {
      // Get all nids and determine which node to store on. 
      local.groups.get(context.gid, (e,v) => {
        let key = configuration
        let nodeToStore = getShard(v, key)
        local.comm.send([{key: key, gid: context.gid}], 
          {node: nodeToStore, service: 'store', method: 'del'}, (e,v) => {
            callback(e, v); 
          })
    })
    },

    
  };
};

module.exports = store;