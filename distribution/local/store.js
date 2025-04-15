const path = require('path');
const fs = require('fs');
const id = distribution.util.id;
const serialize = distribution.util.serialize; 
const deserialize = distribution.util.deserialize; 

/* Notes/Tips:

- Use absolute paths to make sure they are agnostic to where your code is running from!
  Use the `path` module for that.
*/

// To turn key into alpha-numeric safe. 
function toAlphaNum(str) {
  if (str == null) {
    return null
  } 
  return str.replace(/[^a-zA-Z0-9]/g, "")
}

// If the NID directory does not exist, create it. 
function resolveNodeDir(gid) {
  dir = path.resolve(__dirname, `../../store/${gid}/${id.getSID(global.nodeConfig)}`)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  } else {
  }
  return dir 
}


function put(state, configuration, callback) {
  console.log("** IN LOCAL STORE PUT");
  // console.log("state is ", state);
  // console.log("config is ", configuration);
  // console.log("CALLBACK IS ", callback);
  let gid = 'local'
  let key = configuration
  let value = state 
  if (configuration && typeof configuration === 'object') {
    gid = configuration.gid 
    configuration = configuration.key 
  } 
  key = toAlphaNum(configuration)
  if (key == null) {
      key = toAlphaNum(id.getID(value))
  }
  let dir = resolveNodeDir(gid)
  let path = `${dir}/${key}` 
  let serializedValue = serialize(value)
  try {
    fs.writeFileSync(path, serializedValue)
    callback(null, value)
  } catch (err) {
    callback(err, null)
  }
}

function get(configuration, callback) {
  let gid = 'local'
  if (configuration && typeof configuration === 'object') {
    gid = configuration.gid 
    configuration = configuration.key 
  } 
  let key = toAlphaNum(configuration)
  let dir = resolveNodeDir(gid)
  let path = `${dir}/${key}`
  try {
    const value = fs.readFileSync(path, 'utf8')
    callback(null, deserialize(value))
  } catch (err) {
    callback(Error(`key ${configuration} not found for get!`), null)
  }
}

function del(configuration, callback) {
  get(configuration, (e, v) => {
    if (e != null) {
      callback(Error(`key ${configuration} not found for del!`), null)
    } else {
      let gid = 'local'
      if (configuration && typeof configuration === 'object') {
        gid = configuration.gid 
        configuration = configuration.key 
      } 
      let key = toAlphaNum(configuration)
      let dir = resolveNodeDir(gid)
      let path = `${dir}/${key}`
      fs.unlink(path, (err) => {
        if (err) {
          callback(Error(`key ${configuration} not found for del!`), null)
          return; 
        } else {
          callback(null, v)
        }
      });
    }
  })
}

module.exports = {put, get, del};