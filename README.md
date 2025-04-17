# distribution

This is the distribution library. When loaded, distribution introduces functionality supporting the distributed execution of programs. To download it:

## Installation

```sh
$ npm i '@brown-ds/distribution'
```

This command downloads and installs the distribution library.

## Testing

There are several categories of tests:
  *	Regular Tests (`*.test.js`)
  *	Scenario Tests (`*.scenario.js`)
  *	Extra Credit Tests (`*.extra.test.js`)
  * Student Tests (`*.student.test.js`) - inside `test/test-student`

### Running Tests

By default, all regular tests are run. Use the options below to run different sets of tests:

1. Run all regular tests (default): `$ npm test` or `$ npm test -- -t`
2. Run scenario tests: `$ npm test -- -c` 
3. Run extra credit tests: `$ npm test -- -ec`
4. Run the `non-distribution` tests: `$ npm test -- -nd`
5. Combine options: `$ npm test -- -c -ec -nd -t`

## Usage

To import the library, be it in a JavaScript file or on the interactive console, run:

```js
let distribution = require("@brown-ds/distribution");
```

Now you have access to the full distribution library. You can start off by serializing some values. 

```js
let s = distribution.util.serialize(1); // '{"type":"number","value":"1"}'
let n = distribution.util.deserialize(s); // 1
```

You can inspect information about the current node (for example its `sid`) by running:

```js
distribution.local.status.get('sid', console.log); // 8cf1b
```

You can also store and retrieve values from the local memory:

```js
distribution.local.mem.put({name: 'nikos'}, 'key', console.log); // {name: 'nikos'}
distribution.local.mem.get('key', console.log); // {name: 'nikos'}
```

You can also spawn a new node:

```js
let node = { ip: '127.0.0.1', port: 8080 };
distribution.local.status.spawn(node, console.log);
```

Using the `distribution.all` set of services will allow you to act 
on the full set of nodes created as if they were a single one.

```js
distribution.all.status.get('sid', console.log); // { '8cf1b': '8cf1b', '8cf1c': '8cf1c' }
```

You can also send messages to other nodes:

```js
distribution.all.comm.send(['sid'], {node: node, service: 'status', method: 'get'}, console.log); // 8cf1c
```

# Results and Reflections

# M1: Serialization / Deserialization


## Summary

> Summarize your implementation, including key challenges you encountered. Remember to update the `report` section of the `package.json` file with the total number of hours it took you to complete each task of M1 (`hours`) and the lines of code per task.


My implementation comprises 2 main software components, totaling 74 lines of code. These 2 components live in the `distribution/util/serialization.js` file, and involve serializing and deserializing various JavaScript (JS) types. The file accounts for serializing and deserializing JS base types like Numbers, Strings, Booleans, null, and undefined (30 lines of code), JS functions (4 lines of code), and more complex JS structures like Objects, Arrays, Errors, and Dates (40 lines of code). My implementation also comes with several tests written in the `test/test-student/m1.student.test.js` file, which test that the serialization and deserialization process works on various JS types (152 lines of code). Lastly, I have completed the tests located at `scenarios/m1/m1.scenario.js` by creating objects/variables that fulfill each of the specific scenarios listed per test (5 lines of code). 

Key challenges included getting familiar with converting JavaScript into JSON format and vice versa, ensuring that pre-serialization objects are truly "equal" to post-deserialization objects, and ensuring that the order in which I check argument types in my `serialize` function doesn't cause any unintended functionality. I think the hardest challenge was converting JavaScript objects into JSON format and vice versa -- when I was testing my implementation, there were many times when my `deserialize` function would error because the output from my `serialize` function wasn't in proper JSON format. Then, I would have to look through my `serialize` function's code to see if I maybe missed a double-quote or a curly bracket somewhere, which ended up taking more time than I anticipated. I helped resolve this issue by using the `JSON.stringify()` and `JSON.parse()` functions throughout my code instead of manually trying to convert inputs into JSON format or back into JavaScript. I also encountered an issue where my tests for serializing and deserializing functions would always error no matter what I did, and after asking about this issue on EdStem, a classmate helped me realize that this was due to a limitation with how Jest determines function equality. Therefore, instead of directly testing whether pre-serialization and post-deserialization functions are equal, I tested whether the string representations of pre-serialization and post-deserialization functions are equal (which caused my tests to pass). Lastly, I noticed that the order in which I type-check arguments in my `serialize` function matters -- I used to type-check for objects before I type-checked for some other JS types, which caused some of my tests to fail because a couple of my testing variables were being evaluated as objects instead of what I intended to evaluate them as. I solved this issue by type-checking for objects after I type-checked for other data types. 


