const fs                = require('fs');
const logger            = require('../development/logger.js');

module.exports = {

    strFromFile: function (file) {
        if (!fs.existsSync(file)) {
            logger.error(`[ERROR]: file [${file}] does not exit.`);

            return null;
        }

        return fs.readFileSync(file, 'utf-8');
    },

    jsonFromFile: function (file) {
        let content = this.strFromFile(file)
        if (content == null) {
            logger.error(`[ERROR]: json file [${file}] is empty.`);
            return
        }

        return JSON.parse(content.toString());
    }

};
