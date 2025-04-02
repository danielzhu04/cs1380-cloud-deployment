// Add setup and query services
const inquirer = require('inquirer');
const nodesManager = require('./nodesManage')

// SEARCH ENGINE CONFIGs: 
const searchEngineName = "XXX"

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
    console.log(`Welcome to ${searchEngineName} search engine!`)
    const selectedEngine = await selectSearchEngine();
    
    switch(selectedEngine) {
        case '❌EXIT': 
            onExit()
            break; 
        case '📚Query Books':
            console.log('Building search engine for:', selectedEngine) 
            nodesManager.setUpNodes((e, v) => {
                if (!e) {
                    console.log(`${searchEngineName} is ready!!`) 
                    searchRepl(); 
                } else {
                    console.log(`${searchEngineName} is not ready :( ${e}`) 
                    console.log("Shutting down...")
                    onExit(); 
                }
            })
            break; 
        default: 
            console.log('Invalid option');
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
        message: 'Please enter a key term to search for (or EXIT)=> ', 
        default: '', 
    },
    ]);
    return answers.userInput;
}

async function search(searchTerms) {
    let result = "END SEARCH"
    console.log("🔍 Searching for: " + searchTerms)
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
            console.log("✅ Search result: " + searchResult)
            searchRepl(); 
            break;
    }
    
}

// 0. BEGIN EVERYTHING!!! 
startPrompt();

// HELPER FUNCTIONS: 
function onExit() {
    console.log(`Shutting down ${searchEngineName} ... `);
    nodesManager.shutDownNodes((e, v) => {
        if (!e) {
            console.log(`${searchEngineName} shut down successful!`)
        } else {
            console.log(`${searchEngineName} shut down unsuccessful: ${e}`)
        }
        console.log("Bye! 👋")
        process.exit()
    })
}