## Correctness & Performance Characterization


> Describe how you characterized the correctness and performance of your implementation


*Correctness*: I wrote 5 tests to verify that JS base structures are correctly serialized and deserialized, and I also wrote 5 additional tests to verify that JS functions and complex structures (i.e., Objects, Arrays, Errors, and Date structures) are also correctly serialized and deserialized. These tests take roughly 0.383 seconds to execute locally and 0.986 seconds to execute on the cloud. My tests account for objects that are Numbers (negative and positive), Strings (empty and non-empty), Booleans, null, undefined, functions (both assigned to a variable and not assigned to a variable), Objects (including empty Objects and Objects containing Arrays and additional Objects), Arrays (including Arrays of various data types, like Objects, other Arrays, Dates, null, etc.), Errors (with an error message and without an error message), and Dates. These tests can be found in the `test/test-student/m1.student.test.js` file. 


*Performance*: The latency of various subsystems is described in the `"latency"` portion of package.json. The characteristics of my development machines are summarized in the `"dev"` portion of package.json. 

I calculated the latency of serialization followed by immediate deserialization on three different types of workloads -- JS base structures, functions, and more complex structures. I did this by using three of the test functions I wrote in the `test/test-student/m1.student.test.js` file -- the test functions I used to verify serialization and deserialization for Strings (base structures), functions, and Objects (more complex structures). I used the `performance.now()` function to keep track of the timestamp right before serialization as well as the timestamp right after deserialization, subtracting the two to get one latency calculation (in milliseconds per serialization-deserialization operation). Since I wrote multiple tests within my three aforementioned test functions, I calculated the average latency for each workload I tested and printed them all to the console after all my tests finished running. 

There are three latency measurements in my `package.json` file. They correspond to Strings (base structures), objects (complex structures), and functions, in that order. To reiterate, all latency measurements are in milliseconds per serialization-deserialization operation. I ran my tests both locally and on the cloud, and therefore I calculated my serialization-deserialization latencies both locally and on the cloud as well.


# M2: Actors and Remote Procedure Calls (RPC)


## Summary

> Summarize your implementation, including key challenges you encountered. Remember to update the `report` section of the `package.json` file with the total number of hours it took you to complete each task of M2 (`hours`) and the lines of code per task.


My implementation comprises 4 main software components, totaling 142 lines of code. The software components are as follows:
1. A `status` service found in the `distribution/status.js` file that returns various information (such as the ip number and the port number) belonging to a specific node.
2. A `routes` service found in the `distribution/routes.js` file that maps names to service objects.
3. A `comm` service found in the `distribution/comm.js` file that sends (serialized) messages from a node to another node. It makes an HTTP PUT request (through the function `http.request()`) to send a message from one node to another.
4. The code that starts up a node found in the `distribution/node.js` file. This code creates an HTTP server for the node, where the server listens for HTTP PUT requests (i.e., those sent using the `comm` service), tries to deserialize request bodies, uses the `routes` service to help invoke the appropriate service out of all mapped services for handling specific messages, and then sends HTTP responses back to the entities that sent PUT requests. 

I have also written student tests for those 4 components in the `test/test-student/m2.student.test.js` file. There are 5 testing functions spanning 162 lines of code (see the `Correctness & Performance Characterization` section for more detailed information on these tests). Lastly, I have completed the tests located at `scenarios/m2/m2.scenario.js` so that they behave as expected by following the instructions both in the M2 handout and in the file itself (9 lines of code). 

