// Add setup and query services
const inquirer = require('inquirer');
const table = require('cli-table3'); 

const engineConfig = require('./engineConfig')
const nodesManager = require('./utils/nodesManage')
const log = require('./utils/log')
const SE_ERROR = log.ERROR
const SE_LOG = log.LOG
const SE_FLOG = log.FLOG

// SEARCH ENGINE CONFIGs (defined in ./engineConfig): 
const searchEngineName = engineConfig.searchEngineName
let queryWithMetadata = engineConfig.queryWithMetadata
let localServer = engineConfig.localServer
const gid = engineConfig.searchGroupConfig.gid

// 1. User will select a search engine type and return result type (if 
//    they would like more metadata in their results) that they would like to use. 
//    This will set up the nodes, init the crawling and indexing process, 
//    or shutdown the engine itself if any of the above fails. 
async function selectSearchEngine() {
    // Register prompting for repl. 
    const answers = await inquirer.default.prompt([
    {
        type: 'list',
        name: 'option',
        message: `Please select a search engine option => `, 
        choices: ['📚Query Books', '❌EXIT'],
    },
    ]);
    return answers.option;
}

async function selectResultType() {
    // Register prompting for selecting result type. 
    const answers = await inquirer.default.prompt([
    {
        type: 'list',
        name: 'option',
        message: `Please select a query result format type => `, 
        choices: ['With Metadata', 'Just Links', 'EXIT'],
    },
    ]);
    switch(answers.option) {
        case 'EXIT': 
            onExit()
            break; 
        case 'With Metadata':
            return true  
        default: 
            break;
    }
    return false
}

// Main execution loop for registering and executing engine set-up. 
async function startPrompt() {
    const selectedType = await selectSearchEngine();
    
    switch(selectedType) {
        case '❌EXIT': 
            onExit()
            break; 
        case '📚Query Books':
            queryWithMetadata = await selectResultType();
            searchRepl();
            manageQueryBooks(); 
            break; 
        default: 
            SE_ERROR('Invalid option');
            break;
    }
}

// 2. Once the engine is set-up succesfully, user will enter a loop repl 
//    to input their search term. 
async function enterSearchTerm() {
    const answers = await inquirer.default.prompt([
    {
        type: 'input', 
        name: 'userInput',
        message: 'Please enter a key term to search for (or EXIT (^C) / or METADATA to toggle print format) =>', 
        default: '', 
    },
    ]);
    return answers.userInput;
}

async function search(searchTerms) {
    SE_LOG("🔍 Querying for: " + searchTerms)
    if (searchTerms == null || searchTerms == undefined || searchTerms.length == 0) {
        return; 
    }

    // Stem all parts of search terms for closer match. 
    const stemmedSearchTerms = engineConfig.stemmer(searchTerms)
   
    nodesManager.searchKeyTerm(stemmedSearchTerms, async (e,v) => {
        if (e) {
            SE_ERROR("Querying Failed! for search keywords: ", searchTerms, " Error: ", e)
            return null;  
        } else {
            let searchResult = v
            // console.log("searchResults: ", searchResult)
            // Format search result into table format.  
            let formattedReuslt = ""
            if (searchResult == null 
                || searchResult == undefined 
                || searchResult.length == 0) {
                formattedReuslt = "No matching pages found..."
            } else {
                const terms = Object.keys(searchResult)[0] // word 

                // Format querying results based on if the user chose metadata 
                // or just with links rankd in frequnecy first. 
                if (queryWithMetadata) {
                    const urls = searchResult.map(o => Object.keys(o)[0]);

                    // const metaArr = await Promise.all(
                    //     urls.map(url =>
                    //         new Promise(resolve =>
                    //             distribution[gid].store.get(url, (err, val) => resolve(val || {}))
                    //         )
                    //     )
                    // )
                    // console.log("metaARR", metaArr
                    const t = new table({
                        head: ['Link', 'Frequency', 'Author', 'Release Date', 'Language', 'Index terms'],
                        colWidths: [60, 10, 25, 18, 12, 20],
                        wordWrap: true
                    });

                    // 1. grab *every* url that will appear in the table
                    const allPairs = []; // [{ url, freq, termKey }]
                    searchResult.forEach(res => {
                        const termKey = res.key;
                        res.freqs.forEach(o => {
                        const url  = Object.keys(o)[0];
                        const freq = o[url];
                        allPairs.push({ url, freq, termKey });
                        });
                    });

                    // 2. fetch metadata for each url in parallel
                    const metaArr = {};  // url -> {author, releaseDate, language}
                    await Promise.all(
                        allPairs.map(pair =>
                        new Promise(resolve =>
                            distribution[gid].store.get(pair.url, (err, meta) => {
                            metaArr[pair.url] = meta || {};
                            resolve();
                            })
                        )
                        )
                    );

                    // 3. build table, avoiding duplicate   url+freq  rows
                    const linkSeen = new Set();      // store "url|freq"
                    allPairs.forEach(({ url, freq, termKey }) => {
                        const tag = url + '|' + freq;
                        if (linkSeen.has(tag)) return;
                        linkSeen.add(tag);

                        const m = metaArr[url];
                        t.push([
                        url,
                        freq,
                        m.author      || 'Unknown',
                        m.releaseDate || 'Unknown',
                        m.language    || 'Unknown', 
                        termKey
                        ]);
                    });
                    // const t = new table({
                    //     head: ['Link', 'Frequency', 'Index terms'],
                    //     colWidths: [80, 13, 50], 
                    //     wordWrap: true
                    // });

                    // searchResult.forEach((res) => {
                    //     let linkSeen = []
                    //     let key = res['key']
                    //     let freq = res['freqs']
                    //     freq.forEach(f => {
                    //         const firstLink = Object.keys(f)[0]
                    //         const freq = f[firstLink] 
                    //         if (!linkSeen.includes(firstLink + freq)) {
                    //             linkSeen.push(firstLink + freq);
                    //             t.push([firstLink, f[firstLink], key]);
                    //         }
                    //     })
                    // })
                    
                    formattedReuslt = t
                } else {
                    const t = new table({
                        head: ['Link', 'Frequency'],
                        colWidths: [80, 13], 
                        wordWrap: true
                    });

                    searchResult.forEach((res) => {
                        let linkSeen = []
                        let key = res['key']
                        let freq = res['freqs']
                        freq.forEach(f => {
                            const firstLink = Object.keys(f)[0]
                            const freq = f[firstLink] 
                            if (!linkSeen.includes(firstLink + freq)) {
                                linkSeen.push(firstLink + freq);
                                t.push([firstLink, f[firstLink]]);
                            }
                        })
                    })
                    
                    formattedReuslt = t
                }
            }
            
            SE_LOG("✅Querying result: \n" + formattedReuslt)
            return formattedReuslt; 
        }
    }); 
}

