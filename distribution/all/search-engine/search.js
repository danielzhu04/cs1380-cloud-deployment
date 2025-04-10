// Add setup and query services
const inquirer = require('inquirer');
const engineConfig = require('./engineConfig')
const nodesManager = require('./utils/nodesManage')
const log = require('./utils/log')
const SE_ERROR = log.ERROR
const SE_LOG = log.LOG

// SEARCH ENGINE CONFIGs (defined in ./engineConfig): 
const searchEngineName = engineConfig.searchEngineName

// 1. User will select a search engine type they would like to use. 
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

// Main execution loop for registering and executing engine set-up. 
async function startPrompt() {
    const selectedType = await selectSearchEngine();
    
    switch(selectedType) {
        case '❌EXIT': 
            onExit()
            break; 
        case '📚Query Books':
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
        message: 'Please enter a key term to search for (or EXIT) =>', 
        default: '', 
    },
    ]);
    return answers.userInput;
}

async function search(searchTerms) {
    let result = "END SEARCH"
    SE_LOG("🔍 Searching for: " + searchTerms)
    return result 
}

async function searchRepl() {
    const searchTerm = await enterSearchTerm(); 
    switch(searchTerm) {
        case 'EXIT': 
            onExit()
            break; 
        default: 
            const searchResult = await search(searchTerm)  
            SE_LOG("✅ Search result: " + searchResult)
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
            let path = '../data/books.txt'
            nodesManager.setUpURLs(path, (e, v) => {
                const urlCount = v
                if (!e) {
                    nodesManager.shardURLs((e, v) => {
                        if (!e) {
                            SE_LOG(`Sharded ${urlCount} URL for '${selectedType}' into worker nodes of ${searchEngineName}`) 
                            nodesManager.setUpServer((e, v) => {
                                if (!e) {
                                    console.log(`Setup Seach Engine Server 🚀`) 
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