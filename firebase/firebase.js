let logger = require("../development/logger.js");

module.exports = {
    _admin: undefined,

    bindFirebaseAdmin: function (admin) {
        this._admin = admin;
    },

    _firebaseAdmin: function () {
        if (!this._admin) {
            logger.error(`please call bindFirebaseAdmin() first.`);
        }

        return this._admin;
    },

    firestore: function () {
        return this._firebaseAdmin().firestore();
    },

    storage: function () {
        return this._firebaseAdmin().storage().bucket();
    },

    auth: function () {
        return this._firebaseAdmin().auth();
    }

};