Some key challenges included implementing the `conn.send()` function in `distribution/local/comm.js` and filling out the `distribution/local/node.js` file. I ran the `test/comm.local.test.js` file whenever I wanted to test the correctness of my `conn.send()` and `node.js` implementations, but because the `test/comm.local.test.js` file tests for the functionality of both `conn.send()` and `node.js` at once, whenever an error occurred, I would often be unsure whether the error was due to a bug in my `conn.send()` implementation or a bug in my `node.js` implementation. For example, I encountered an error where `node.js` would refuse to create a server, but I wasn't sure if this was due to buggy code in the `node.js` file itself or a buggy HTML PUT request created in the `conn.send()` function. To handle these challenges, I added extensive print statements (which have since been removed) for debugging in all relevant files, and I also made sure to account for as many error cases as I could think of (for example, I accounted for the cases where either an HTML PUT request or the received HTML PUT response experience an error in the `comm.js` file). 


## Correctness & Performance Characterization

> Describe how you characterized the correctness and performance of your implementation


*Correctness*: I wrote 5 testing functions located in the `test/test-student/m2.student.test.js` file. Each testing function is dedicated to one of the 5 methods in the core service library specified in the M2 handout's "The Core Service Library" section. The following are simple descriptions for each testing function: 
1. A testing function for the `status.get()` method. It accounts for the case where valid node information is retrieved, as well as the case where nonexistent node information is retrieved.
2. A testing function for the `routes.get()` method. It accounts for the cases where a successful service is retrieved, a service is unsuccessfully retrieved due to a nonexistent service configuration being specified, and a service is unsuccessfully retrieved due to an improperly formatted service configuration being specified. 
3. A testing function for the `routes.put()` method. It accounts for the cases where a service is successfully pushed into the service map stored in `distribution/local/routes.js`, a service is not pushed into the service map due to an improperly formatted service configuration being specified, and a service is not pushed into the service map due to an improperly formatted service object being specified. 
4. A testing function for the `routes.rem()` method. It accounts for the cases where a service is successfully removed from the service map stored in `distribution/local/routes.js`, no service is removed because of an improperly formatted service configuration being specified, and no service is removed because of a nonexistent service configuration being specified. 
5. A testing function for the `comm.send()` method. It accounts for the cases where a message is successfully sent, a message is unsuccessfully sent because it contains invalid contents, and a message is unsuccessfully sent because an invalid `remote` method argument is specified. 

These tests take around 0.265 seconds to execute locally.


*Performance*: I characterized the performance of comm and RPC by sending 1000 service requests one after another. The average throughput (in service requests per millisecond) and latency (in milliseconds per service request) are recorded in `package.json`. To characterize performance, I wrote two JavaScript files in the `performance` directory, each dedicated to either comm performance (`performance/m2.commPerformance.js`) or RPC performance (`performance/m2.rpcPerformance.js`). Each file contains a comment at the very top that specifies how to run them. Both files involve first instantiating necessary variables and then recursively calling a function that makes a service request until 1000 requests have been made. Afterward, throughput and latency are calculated and printed to the console. 

Note that throughput and latency are recorded as lists in `package.json`. The first element in each list is the comm performance value, while the second element in each list is the RPC performance value. Performance was only calculated locally, not on the cloud, per the clarification in Ed post #119. 


## Key Feature

> How would you explain the implementation of `createRPC` to someone who has no background in computer science — i.e., with the minimum jargon possible?

Sometimes, a code developer might want to run functions (blocks of code that take in inputs, process them in some way, and then return the resulting outputs) living at very different/remote locations. For example, a person might want to use code to compute addition on two numbers, but the function that performs that computation lives on a different device. Normally, a developer cannot run a function that lives at a different location (e.g., on a different device from the one the developer is currently using). However, the `createRPC` function makes this possible. If you give the `createRPC` function another function (the one that we want to call remotely) as an input, the `createRPC` function will return a new function that, whenever called, will perform the various steps necessary to call the remote function and then send the remote function's output back to the entity that called `createRPC` in the first place. The "various steps necessary to call the remote function" mentioned regarding the function that the `createRPC` function returns include converting desired remote function inputs into a transmittable format and then sending those "serialized" inputs over to the remote function's location for the remote function to use when it executes, as well as converting the remote function's output into a transmittable format and sending that "serialized" output back to the entity that called `createRPC` once the remote function finishes execution, among other steps. In this fashion, the `createRPC` function enables developers to run and obtain outputs from remote functions that they wouldn't be able to run otherwise. 


# M3: Node Groups & Gossip Protocols


## Summary

