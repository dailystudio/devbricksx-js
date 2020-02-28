const logger        = require('../development/logger.js');
const AsyncLock     = require('async-lock');

const lock = new AsyncLock();

function lockApi(keys, req, res, asyncApiCall) {
    logger.info(`locking api[${asyncApiCall.name}]: keys = ${JSON.stringify(keys)}`);
    lock.acquire(keys, function(done) {
        asyncApiCall(req, res).then(function (ret) {
            done(null, ret);
        });
    }, function(err, ret) {
        logger.info(`releasing api[${asyncApiCall.name}]: keys = ${JSON.stringify(keys)}`);
        return ret;
    }, {});
}

module.exports = lockApi;