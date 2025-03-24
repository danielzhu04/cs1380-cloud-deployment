const id = require('../util/id');

function store(config) {
  const context = {};
  context.gid = config.gid || 'all';
  context.hash = config.hash || global.distribution.util.id.naiveHash;

  /* For the distributed store service, the configuration will
          always be a string */
  return {
    get: (configuration, callback) => {
      distribution.local.groups.get(context.gid, (e, v) => { // should return {sid: node objects}
        if (e) {
          callback(new Error(`Cannot retrieve node group: ${e}`));
          return;
        }

        const nidToNodes = {};
        Object.values(v).forEach(node => {
          const nid = id.getNID(node);
          nidToNodes[nid] = node;
        });

        const kid = id.getID(configuration);
        const getNid = context.hash(kid, Object.keys(nidToNodes));

        const remote = {node: nidToNodes[getNid], service: 'store', method: 'get'};
        const localConfig = {key: configuration, gid: context.gid};
        distribution.local.comm.send([localConfig], remote, (e, v) => {
          if (e) {
            callback(new Error(`Cannot get configuration ${configuration}`));
          } else {
            callback(null, v);
          }
        });
      });
    },

    put: (state, configuration, callback) => {
      distribution.local.groups.get(context.gid, (e, v) => { // should return {sid: node objects}
        if (e) {
          callback(new Error(`Cannot retrieve node group: ${e}`));
          return;
        }

        const nidToNodes = {};
        Object.values(v).forEach(node => {
          const nid = id.getNID(node);
          nidToNodes[nid] = node;
        });

        let checkConfig = configuration;
        if (configuration == null) {
          checkConfig = id.getID(state);
        }

        const kid = id.getID(checkConfig);
        const putNid = context.hash(kid, Object.keys(nidToNodes));

        const remote = {node: nidToNodes[putNid], service: 'store', method: 'put'};
        const localConfig = {key: checkConfig, gid: context.gid};
        distribution.local.comm.send([state, localConfig], remote, (e, v) => {
          if (e) {
            callback(new Error(`Cannot put configuration ${configuration}: ${e}`));
          } else {
            callback(null, v);
          }
        });
      });
    },

    del: (configuration, callback) => {
      distribution.local.groups.get(context.gid, (e, v) => { // should return {sid: node objects}
        if (e) {
          callback(new Error(`Cannot retrieve node group: ${e}`));
          return;
        }

        const nidToNodes = {};
        Object.values(v).forEach(node => {
          const nid = id.getNID(node);
          nidToNodes[nid] = node;
        });

        const kid = id.getID(configuration);
        const delNid = context.hash(kid, Object.keys(nidToNodes));

        const remote = {node: nidToNodes[delNid], service: 'store', method: 'del'};
        const localConfig = {key: configuration, gid: context.gid};
        distribution.local.comm.send([localConfig], remote, (e, v) => {
          if (e) {
            callback(new Error(`Cannot get configuration ${configuration}`));
          } else {
            callback(null, v);
          }
        });
      });
    },

    delAll: (callback) => {
      distribution.local.groups.get(context.gid, (e, v) => { // should return {sid: node objects}
        if (e) {
          callback(new Error(`Cannot retrieve node group: ${e}`));
          return;
        }

        const nodes = v;
        const keySet = new Set();
        let nodeCounter = 0;
        Object.keys(nodes).forEach((sid) => {
          const remote = {service: 'store', method: 'delAll', node: nodes[sid]};
          distribution.local.comm.send([], remote, (e, v) => {
            if (e) {
              callback(new Error(`Cannot delete all keys in distributed store, ${e}`));
              return;
            }

            v.forEach(key => keySet.add(key));
            nodeCounter += 1;
          
            if (nodeCounter == Object.keys(nodes).length) {
              callback(null, keySet);
            }
          });
        });
      });
    },

    reconf: (configuration, callback) => {
    },
  };
};

module.exports = store;