> Summarize your implementation, including key challenges you encountered. Remember to update the `report` section of the `package.json` file with the total number of hours it took you to complete each task of M3 (`hours`) and the lines of code per task.


My implementation comprises 5 new software components, totaling 185 added lines of code over the previous implementation. The following are simple descriptions for each software component:
1. The `local.groups` service, which maps node group names to sets of nodes, with each set of nodes being a map from node SIDs to node objects. This service supports retrieving, inserting, and deleting node groups, as well as adding and removing specific nodes. 
2. The `all.comm` service, which is the distributed version of the `local.comm` service. It makes several `local.comm.send()` calls to all of the nodes within a specific group and returns the aggregated results of those calls in the form of an object of errors and an object of valid values. 
3. The `all.status` service, which is the distributed version of the `local.status` service. It utilizes the `all.comm` service to collect aggregated status service responses from all the nodes in a specific group. For example, an `all.status.get('port', ...)` method call returns the port numbers of all the nodes in a group in the form of an object of values, along with an object of errors. 
4. The `all.groups` service, which is the distributed version of the `local.groups` service. It utilizes the `all.comm` service to collect aggregated groups service responses from all the nodes in a specific group. It also has the same capabilities as the `local.groups` service but for all the nodes in a specific group rather than for just one node. For example, the `all.groups.put()` method updates group-node mappings for all the nodes in a group rather than for just one node like the `local.groups.put()` method does. 
5. The `all.routes` service, which is the distributed version of the `local.routes` service. It utilizes the `all.comm` service to collect aggregated routes service responses from all the nodes in a specific group. In particular, the `all.routes.put()` method extends the capabilities of the `local.routes.put()` method by establishing a new mapping from a service name to a service function for all the nodes in a group rather than for just one node. 

This milestone's biggest key challenge was conceptually understanding how distributed services interact with local services. For example, I was conceptually confused about how the `distribution/local/node.js` file knows when to "use" the gid provided in an HTTP request's url and call a distributed service method instead of a local service method. I solved my conceptual confusion by attending office hours. For example, I learned in office hours that the `local.routes.get()` method should be the one to figure out when to call a distributed service method versus a local service method instead of any function in `distribution/local/node.js`. I also found that rewatching the M3 gearup video (particularly the "An Example in Testing" section) was helpful for conceptually understanding what the milestone tests do (which in turn helped me understand what my implementations should do). Additionally, I had some trouble with conducting the first usage scenario since I couldn't figure out how to launch nodes from the command line. I resolved this issue by making Ed posts, where TAs told me that trouble launching nodes from the command line likely stems from serialization and deserialization problems. Through those Ed posts, I eventually figured out how to launch nodes from the command line, and completed usage scenario 1. 


## Correctness & Performance Characterization

> Describe how you characterized the correctness and performance of your implementation


*Correctness* -- I wrote 5 testing functions in the `test/test-student/m3.student.test.js` file, spanning 224 lines of code. These tests execute in approximately 0.625 seconds. Each testing function tests one of the 5 new software components implemented in this milestone. Simple descriptions for each testing function are as follows:
- A test for the `local.groups` service, which tests that the `local.groups.get()` method functions as expected. 
- A test for the `all.comm` service, which tests that `all.comm.send()` can be used to call the `status.get()` method on all nodes within a specific group. 
- A test for the `all.status` service, which tests that we can use the `all.status.get()` method to retrieve pieces of node information for all nodes within a specific group in a distributed manner.  
- A test for the `all.groups` service, which tests that we can use the `all.groups.put()` method to establish a new mapping from a group name to a set of nodes for all the nodes within a specific group in a distributed manner. 
- A test for the `all.routes` service, which tests that we can add a new mapping from a service name to a service function (through the `all.routes.put()` method) for all the nodes within a specific group in a distributed manner. 


*Performance* -- I measured throughput (spawned nodes per millisecond) and latency (milliseconds per spawned node) for the following scenarios:
1. Booting up a node programmatically, as described in the "Booting up a Node" section in the M3 handout. This scenario resulted in an average throughput of 0.01030 spawned nodes per ms and an average latency of 97.11880 ms per spawned node.
2. Booting up a node through the command line, as described in the "Booting up a Node" section of the M3 handout. This scenario resulted in an average throughput of 0.02440 spawned nodes per ms and an average latency of 40.98537 ms per spawned node.
3. Spawning additional nodes through the `local.status.spawn()` method. This scenario resulted in an average throughput of 0.01620 spawned nodes per ms and an average latency of 61.72729 ms per spawned node. 

