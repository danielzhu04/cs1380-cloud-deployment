// Add setup and query services
test('(10 pts) (scenario) all.mr:dlib', (done) => {
    /*
       Implement the map and reduce functions.
       The map function should parse the string value and return an object with the word as the key and the value as 1.
       The reduce function should return the count of each word.
    */
    
      const mapper = (key, value) => {
        const words = value.split(/\s+/);
        // console.log(words)
        // Returns a list of word : 1
        return words.map((w) => ({[w]: 1}));
      };
    
      const reducer = (key, values) => {
        const out = {};
        // console.log("Values", values)
        out[key] = values.reduce((a, b) => a + b, 0);
        return out;
      };
    
      const dataset = [
        {'b1-l1': 'It was the best of times, it was the worst of times,'},
        {'b1-l2': 'it was the age of wisdom, it was the age of foolishness,'},
        {'b1-l3': 'it was the epoch of belief, it was the epoch of incredulity,'},
        {'b1-l4': 'it was the season of Light, it was the season of Darkness,'},
        {'b1-l5': 'it was the spring of hope, it was the winter of despair,'},
      ];
    
      const expected = [
        {It: 1}, {was: 10},
        {the: 10}, {best: 1},
        {of: 10}, {'times,': 2},
        {it: 9}, {worst: 1},
        {age: 2}, {'wisdom,': 1},
        {'foolishness,': 1}, {epoch: 2},
        {'belief,': 1}, {'incredulity,': 1},
        {season: 2}, {'Light,': 1},
        {'Darkness,': 1}, {spring: 1},
        {'hope,': 1}, {winter: 1},
        {'despair,': 1},
      ];
    
      const doMapReduce = (cb) => {
        distribution.dlib.store.get(null, (e, v) => {
          try {
            expect(v.length).toBe(dataset.length);
          } catch (e) {
            done(e);
          }
    
          distribution.dlib.mr.exec({keys: v, map: mapper, reduce: reducer}, (e, v) => {
            try {
              expect(v).toEqual(expect.arrayContaining(expected));
              done();
            } catch (e) {
              done(e);
            }
          });
        });
      };
    
      let cntr = 0;
    
      // Send the dataset to the cluster
      dataset.forEach((o) => {
        const key = Object.keys(o)[0];
        const value = o[key];
        distribution.dlib.store.put(value, key, (e, v) => {
          cntr++;
          // Once the dataset is in place, run the map reduce
          if (cntr === dataset.length) {
            doMapReduce();
          }
        });
      });
    });