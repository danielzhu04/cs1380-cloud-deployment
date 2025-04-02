// Add setup and query services

const inquirer = require('inquirer');

const searchEngineName = "XXX"

async function selectSearchEngine() {
    const answers = await inquirer.default.prompt([
    {
        type: 'list',
        name: 'option',
        message: `Please select a search engine option => `, 
        choices: ['Query Books', 'EXIT'],
    },
    ]);
    return answers.option;
}

async function startPrompt() {
    console.log(`Welcome to ${searchEngineName} search engine!`)
    const selectedEngine = await selectSearchEngine();
    
    switch(selectedEngine) {
        case 'EXIT': 
            onExit()
            break; 
        case 'Query Books':
            console.log('Building search engine for:', selectedEngine) 
            searchRepl(); 
            break; 
        default: 
            console.log('Invalid option');
            break;
    }
}

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
    console.log("Begin search for: " + searchTerms)
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
            console.log("Here are the results: " + searchResult)
            searchRepl(); 
            break;
    }
    
}

startPrompt();

function onExit() {
    console.log(`Shutting down ${searchEngineName} ... `);
    // TODO: Call teardown for search engine server node. 
    console.log("Bye!")
    process.exit();
}
