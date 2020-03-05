let logger = require("../development/logger.js");

module.exports = {

    responseError: function (res, code, message) {
        let error = {
            code: code,
            message: message
        };

        res.status(code).send(JSON.stringify(error));
    },

};