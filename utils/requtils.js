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

    parseArray: function (strOfArray, delimiter = ',') {
        return strOfArray.split(delimiter).map(p => p.trim());
    },

    parseArrayOrResponseError: function (req, target, parameter, res, delimiter = ',') {
        if (!req[target][parameter]) {
            return null;
        }

        let parsedValue = this.parseArray(req[target][parameter], delimiter);
        if (!(parsedValue instanceof Array)) {
            resputils.responseError(res, 400,
                `failed to parse array from [${parameter}] in ${target}`);

            return null;
        }

        return parsedValue;
    },

    parseIntOrResponseError: function (req, target, parameter, res) {
        let parsedValue = parseInt(req[target][parameter], 10);
        if (isNaN(parsedValue)) {
            resputils.responseError(res, 400,
                `failed to parse integer from [${parameter}] in ${target}`);
        }

        return parsedValue;
    },

    parseFloatOrResponseError: function (req, target, parameter, res) {
        let parsedValue = parseFloat(req[target][parameter]);
        if (isNaN(parsedValue)) {
            this.responseError(res,400,
                `failed to parse float from [${parameter}] in ${target}`);
        }

        return parsedValue;
    },

    parseLongOrResponseError: function (req, target, parameter, res) {
        let parsedValue = Number(req[target][parameter]);
        if (isNaN(parsedValue)) {
            this.responseError(res,400,
                `failed to parse float from [${parameter}] in ${target}`);
        }

        return parsedValue;
    },

};
