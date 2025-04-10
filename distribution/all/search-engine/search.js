// Add setup and query services
const inquirer = require('inquirer');
const table = require('cli-table3'); 

const engineConfig = require('./engineConfig')
const nodesManager = require('./utils/nodesManage')
const log = require('./utils/log')
const SE_ERROR = log.ERROR
const SE_LOG = log.LOG

// SEARCH ENGINE CONFIGs (defined in ./engineConfig): 
const searchEngineName = engineConfig.searchEngineName
let queryWithMetadata = engineConfig.queryWithMetadata
let localServer = engineConfig.localServer

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
        message: 'Please enter a key term to search for (or EXIT to exit / or METADATA to toggle print format) =>', 
        default: '', 
    },
    ]);
    return answers.userInput;
}

async function search(searchTerms) {
    SE_LOG("🔍 Querying for: " + searchTerms)

    // Stem all parts of search terms for closer match. 
    const stemmedSearchTerms = engineConfig.stemmer(searchTerms)
   
    nodesManager.searchKeyTerm(stemmedSearchTerms, (e,v) => {
        if (e) {
            console.log("Querying Failed! for search keywords: ", searchTerms, " Error: ", e)
            return null;  
        } else {
            let searchResult = v
            console.log("RESULTS: ", searchResult)
            SE_LOG("Querying Success! Formatting and returning Results.")

            // Format search result into table format.  
            let formattedReuslt = ""
            if (searchResult == null 
                || searchResult == undefined 
                || searchResult.length == 0) {
                formattedReuslt = "No matching pages found..."
            } else {
                let linkToTerms = {} // Build map from link to the index term they were found. 
                let linkToFreq = {} // Build map from link to the freq this link was found.  

                // Go through each returned matching results, and parse through 
                // the global index entries. 
                searchResult.forEach((res) => {
                    const splits = res.split('|') // word | link1 3 link2 6 
                    const terms = splits[0].trim() // word 
                    const linkFreq = splits[1].trim() // link1 3 link2 6
                    const httpRegex = /(https?:\/\/[^\s]+)\s(\d+)/g;
                    while ((lf = httpRegex.exec(linkFreq)) !== null) {
                        const link = lf[1].trim() // link1 
                        const freq = lf[2].trim() // 3 
                        if (!(link in linkToFreq)) {
                            linkToFreq[link] = 0
                        }
                        if (!(link in linkToTerms)) {
                            linkToTerms[link] = []
                        }
                        linkToFreq[link] += Number(freq)
                        linkToTerms[link].push(terms)
                    }
                })

                // Sort {links: freq} by most frequent and push links into 
                // links only array for no metadata result. 
                let linksOnlySorted = {};
                const linksSorted = Object.entries(linkToFreq).sort((a, b) => b[1] - a[1]);
                linksSorted.forEach((linkFreq) => {
                    linksOnlySorted[linkFreq[0]] = linkFreq[1] 
                })

                // Format querying results based on if the user chose metadata 
                // or just with links rankd in frequnecy first. 
                if (queryWithMetadata) {
                    const t = new table({
                        head: ['Link', 'Frequency', 'Index terms'],
                        colWidths: [50, 13, 50], 
                        wordWrap: true
                    });
                    
                    Object.entries(linksOnlySorted).forEach(([link, freq]) => {
                        const terms = linkToTerms[link].join(', ')
                        t.push([link, freq, terms]);
                    });
                    formattedReuslt = t
                } else {
                    const t = new table({
                        head: ['Link', 'Frequency'],
                        colWidths: [60, 13], 
                        wordWrap: true
                    });
                    Object.entries(linksOnlySorted).forEach(([link, count]) => {
                        t.push([link, count]);
                    });
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
    SE_LOG(`Setting up server and ${engineConfig.workerNodesCount} worker nodes for search engine.`) 
    nodesManager.setUpNodes((e, v) => {
        if (!e) {
            localServer = v 
            let path = '../data/books.txt'
            nodesManager.setUpURLs(path, (e, v) => {
                const urlCount = v
                if (!e) {
                    nodesManager.shardURLs((e, v) => {
                        if (!e) {
                            SE_LOG(`Sharded ${urlCount} URL for '${selectedType}' into worker nodes of ${searchEngineName}`) 
                            nodesManager.setUpServer((e, v) => {
                                if (!e) {
                                    SE_LOG(`Setup Seach Engine Server 🚀`) 
                                    SE_LOG(`${searchEngineName} is ready!!`)  
                                    searchRepl(); 
                                }
                            });
                        } else {
                            SE_ERROR(`Fail to shard intial URL keys for ${searchEngineName}: ${e}`) 
                            onExit(); 
                        }
                    })
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