I wrote a JavaScript file, `performance/m3.nodePerformance.js`, to help measure performance. This file executes in around 0.541 seconds. Details on how to run the file are listed in a comment at the top of the file. I ran this file multiple times to collect multiple elapsed time measurements for booting up a node programmatically, which I used to help calculate performance measurements for the first scenario described above. I also ran specific commands for booting up nodes through the command line with logged elapsed times multiple times, which I used to help calculate performance measurements for the second scenario described above. Since I call the `local.status.spawn()` method multiple times in the `performance/m3.nodePerformance.js` file, I calculate throughput and latency for the third scenario described above within the file itself and thus only need to run the file once to determine the performance and throughput for spawning additional nodes.

I only conducted performance tests locally (not on the cloud). Note that the throughput and latency measurements documented in `package.json` each have the form [measurement 1, measurement 2, measurement 3], where measurement 1 corresponds to the first scenario described above (booting up nodes programmatically), measurement 2 corresponds to the second scenario described above (booting up nodes through the command line), and measurement 3 corresponds to the third scenario described above (spawning additional nodes). 


## Key Feature

> What is the point of having a gossip protocol? Why doesn't a node just send the message to _all_ other nodes in its group?

We use gossip protocols to balance robustness and scalability in distributed systems. If we let a node send a message to all other nodes in its group, there is a possibility that some of the nodes won't receive the message (e.g., due to the network packet(s) containing the message being dropped). The node with the message could keep re-sending its message to all other nodes in its group until it receives packets from all the other nodes acknowledging the broadcasted message. However, this is a very inefficient process -- if a large number of nodes get added to the group, this process of ensuring that all nodes receive broadcasted messages will become significantly slower. 

To counteract this problem, we might instead implement a system of eager broadcasting, where we have all nodes in a group re-send broadcasted messages to all other nodes in the group. This would improve the system's robustness in terms of ensuring that messages get delivered properly. However, this implementation scales very poorly (it has a complexity of O(n^2), where n is the number of nodes in the group) and becomes extremely computationally costly in groups with very large numbers of nodes. 

A gossip protocol provides both scalability and robustness. The original node with a message only sends said message to a tune-able number of other nodes in its group, and those nodes in turn send the message to a tune-able number of its peer nodes, and so on until every node in the group likely knows about the original node's message. Since each node sends messages to a relatively small number of peer nodes, gossip protocols aren't too complex/computationally costly and also scale relatively well (for example, if we configure our gossip protocol to make nodes send messages to log(n) peer nodes at a time, all nodes will likely eventually receive the original message in only around O(log(n)) steps). Since there is a high probability that all nodes will eventually learn of the original node's message due to each node disseminating the message to multiple peers, gossip protocols are relatively robust as well.

Furthermore, gossip protocols come with configurable parameters that we can tune to fit the needs of the system at hand. For example, we may increase the number of nodes each node sends a message to per step if we want to increase system robustness at the cost of some efficiency for relatively small node groups, but we may decrease the number of nodes each node sends a message to per step for very large node groups. Therefore, using gossip protocols is a lot more flexible than just always making a node send messages to every other node in its group. 


# M4: Distributed Storage


## Summary

> Summarize your implementation, including key challenges you encountered


Remember to update the `report` section of the `package.json` file with the total number of hours it took you to complete each task of M4 (`hours`) and the lines of code per task.

