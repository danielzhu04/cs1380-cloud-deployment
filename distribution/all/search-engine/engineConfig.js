const natural = require('natural');

const workerNodes = {
    n1: {ip: '3.147.81.201', port: 1234}, 
    n2: {ip: '3.142.42.135', port: 1234}, 
    n3: {ip: '3.138.36.53', port: 1234},
    n4: {ip: '52.14.19.197', port: 1234},
    n5: {ip: '3.14.133.3', port: 1234},
    n6: {ip: '3.148.241.125', port: 1234},
    n7: {ip: '3.12.165.224', port: 1234},
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
    console.log('Initializing search engine configs ...')
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

    console.log('Welcome to ${config.searchEngineName} search engine!')
    const engineConfig = config
    module.exports = engineConfig
}

setUpConfig()