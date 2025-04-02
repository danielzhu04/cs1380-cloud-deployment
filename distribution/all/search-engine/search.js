// Add setup and query services
function search(config) {
  const context = {};
  context.gid = config.gid || 'all';
  context.hash = config.hash || global.distribution.util.id.naiveHash;

  return {
    setup: (configuration, callback) => {
        callback(null, configuration);
    },

    query: (configuration, callback) => {
        callback(null, configuration);
    }
  }
}

module.exports = search;  