My implementation comprises 5 new software components (excluding things like tests), totaling 361 added lines of code over the previous implementation. The following are simple descriptions for each software component:
1. The `local.mem` service, which stores an in-memory hashmap/object data structure of name keys and object values. It contains methods for inserting, retrieving, and deleting hashmap/object entries. Additionally, if a null name is provided as an argument to the `local.mem.put()` method, the method will map the sha256 hash of the argument-provided object to said object. 
2. The `local.store` service, which persistently stores objects on disk in the form of files containing serialized objects. It contains methods for inserting, retrieving, and deleting files. If a null name is provided as an argument to the `local.store.put()` method, the method will store the argument-provided object's contents in a file with the sha256 hash of the object as the file name.
3. The `all.mem` service, which is the distributed version of the `local.mem` service. It supports inserting, retrieving, and deleting objects stored in in-memory hashmap/object data structures across multiple nodes in a node group. The `all.mem.put()` method retrieves all the nodes in a node group, uses hashing functions to determine which node to place an argument-provided key-value pair, and then uses a `local.mem.put()` call to insert the key-value pair into the hashmap/object stored at that node. The `all.mem.get()` and `all.mem.del()` methods are able to figure out which node the key-value pair associated with an argument-provided key is stored at and then retrieve or delete that key-value pair. 
4. The `all.store` service, which is the distributed version of the `local.store` service. It supports inserting, retrieving, and deleting objects stored on disk that are distributed across multiple nodes in a node group. The `all.store.put()` method retrieves all the nodes in a node group, uses hashing functions to determine which node a soon-to-be-stored object should correspond to, and then uses a `local.store.put()` call to create a file containing the object's data and corresponding to that node. The `all.store.get()` and `all.store.del()` methods are able to figure out which node a file is associated with and then retrieve that file's contents or delete that file, respectively.
5. Two scalable hashing functions written in the `distribution/util/id.js` file. Specifically, I implemented consistent hashing in the function called `consistentHash` and I implemented rendezvous hashing in the function called `rendezvousHash`. Both functions take in a KID (key ID) and a list of NIDs (node IDs) as inputs and return the NID corresponding to the KID. This allows us to determine which node a key (i.e., a hashmap key or a filename) should be stored on. 

This milestone's key challenges included ensuring that scalable hashing works as expected and measuring the performance of my distributed key-value store on the cloud. It was relatively difficult to verify that the hashing functions worked as expected after getting hashing-related test failures because the process of manually calculating which NID a KID should correspond to was relatively time consuming due to both consistent hashing and rendezvous hashing involving several different steps and handling relatively complex values (e.g., KIDs, NIDs, sha256 values). However, the concrete implementation details for consistent hashing and rendezvous hashing outlined in the M4 document were extremely helpful for enforcing a strong conceptual understanding of what consistent and rendezvous hashing should do, which I feel ended up simplifying the implementation and verification/testing process a bit. I ended up successfully verifying my hashing functions -- it just took a bit of time to do so. Measuring the performance of my distributed key-value store on the cloud was similarly time consuming, and was difficult to me because I'm not too familiar with AWS. I ended up spending a lot of time trying to connect to currently running AWS EC2 nodes so that I could run my performance program using said nodes. Revisiting and constantly referencing the M0 handout's section on creating AWS instances helped guide me throughout that process, and I also went to Office Hours to receive additional advice on connecting to EC2 nodes. Eventually, I was able to successfully run my performance program on the cloud by changing several settings for my EC2 nodes on AWS (e.g., making sure all of the nodes belong to the same security group), as well as what IP numbers (the EC2 nodes' public IP addresses) and port numbers (I used port 0) I should use in my performance program.


## Correctness & Performance Characterization

> Describe how you characterized the correctness and performance of your implementation


*Correctness* -- I wrote 5 testing functions in the `test/test-student/m4.student.test.js` file, spanning 216 lines of code. These tests execute in approximately 0.665 seconds locally. Each testing function tests one of the 5 new software components implemented in this milestone. Simple descriptions for each testing function are as follows:
- A testing function for the `local.mem` service, which tests that calling the `local.mem.put()` method to insert an object into our in-memory hashmap/object storage system and then attempting to retrieve the inserted object afterward with the `local.mem.get()` method will correctly retrieve the inserted object. It also tests that inserting an object with a null key and then calling `local.mem.get()` with the sha256 hash of the inserted object as the argument-specified key will correctly retrieve the inserted object. 
- A testing function for the `local.store` service, which tests that calling the `local.store.put()` method to insert an object into our on-disk storage system and then attempting to retrieve the inserted object afterward with the `local.store.get()` method will correctly retrieve the inserted object. It also tests that inserting an object with a null key and then calling `local.store.get()` with the sha256 hash of the inserted object as the argument-specified key will correctly retrieve the inserted object. 
- A testing function for the `all.mem` service, which tests that calling the `all.mem.put()` method to insert an object into our distributed in-memory hashmap/object storage system and then attempting to retrieve the inserted object afterward with the `all.mem.get()` method will correctly retrieve the inserted object. It also tests that inserting an object from one group (e.g., through calling `distribution.mygroup.mem.put()`) and then trying to retrieve that object from another group (e.g., through calling `distribution.mygroupB.mem.get()`) will result in an error.
- A testing function for the `all.store` service, which tests that calling the `all.store.put()` method to insert an object into our distributed on-disk storage system and then attempting to retrieve the inserted object afterward with the `all.store.get()` method will correctly retrieve the inserted object. It also tests that inserting an object from one group (e.g., through calling `distribution.mygroup.store.put()`) and then trying to retrieve that object from another group (e.g., through calling `distribution.mygroupB.store.get()`) will result in an error.
- A testing function for the scalable hashing functions, which contain a test that validates that our consistent hashing function works as expected, along with a test that validates that our rendezvous hashing function works as expected.


