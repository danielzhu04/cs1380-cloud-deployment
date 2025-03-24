const groups = function(config) {
  const context = {};
  context.gid = config.gid || 'all';

  return {
    put: (config, group, callback) => {
      const remote = {service: "groups", method: "put"};
      distribution[context.gid].comm.send([config, group], remote, (e, v) => { // config can now also be {gid: "string", hash: utils.naiveHash}
        callback(e, v);
      });
    },

    del: (name, callback) => {
      const remote = {gid: context.gid, service: "groups", method: "del"};
      distribution[context.gid].comm.send([name], remote, (e, v) => {
        callback(e, v);
      });
    },

    get: (name, callback) => {
      const remote = {gid: context.gid, service: "groups", method: "get"};
      distribution[context.gid].comm.send([name], remote, (e, v) => {
        callback(e, v);
      });
    },

    add: (name, node, callback) => {
      const remote = {gid: context.gid, service: "groups", method: "add"};
      distribution[context.gid].comm.send([name, node], remote, (e, v) => {
        callback(e, v);
      });
    },

    rem: (name, node, callback) => {
      const remote = {gid: context.gid, service: "groups", method: "rem"};
      distribution[context.gid].comm.send([name, node], remote, (e, v) => {
        callback(e, v);
      });
    },
  };
};

module.exports = groups;
