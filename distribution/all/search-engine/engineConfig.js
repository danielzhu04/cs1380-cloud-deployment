const natural = require('natural');

const workerNodes = {
    n1: {ip: '3.145.165.94', port: 1234}
}

const searchGroupConfig = {gid: 'search'}

const stemWords = (line) => {
    const words = line.trim().split(' ')
    stemmed = []
    words.forEach(word => {
        stemmed.push(natural.PorterStemmer.stem(word))
    });
    return stemmed.join(' ')
}

function setUpConfig() {
    console.log(`Initializing search engine configs ...`)
    const config = {
        searchEngineName: "GutenSearch", 
        localServer: null, 
        searchGroupConfig: searchGroupConfig, 
        workerNodes: workerNodes, 
        workerNodesCount: Object.keys(workerNodes).length, 
        dataPath: null, 
        queryWithMetadata: false, 
        stemmer: stemWords, 
        batchSize: 4, 
        kURLs: 10
    }

    console.log(`Welcome to ${config.searchEngineName} search engine!`)
    const engineConfig = config
    module.exports = engineConfig
}

setUpConfig()