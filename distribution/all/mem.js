const id = require('../util/id');

function mem(config) {
  const context = {};
  context.gid = config.gid || 'all';
  context.hash = config.hash || global.distribution.util.id.consistentHash;

  /* For the distributed mem service, the configuration will
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

        const remote = {node: nidToNodes[getNid], service: 'mem', method: 'get'};
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
        if (configuration == null) { // null case
          checkConfig = id.getID(state);
        }

        const kid = id.getID(checkConfig);
        const putNid = context.hash(kid, Object.keys(nidToNodes));

        const remote = {node: nidToNodes[putNid], service: 'mem', method: 'put'};
        const localConfig = {key: checkConfig, gid: context.gid};
        distribution.local.comm.send([state, localConfig], remote, (e, v) => {
          if (e) {
            callback(new Error(`Cannot put configuration ${configuration}`));
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

        const remote = {node: nidToNodes[delNid], service: 'mem', method: 'del'};
        const localConfig = {key: configuration, gid: context.gid};
        distribution.local.comm.send([localConfig], remote, (e, v) => {
          if (e) {
            callback(new Error(`Cannot delete configuration ${configuration}`));
          } else {
            callback(null, v);
          }
        });
      });
    },

    append: (state, configuration, callback) => {
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
        if (configuration == null) { // null case
          checkConfig = id.getID(state);
        }

        const kid = id.getID(checkConfig);
        const putNid = context.hash(kid, Object.keys(nidToNodes));

        const remote = {node: nidToNodes[putNid], service: 'mem', method: 'append'};
        const localConfig = {key: checkConfig, gid: context.gid};
        distribution.local.comm.send([state, localConfig], remote, (e, v) => {
          if (e) {
            callback(new Error(`Cannot append to configuration ${configuration}`));
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
        let nodeCounter = 0;
        Object.keys(nodes).forEach((sid) => {
          const remote = {service: 'mem', method: 'delAll', node: v[sid]};
          distribution.local.comm.send([], remote, (e, v) => {
            if (e) {
              callback(new Error("Cannot delete all in distributed mem"));
              return;
            }

            nodeCounter += 1;
            if (nodeCounter == Object.keys(nodes).length) {
              callback(null, {});
            }
          });
        });
      });
    },

    reconf: (configuration, callback) => {
    },
  };
};

module.exports = mem;
