// Command for crawler performance: npm test test-search/search.local.test.js > performance/search-engine/m6.crawlerPerformance.txt
// Command for indexer performance: npm test test-search/search.local.test.js > performance/search-engine/m6.indexerPerformance.txt
// No command for mr performance
// Note: need to commend out console.logs for crawler when running indexer command, and vice versa

// Command for running the file overall: node performance/search-engine/m6.performanceCalculations.js

const path = require('path');
const fs = require('fs');
// const {batchSize} = require('../../distribution/all/search-engine/utils/nodesManage.js');

const crawlerPath = path.resolve(__dirname, `m6.crawlerPerformance.txt`);
const indexerPath = path.resolve(__dirname, `m6.indexerPerformance.txt`);
// const querierPath = path.resolve(__dirname, `m6.querierPerformance.txt`);
const mrPath = path.resolve(__dirname, `m6.mrPerformance.txt`);

// Crawler calculations
const crawlPerfContents = fs.readFileSync(crawlerPath, 'utf8');
const crawlLines = crawlPerfContents.split('\n');
const crawlLatencies = [];
const crawlThroughputs = [];
let sumCrawlLat = 0;
let sumCrawlThr = 0;

crawlLines.forEach((line, _) => {
    const lineContents = line.split(": ");
    // console.log("linecontents are ", lineContents);
    if (lineContents[0].includes("latency")) {
        crawlLatencies.push(Number(lineContents[1]));
    } else if (lineContents[0].includes("throughput")) {
        crawlThroughputs.push(Number(lineContents[1]));
    }
});

crawlLatencies.forEach((currLat) => {
    sumCrawlLat += currLat;
});
crawlThroughputs.forEach((currThr) => {
    sumCrawlThr += currThr;
});

let avCrawlLat = 0;
let avCrawlThr = 0;
if (crawlLatencies.length > 0) {
    avCrawlLat = sumCrawlLat / crawlLatencies.length;
}
if (crawlThroughputs.length > 0) {
    avCrawlThr = sumCrawlThr / crawlThroughputs.length;
}
console.log("The per-batch average crawler latency is ", avCrawlLat);
console.log("The per-batch average crawler throughput is ", avCrawlThr);



// Indexer calculations
const idxPerfContents = fs.readFileSync(indexerPath, 'utf8');
const idxLines = idxPerfContents.split('\n');
const idxLatencies = [];
const idxThroughputs = [];
let sumIdxLat = 0;
let sumIdxThr = 0;

idxLines.forEach((line, _) => {
    const lineContents = line.split(": ");
    // console.log("linecontents are ", lineContents);
    if (lineContents[0].includes("latency")) {
        idxLatencies.push(Number(lineContents[1]));
    } else if (lineContents[0].includes("throughput")) {
        idxThroughputs.push(Number(lineContents[1]));
    }
});

// console.log("idxLatencies is ", idxLatencies);
// console.log("idxThroughputs are ", idxThroughputs);

idxLatencies.forEach((currLat) => {
    sumIdxLat += currLat;
});
idxThroughputs.forEach((currThr) => {
    sumIdxThr += currThr;
});

let avIdxLat = 0;
let avIdxThr = 0;
if (idxLatencies.length > 0) {
    avIdxLat = sumIdxLat / idxLatencies.length;
}
if (idxThroughputs.length > 0) {
    avIdxThr = sumIdxThr / idxThroughputs.length;
}
console.log("The per-batch average indexer latency is ", avIdxLat);
console.log("The per-batch average indexer throughput is ", avIdxThr);



// Querier calculations
// Note to self: probably don't need, will need to calculate manually
// const quPerfContents = fs.readFileSync(querierPath, 'utf8');
// const quLines = quPerfContents.split('\n');
// const quLatencies = [];
// const quThroughputs = [];
// let sumQuLat = 0;
// let sumQuThr = 0;

// quLines.forEach((line, _) => {
//     const lineContents = line.split(": ");
//     console.log("linecontents are ", lineContents);
//     if (lineContents[0].includes("latency")) {
//         quLatencies.push(Number(lineContents[1]));
//     } else if (lineContents[0].includes("throughput")) {
//         quThroughputs.push(Number(lineContents[1]));
//     }
// });

// console.log("quLatencies is ", quLatencies);
// console.log("quThroughputs are ", quThroughputs);

// quLatencies.forEach((currLat) => {
//     sumQuLat += currLat;
// });
// quThroughputs.forEach((currThr) => {
//     sumQuThr += currThr;
// });

// const avQuLat = sumQuLat / quLatencies.length;
// const avQuThr = sumQuThr / quThroughputs.length;
// console.log("The average querier latency is ", avQuLat);
// console.log("The average querier throughput is ", avQuThr);



// MapReduce calculations
const mrPerfContents = fs.readFileSync(mrPath, 'utf8');
const mrLines = mrPerfContents.split('\n');
const mrLatencies = [];
let sumMrLat = 0;
let sumMrThr = 0;

mrLines.forEach((line, _) => {
    const lineContents = line.split(": ");
    // console.log("linecontents are ", lineContents);
    if (lineContents[0].includes("latency")) {
        mrLatencies.push(Number(lineContents[1]));
        sumMrThr += Number(lineContents[1]);
    } 
});

// console.log("mrLatencies is ", mrLatencies);
// console.log("mrThroughputs are ", mrThroughputs);

mrLatencies.forEach((currLat) => {
    sumMrLat += currLat;
});

let avMrLat = 0;
let avMrThr = 0;
if (mrLatencies.length > 0) {
    avMrLat = sumMrLat / mrLatencies.length;
}
if (sumMrThr > 0) {
    avMrThr = mrLatencies.length / sumMrThr;
}
console.log("The average MapReduce latency is ", avMrLat);
console.log("The average MapReduce throughput is ", avMrThr);