async function searchRepl() {
    const searchTerm = await enterSearchTerm(); 
    switch(searchTerm) {
        case 'EXIT': 
            onExit()
            break; 
        case 'METADATA': 
            queryWithMetadata = !queryWithMetadata
            searchRepl(); 
            break;  
        default: 
            await search(searchTerm) 
            searchRepl(); 
            break;
    }
}

// 0. BEGIN EVERYTHING!!! 
startPrompt();

// HELPER FUNCTIONS: 
function onExit() {
    SE_LOG(`Shutting down ${searchEngineName} ... `);
    nodesManager.shutDownNodes((e, v) => {
        if (!e) {
            SE_LOG(`${searchEngineName} shut down successful!`)
        } else {
            SE_ERROR(`${searchEngineName} shut down unsuccessful: ${e}`)
        }
        if (localServer) {
            SE_LOG('Closing local server')
            localServer.close()
        }
        console.log("See you! 👋")
        process.exit()
    })
}

// Main function for executing everything books search engine related. 
// This includes calling crawling and indexing. 
function manageQueryBooks() {
    let selectedType = "📚 Query Books"
    SE_FLOG(`Setting up server and ${engineConfig.workerNodesCount} worker nodes for search engine.`)  
    nodesManager.setUpNodes((e, v) => {
        if (!e) {
            localServer = v 
            mergeInterval = setInterval(() => {
                nodesManager.mergeQueueIntoSearchDB((err, msg) => {
                  if (err) {
                    console.error("Error merging queue data:", err);
                  } else {
                    // console.log(msg);
                  }
                }, () => {
                    console.log("Stopping merge process after queue remained empty for 30s.");
                    clearInterval(mergeInterval);
                });
              }, 500); // merge is called every 500ms

            
            let path = '../data/books.txt'
            nodesManager.setUpURLs(path, (e, v) => {
                const urlCount = v
                if (!e) {
                    nodesManager.processAllBatches((err, result) => {
                        if (err) {
                          SE_ERROR(`Failed to process URL batches for ${searchEngineName}: ${err}`);
                          onExit();
                        } else {
                          console.error(`All batches processed. Setting up Search Engine Server 🚀`);
                          console.error(`${searchEngineName} is ready!!`);
                          console.error("Crawler latency (ms/URL): ", (log.elapsed.crawlTime / log.elapsed.numCrawled).toFixed(2));
                          console.error("Crawler throughput (URLs/s): ", (log.elapsed.numCrawled /(log.elapsed.crawlTime / 1000)).toFixed(2));
                          console.error("Indexer latency (ms/URL): ", (log.elapsed.indexTime / log.elapsed.numIndexed).toFixed(2));
                          console.error("Indexer throughput (URLs/s): ", (log.elapsed.numIndexed /(log.elapsed.indexTime / 1000)).toFixed(2));
                          console.error("MR latency (ms/MR operation): ", (log.elapsed.mrTime / log.elapsed.numMr).toFixed(2));
                          console.error("MR throughput (MR operations/s): ", (log.elapsed.numMr /(log.elapsed.mrTime / 1000)).toFixed(2));
                        }
                    });
                } else {
                    SE_ERROR(`${searchEngineName} is not ready (setting up URL data source) ${e}`) 
                    onExit(); 
                }
            })
        } else {
            SE_ERROR(`${searchEngineName} is not ready (setting up nodes) ${e}`) 
            onExit(); 
        }
    })
}