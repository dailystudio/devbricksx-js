const { DateTime }  = require("luxon");
const logger        = require('../development/logger.js');
const firebase      = require('./firebase.js');

module.exports = {

    addAllToDatabase: async function (objects, collection) {
        logger.info(`add to database: [${JSON.stringify(objects)}], collection: ${collection}`);
        if (!objects || !collection) {
            return undefined;
        }

        let firestore = firebase.firestore();

        let rootRef = firestore.collection(collection);
        for (let o of objects) {
            if (rootRef) {
                if (o.id) {
                    logger.debug('updating: ' + JSON.stringify(o));

                    let docId = o.id;
                    delete o.id;

                    o.last_modified = DateTime.utc().toMillis();

                    await firestore.runTransaction(async (t) => {
                        t.update(rootRef.doc(docId), o);
                    });
                } else {
                    logger.debug('adding: ' + JSON.stringify(o));

                    o.created = DateTime.utc().toMillis();
                    o.last_modified = o.created;

                    await firestore.runTransaction(async (t) => {
                        const newObjectRef = rootRef.doc();
                        await t.set(newObjectRef, o);
                        o.id = newObjectRef.id;
                    });
                }
            }
        }

        return objects;
    },

    insertOrUpdateAllInDatabase: async function (objects, collection, transaction) {
        logger.info(`add to database [tran: ${transaction != null}]: [${JSON.stringify(objects)}], collection: ${collection}`);
        if (!objects || !collection) {
            return undefined;
        }

        let firestore = firebase.firestore();

        let rootRef = firestore.collection(collection);
        for (let o of objects) {
            if (rootRef) {
                if (o.id) {
                    logger.debug('updating: ' + JSON.stringify(o));

                    let docId = o.id;
                    delete o.id;

                    o.last_modified = DateTime.utc().toMillis();

                    if (transaction) {
                        transaction.update(rootRef.doc(docId), o);
                    } else {
                        await firestore.runTransaction(async (t) => {
                            t.update(rootRef.doc(docId), o);
                        });
                    }
                } else {
                    logger.debug('adding: ' + JSON.stringify(o));

                    o.created = DateTime.utc().toMillis();
                    o.last_modified = o.created;

                    if (transaction) {
                        const newObjectRef = rootRef.doc();
                        await transaction.set(newObjectRef, o);
                        o.id = newObjectRef.id;
                    } else {
                        await firestore.runTransaction(async (t) => {
                            const newObjectRef = rootRef.doc();
                            await t.set(newObjectRef, o);
                            o.id = newObjectRef.id;
                        });
                    }
                }
            }
        }

        return objects;
    },

    getDocumentInDatabase: async function (collection, docId, transaction) {
        logger.debug(`get document [${docId}] in collection [${transaction != null}]: ${collection}`);

        let firestore = firebase.firestore();

        let dbRef = firestore.collection(collection).doc(docId);

        let snapshot = null;
        if (transaction) {
            snapshot = await transaction.get(dbRef);
        } else {
            snapshot = await dbRef.get();
        }

        if (!snapshot.exists) {
            return null;
        }

        let object = snapshot.data();

        logger.debug(`found object[${snapshot.id}]: ${JSON.stringify(object)}`);
        object.id = snapshot.id;

        return object;
    },


    paginateQueryInDatabase: function (queries, collection, orderBys, limit, startAfterKeys) {
        logger.debug(`paginate in ${collection}: queries = [${JSON.stringify(queries)}]`);
        logger.debug(`paginate in ${collection}: orderBys = [${JSON.stringify(orderBys)}]`);
        logger.debug(`paginate in ${collection}: limit = [${JSON.stringify(limit)}]`);
        logger.debug(`paginate in ${collection}: startAfterKeys = [${JSON.stringify(startAfterKeys)}]`);

        let firestore = firebase.firestore();

        let ref = firestore.collection(collection);

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

        if (limit) {
            ref = ref.limit(limit + 1)
        }

        if (startAfterKeys) {
            ref = ref.startAfter(startAfterKeys)
        }

        return new Promise(function(resolve) {
            ref.get().then(function (snapshot) {
                let objects = [];
                snapshot.forEach(function (doc) {
                    let o = doc.data();

                    o.id = doc.id;
                    objects.push(o);
                });

                logger.debug(`found ${objects.length} objects.`);
                if (limit) {
                    let endOfPagination = (objects.length < limit + 1);
                    resolve({
                        data: objects.slice(0, limit),
                        endOfPagination: endOfPagination,
                    })
                } else {
                    resolve({
                        data: objects,
                        endOfPagination: true,
                    })
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

    deleteDocument: function (docId, collection) {
        logger.debug(`delete document [${docId}] from collection [${collection}]`);

        let firestore = firebase.firestore();

        return new Promise((resolve, reject) => {
            firestore.collection(collection).doc(docId).delete().then(function () {
                logger.debug(`document [${docId}] is deleted successfully.`)
                resolve();
            }).catch(function (e) {
                logger.error(`failed to delete document [${docId}]: ${e}`);
                reject(e)
            });
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
