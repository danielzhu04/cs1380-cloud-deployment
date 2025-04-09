function ERROR(msg, arrArgs) {
    // let prefix = '-> ERROR: '
    // if (arrArgs) {
    //     console.log(prefix + msg + arrArgs)   
    // } else {
    //     console.log(prefix + msg)   
    // }
}


function LOG(msg, arrArgs) {
    // let prefix = "-> "
    // if (arrArgs) {
    //     console.log(prefix + msg + arrArgs)   
    // } else {
    //     console.log(prefix + msg)   
    // }
}

module.exports = {
    ERROR: ERROR, 
    LOG: LOG
}