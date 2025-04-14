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

module.exports = {
    ERROR: ERROR, 
    LOG: LOG, 
    FLOG: FLOG, 
}