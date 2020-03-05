let logger = require("../development/logger.js");

module.exports = {

    responseError: function (code, message, res) {
        let error = {
            code: code,
            message: message
        };

        res.status(code).send(JSON.stringify(error));
    },

};