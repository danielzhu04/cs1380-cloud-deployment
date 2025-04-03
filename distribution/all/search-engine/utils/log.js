function ERROR(msg) {
    let prefix = '-> ERROR: '
    console.log(prefix + msg)
}

function LOG(msg) {
    let prefix = "-> "
    console.log(prefix + msg)
}

module.exports = {
    ERROR: ERROR, 
    LOG: LOG
}