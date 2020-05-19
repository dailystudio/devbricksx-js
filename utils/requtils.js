let logger      = require("../development/logger.js");
let resputils   = require("./resputils.js");

module.exports = {

    dumpRequestInfo: function (req, parameters) {
        let info = {};
        if (!(parameters instanceof Array)) {
            logger.error(`parameters should be a Array object`);

            return info;
        }

        for (let [target, param] of parameters) {
            info[`${target}[${param}]`] = (req[target][param] ? req[target][param] : null);
        }

        return info;
    },

    checkParametersOrResponseError: function (req, res, parameters) {
        let allFound = true;

        if (!(parameters instanceof Array)) {
            logger.error(`parameters should be a Array object`);

            return false;
        }

        let missedTarget;
        let missedParam;
        for (let [target, param] of parameters) {
            logger.debug(`checking parameter [${param}] in req.${target}`);
            if (req[target][param] === undefined) {
                missedTarget = target;
                missedParam = param;
                allFound = false;
                break;
            }
        }

        if (!allFound) {
            resputils.responseError(res,
                400,
                `missing required parameters in ${missedTarget}: ${missedParam}`);
        }

        return allFound;
    },

};