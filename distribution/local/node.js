const http = require('http');
const log = require('../util/log');
const routes = require('./routes');
const { serialize, deserialize } = require('../util/serialization');

/*
    The start function will be called to start your node.
    It will take a callback as an argument.
    After your node has booted, you should call the callback.
*/


const start = function(callback) {
  const server = http.createServer((req, res) => {
    /* Your server will be listening for PUT requests. */

    if (req.method == 'PUT') {

      /*
        The path of the http request will determine the service to be used.
        The url will have the form: http://node_ip:node_port/service/method
      */

      const splitURL = (req.url).split("/"); // splitURL takes the form ['', gid, service, method]
      const gid = splitURL[1];
      const serviceName = splitURL[2];
      const methodName = splitURL[3];

      /*

        A common pattern in handling HTTP requests in Node.js is to have a
        subroutine that collects all the data chunks belonging to the same
        request. These chunks are aggregated into a body variable.

        When the req.on('end') event is emitted, it signifies that all data from
        the request has been received. Typically, this data is in the form of a
        string. To work with this data in a structured format, it is often parsed
        into a JSON object using JSON.parse(body), provided the data is in JSON
        format.

        Our nodes expect data in JSON format.
    */

      let body = [];

      req.on('data', (chunk) => {
        body.push(chunk);
      });

      req.on('end', () => {


        /* Here, you can handle the service requests.
        Use the local routes service to get the service you need to call.
        You need to call the service with the method and arguments provided in the request.
        Then, you need to serialize the result and send it back to the caller.
        */

        let config = serviceName;
        if (gid != 'local') {
          config = {service: serviceName, gid: gid};
        }
        routes.get(config, (error, service) => {
            if (error) {
              errToRet = new Error(`Cannot retrieve service: ${error}`);
              res.end(serialize(errToRet));
              return;
            }

            const serviceFunc = service[methodName];
            const args = deserialize(body);
            serviceFunc(...args, (error, returnedVal) => {
              console.log("IN NODE JS")
              if (gid == 'local' && error) {
                errToRet = new Error(`Cannot execute service method: ${error}`);
                res.end(serialize(errToRet));
              } else if (gid != 'local') {
                const serializedRetVal = serialize({e: error, v: returnedVal});
                res.end(serializedRetVal);
              } else {
                const serializedRetVal = serialize(returnedVal);
                res.end(serializedRetVal);
              }
            });
        });
      });
    }
  });


  /*
    Your server will be listening on the port and ip specified in the config
    You'll be calling the `callback` callback when your server has successfully
    started.

    At some point, we'll be adding the ability to stop a node
    remotely through the service interface.
  */

  server.listen(global.nodeConfig.port, global.nodeConfig.ip, () => {
    console.log(`Server running at http://${global.nodeConfig.ip}:${global.nodeConfig.port}/`);
    global.distribution.node.server = server;
    callback(server);
  });

  server.on('error', (error) => {
    server.close((e) => {
      console.log("closing error: ", e)
      log(`Server error: ${error}`);
      throw error;
    });
    
  });
};

module.exports = {
  start: start,
};
