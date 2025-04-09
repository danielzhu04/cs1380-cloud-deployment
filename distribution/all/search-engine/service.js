function search(config) {
    const context = {};
    context.gid = config.gid || 'all';
    context.hash = config.hash || global.distribution.util.id.naiveHash;

    return {
        setup: (configuration, callback) => {
            console.log("in setup");
            const gid = configuration["gid"];
            // Same format as one of the m5 scenarios (tfidf)
            const mapper = (key, value) => {
                return {[key]: value};
            };

            const reducer = (key, values) => {
                // key is the url
                // values is a list of html contents
                const termsToUrls = {};
                values.forEach((html) => {
                    const terms = html.split(" ");
                    terms.forEach((term) => {
                        if (!(term in termsToUrls)) {
                            termsToUrls[term] = {};
                        }
                        if (!(key in termsToUrls[term])) {
                            termsToUrls[term][key] = 0;
                        }
                        termsToUrls[term][key] += 1;
                    })
                });

                const toReturn = [];
                Object.keys(termsToUrls).forEach((term) => {
                    const tempList = [termsToUrls[term]];
                    console.log("templist is ", tempList);
                    toReturn.push({[term]: tempList});
                });
                return toReturn;
            };

            function getDatasetKeys(dataset) {
                return dataset.map((o) => Object.keys(o)[0]);
            };

            const dataset = [
                {'url1': 'machine learning is fun fun fun'},
                {'url2': 'machine learning and deep learning are related, so fun'},
            ];
        
            const doMapReduce = (cb) => {
                distribution[gid].mr.exec({keys: getDatasetKeys(dataset), map: mapper, reduce: reducer}, (e, v) => {
                    console.log("about to return from domapreduce");
                    console.log("domapreduce e is ", e);
                    console.log("domapreduce v is ", v);
                    // Put the results in distributed store;
                    distribution[gid].store.put(v, "searchdb", (e, v) => {
                        callback(e, v);
                    })
                });
            };
        
            let cntr = 0;
            // Send the dataset to the cluster
            dataset.forEach((o) => {
                const key = Object.keys(o)[0];
                const value = o[key];
                distribution[gid].store.put(value, key, (e, v) => {
                    cntr++;
                    // Once the dataset is in place, run the map reduce
                    if (cntr === dataset.length) {
                        console.log("About to do mapreduce");
                        doMapReduce();
                    }
                });
            });
        },

        query: (configuration, callback) => {
            console.log("In the query function");
            callback(null, configuration);
        },
    }
}

module.exports = search;