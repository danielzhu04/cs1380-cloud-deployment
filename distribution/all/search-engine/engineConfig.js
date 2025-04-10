const natural = require('natural');

const workerNodes = {
    n1: {ip: '127.0.0.1', port: 9001}, 
    n2: {ip: '127.0.0.1', port: 9002}, 
    n3: {ip: '127.0.0.1', port: 9003}
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
        searchEngineName: "XXX", 
        localServer: null, 
        searchGroupConfig: searchGroupConfig, 
        workerNodes: workerNodes, 
        workerNodesCount: Object.keys(workerNodes).length, 
        dataPath: null, 
        queryWithMetadata: false, 
        stemmer: stemWords 
    }

    console.log(`Welcome to ${config.searchEngineName} search engine!`)
    const engineConfig = config
    module.exports = engineConfig
}

setUpConfig()