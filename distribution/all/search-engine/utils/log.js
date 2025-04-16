function ERROR(msg, arrArgs) {
    let prefix = '-> ERROR: '
    if (arrArgs) {
        console.log(prefix + msg + arrArgs)   
    } else {
        console.log(prefix + msg)   
    }
}

function LOG(msg, arrArgs) {
    let prefix = "-> "
    if (arrArgs) {
        console.log(prefix + msg + arrArgs)   
    } else {
        console.log(prefix + msg)   
    }
}

function FLOG(msg, arrArgs) {
    let prefix = "-> "
    if (arrArgs) {
        console.error(prefix + msg + arrArgs)   
    } else {
        console.error(prefix + msg)   
    }
}

const elapsed = {
    crawlTime: 0,
    numCrawled: 0,
    indexTime: 0,
    numIndexed: 0,
    mrTime: 0,
    numMr: 0
};

module.exports = {
    ERROR: ERROR, 
    LOG: LOG, 
    FLOG: FLOG, 
    elapsed: elapsed
}