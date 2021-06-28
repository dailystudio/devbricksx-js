const admin         = require('firebase-admin');
const { DateTime }  = require("luxon");
const logger        = require('../development/logger.js');
const firebase      = require('./firebase.js');

module.exports = {

    addAllToDatabase: function (objects, collection) {
        logger.info(`add to database: [${JSON.stringify(objects)}], collection: ${collection}`);
        if (!objects || !collection) {
            return undefined;
        }

        let firestore = firebase.firestore();

        let rootRef = firestore.collection(collection);
        let dbActions = [];
        objects.forEach(function (o) {
            if (rootRef) {
                if (o.id) {
                    logger.debug('updating: ' + JSON.stringify(o));

                    let docId = o.id;
                    delete o.id;

                    o.last_modified = DateTime.utc().toMillis();

                    dbActions.push(rootRef.doc(docId).update(o));
                } else {
                    logger.debug('adding: ' + JSON.stringify(o));

                    o.created = DateTime.utc().toMillis();
                    o.last_modified = o.created;

                    dbActions.push(rootRef.add(o).then(function (ref) {
                        if (ref) {
                            o.id = ref.id;
                        }
                    }));
                }
            }
        });

        return Promise.all(dbActions).then(function () {
            return objects;
        });
    },

    getDocumentInDatabase: function (collection, document) {
        logger.debug(`get document[${document}] in collection: ${collection}`);

        let firestore = firebase.firestore();

        let dbRef = firestore.collection(collection).doc(document);

        return new Promise(function(resolve) {
            dbRef.get().then(function (snapshot) {
                if (snapshot.exists) {
                    let o = snapshot.data();

                    o.id = snapshot.id;
                    logger.debug(`found object[${snapshot.id}]: ${JSON.stringify(o)}`);

                    resolve(o);
                } else {
                    resolve(null);
                }
            })
        });
    },

    queryInDatabase: function (queries, collection, orderBys) {
        logger.debug(`query in database: [${JSON.stringify(queries)}], collection: ${collection}`);

        let firestore = firebase.firestore();

        let dbRef = firestore.collection(collection);

        let ref = dbRef;
        if (queries) {
            queries.forEach(function (q) {
                ref = ref.where(q.key, q.op, q.value);
            });
        }

        if (orderBys) {
            orderBys.forEach(function (o) {
                let order ="asc";
                if (o.order) {
                    order = o.order;
                }

                ref = ref.orderBy(o.key, order);
            });
        }

        return new Promise(function(resolve) {
            ref.get().then(function (snapshot) {
                let objects = [];
                snapshot.forEach(function (doc) {
                    let o = doc.data();

                    o.id = doc.id;
                    logger.debug(`found object[${doc.id}]: ${JSON.stringify(o)}`);
                    objects.push(o);
                });

                resolve(objects);
            })
        });
    },

    queryOneInDatabase: async function (key, value, collection) {
        let queries = this.getQueryForPrimaryKey(key, value);
        let self = this;

        return new Promise(function (resolve){
            self.queryInDatabase(queries, collection).then(function (objects) {
                logger.debug(`objects [${key}: ${value}] found in collection [${collection}] : ${JSON.stringify(objects)}`);
                if (objects && objects.length > 0) {
                    resolve(objects[0]);
                } else {
                    resolve(null)
                }
            })
        });
    },

    deleteCollection: function (queries, collection) {
        logger.debug(`delete collection ${collection} with query: ${JSON.stringify(queries)}`);

        let firestore = firebase.firestore();

        let dbRef = firestore.collection(collection);

        let ref = dbRef;
        if (queries) {
            queries.forEach(function (q) {
                ref = ref.where(q.key, q.op, q.value);
            });
        }

        return new Promise((resolve, reject) => {
            deleteQueryBatch(ref, 10, resolve, reject);
        });
    },

    detachDBProperties: function (object) {
        delete object['id'];
        delete object['last_modified'];
        delete object['created'];

        return object;
    },

    getQueryForPrimaryKey: function (key, value) {
        let queries = [];

        queries.push({
            key: key,
            op: '==',
            value: value
        });

        return queries;
    }

};

function deleteQueryBatch(dbRef, batchSize, resolve, reject) {

    dbRef.get()
        .then((snapshot) => {
            // When there are no documents left, we are done
            if (snapshot.size == 0) {
                return 0;
            }

            let firestore = firebase.firestore();

            // Delete documents in a batch
            let batch = firestore.batch();
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            return batch.commit().then(() => {
                return snapshot.size;
            });
        }).then((numDeleted) => {
            if (numDeleted === 0) {
                resolve();
                return;
            }

            // Recurse on the next process tick, to avoid
            // exploding the stack.
            process.nextTick(() => {
                deleteQueryBatch(dbRef, batchSize, resolve, reject);
            });
        }).catch(reject);
}
