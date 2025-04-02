// Add setup and query services
function search(config) {
  const context = {};
  context.gid = config.gid || 'all';
  context.hash = config.hash || global.distribution.util.id.naiveHash;
  function setup(configuration, callback) {
    // Assume these are the endpoints for the book txts.
    const dataset = configuration['data']
    const gid = config["gid"];
    function getText() {
      const mapper = (key, value) => {
        
      };
    
      const reducer = (key, values) => {
       
      };  

      distribution[gid].mr.exec({keys: Object.keys(dataset), map: mapper, reduce: reducer}, (e, v) => {
        try {
          expect(v).toEqual(expect.arrayContaining(expected));
          done();
        } catch (e) {
          done(e);
        }
      });
      
    }

    callback(null, configuration);

  }

  return {
    setup,

    query: (configuration, callback) => {
        callback(null, configuration);
    }
  }
}

module.exports = search;  