*Performance* -- I characterized the performance of my distributed key-value store (specifically, the distributed `store` service) for object insertion and object retrieval. The `package.json` file contains my performance metrics, which consist of throughput (either objects inserted per millisecond or objects retrieved per millisecond) and latency (either milliseconds per object insertion or milliseconds per object retrieval).

I wrote the JavaScript file `performance/m4.keyValuePerformance.js` to help measure performance. When this file gets ran, my throughput and latency calculations for object insertion and object retrieval are printed to the console. Instructions on how to run the file are located at the top of the file. Within the file, I first create a hashmap/object storing 1000 randomly generated key-value pairs, where the keys are strings and the values are objects with random entries. Then, to measure object insertion performance, I issue distributed `all.store.put()` calls to store all of the aforementioned key-value pairs persistently on disk in an established node group. I keep note of the total elapsed time for all of the `put` calls and use that value to measure the throughput and latency of object insertion after all key-value pairs have been inserted into the persistent key-value system. Afterward, to measure object retrieval performance, I issue distributed `all.store.get()` calls to retrieve all 1000 aforementioned key-value pairs. I similarly keep note of the total elapsed time for all of the `get` calls and use that value to measure the throughput and latency of object retrieval after all key-value pairs have been retrieved from the key-value system.

I ran my JavaScript file utilizing three running AWS nodes as the nodes in my program to measure performance on the cloud (note that I do not measure performance locally). The throughput and latency are recorded in `package.json`, each taking the form of a list of two elements. The first element in each list corresponds to the measurements for object insertion, while the second element in each list corresponds to the measurements for object retrieval.


## Key Feature

> Why is the `reconf` method designed to first identify all the keys to be relocated and then relocate individual objects instead of fetching all the objects immediately and then pushing them to their corresponding locations?

The `reconf` method is designed to first identify all the keys to be relocated before relocating individual objects instead of fetching all the objects at once and then pushing all of them to their corresponding locations because by fetching all the keys to be relocated first, we can improve our key-value system's efficiency. After all, it takes less time and computational resources to first gather all the keys of objects that need to be relocated and then relocating only those objects compared to gathering all objects, even those that don't need to be relocated, and then assigning them all to their correct locations. Moreover, the latter is a wasteful approach because even for objects whose locations don't change, we would still have to retrieve them, delete them from their old location, and then re-insert them back into the same location -- this unnecessarily spends resources that the former approach does not spend. 


# M5: Distributed Execution Engine


## Summary

> Summarize your implementation, including key challenges you encountered. Remember to update the `report` section of the `package.json` file with the total number of hours it took you to complete each task of M5 (`hours`) and the lines of code per task.


