const firebase      = require('./firebase.js');
const logger        = require('../development/logger.js');
const resputils     = require('../utils/resputils.js');

module.exports = {

    validateFirebaseIdToken: function (req, res, next) {
        let authPrompt = 'No Firebase ID token was passed as a Bearer token in the Authorization header.' +
            'Make sure you authorize your request by providing the following HTTP header:' +
            'Authorization: Bearer <Firebase ID Token> ' +
            'or by passing a __session cookie.'

        if (!(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
            || req.cookies && req.cookies.__session)) {
            logger.error(`No Bypass token was found.`);

            return resputils.responseError(res, 403, authPrompt)
        }

        let idToken;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            logger.debug('Found "Authorization" header');
            // Read the ID Token from the Authorization header.
            idToken = req.headers.authorization.split('Bearer ')[1];
        } else {
            logger.debug('Found "__session" cookie');
            // Read the ID Token from cookie.
            idToken = req.cookies.__session;
        }

        firebase.auth().verifyIdToken(idToken).then((decodedIdToken) => {
            logger.info(`ID Token correctly decoded: ${decodedIdToken}`);
            req.user = decodedIdToken;
            return next();
        }).catch((error) => {
            logger.error('Error while verifying Firebase ID token:', error);

            return resputils.responseError(res, 403, authPrompt)
        });
    },

}