My implementation comprises 1 new software component, `MapReduce`, totaling 291 added lines of code over the previous implementation. `MapReduce` allows us to process large datasets in a scalable, efficient, and distributed manner. We are able to apply `MapReduce` to specific datasets through a newly created `mr` service. Most of the `MapReduce` functionality can be found in the `distribution/all/mr.js` file, where the code I wrote can be partitioned into 5 phases (most of which can be found in the `exec` function):
1. A setup phase, where I register a temporary randomly-named service endpoint on all nodes in a specific group ("worker nodes") as well as on the local node (the "coordinator node"). Each service should come with 3 methods -- `map`, `shuffle`, and `reduce`. Given a set of keys of objects stored in our distributed storage system, this phase also takes those keys and "assigns" them to the worker nodes using a hashing algorithm for load-balancing purposes.
2. A map phase, where the `map` method is called on each of the worker nodes to retrieve the values of all the keys that were "assigned" to them in the setup phase from our `store` system, apply a configuration-provided `map` function to those key-value pairs, and then store the resulting key-value pairs in their local `store` systems. 
3. A shuffle phase, where the `shuffle` method is called on the worker nodes to retrieve the key-value pairs stored in their local `store` systems, and then assign those key-value pairs to the worker nodes by inserting each of them into our distributed `mem` system (which automatically assigns key-value pairs to nodes in a load-balanced fashion using a hashing algorithm) through a newly created `append` method I wrote for my `mem` service.  
4. A reduce phase, where the `reduce` method is called on each of the worker nodes to retrieve all key-value pairs that got assigned to them during the shuffle phase from their local `mem` systems, and then apply a configuration-provided `reduce` function to those key-value pairs. Each worker node then returns the results, which are combined by the coordinator node. 
5. A teardown phase, where I delete all the data that was stored using our distributed mem and distributed store services, as well as de-register the temporary service endpoint used to call the `map`, `shuffle`, and `reduce` methods on each of the worker nodes. Afterward, the coordinator node returns the combined results from the reduce phase. 

One key challenge was conceptually understanding what `MapReduce` does. It took a while for me to understand what the `map` and `reduce` inputs and outputs should be when first given a problem that I should apply `MapReduce` to. This made completing the milestone scenarios difficult at first. For example, I struggled a lot with determining what the outputs (particularly what shapes they should take, like whether they should be arrays, Objects, etc.) of the `map` and `reduce` functions for the `dlib` scenario should be. I experienced a similar struggle with the other scenarios that I implemented. I was able to overcome this challenge by thoroughly reviewing the examples we completed in class about determining `MapReduce` inputs and outputs for specific workflows. I also asked several questions related to this challenge on Ed Stem and in Office Hours, which helped me eventually understand how to complete the scenarios. 

Another key challenge was navigating this milestone's open-endedness. I struggled with planning my design for this milestone due to the sheer number of different ways we could potentially implement `MapReduce` -- originally, I was unsure whether or not I wanted to write concrete `notify` and `shuffle` methods, or if I wanted to instead implement all of their functionality within other methods (and therefore not write concrete `notify` and `shuffle` methods). After I started working on my implementation, this problem made progress extremely slow at first. However, I was able to overcome this challenge by attending Office Hours and seeking advice about design decisions. After I successfully fleshed out my `MapReduce` design, progress started becoming faster.


## Correctness & Performance Characterization

> Describe how you characterized the correctness and performance of your implementation


*Correctness*: I wrote 5 test cases to test the accuracy of my `MapReduce` implementation (i.e., to test that my `MapReduce` implementation returns expected results) on the following 5 workflows:
1. Calculating the maximum temperature for each unique year, given a dataset containing temperature data across several years. 
2. Calculating the total (i.e., across all documents) word count of all terms, given a dataset of documents. 
3. Calculating the per-document TF-IDF scores of all terms, given a dataset of documents. 
4. Determining which documents contain the word "the" (case-insensitive), given a dataset of documents. 
5. Mapping all terms to the documents that contain them, given a dataset of documents. 

These tests are located in the `test/test-student/m5.student.test.js` file, which takes approximately 0.509 seconds to finish running. These tests span 400 lines of code. 


*Performance*: My TF-IDF workflow can sustain 0.07970 `MapReduce` operations per millisecond (79.7 `MapReduce` operations per second), with an average latency of 12.54706 milliseconds per `MapReduce` operation (0.01254706 seconds per `MapReduce` operation). To calculate performance, I created the file `performance/m5.mapReducePerformance.js`, which applies `MapReduce` to the TF-IDF workflow several times and tracks the time it takes for the `mr.exec` service method to finish executing each time. Afterward, I used my total time measurement to calculate the throughput and latency of my TF-IDF workflow locally. 

Note that I only characterized the performance of my chosen workflow (TF-IDF) locally, and not in the cloud. 


## Key Feature

> Which extra features did you implement and how?
