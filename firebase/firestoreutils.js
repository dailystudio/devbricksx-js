const { DateTime }  = require("luxon");
const logger        = require('../development/logger.js');
const firebase      = require('./firebase.js');

module.exports = {

    runInTransaction: async function (funcInTransaction, transaction = null) {
        if (transaction) {
            return await funcInTransaction(transaction);
        } else {
            return await firebase.firestore().runTransaction(async (t) => {
                return await funcInTransaction(t);
            });
        }
    },

    addAllToDatabase: async function (objects, collection, transaction) {
        logger.info(`[TRANS: ${transaction != null}] add to database : [${JSON.stringify(objects)}], collection: ${collection}`);
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
                        await transaction.update(rootRef.doc(docId), o);
                    } else {
                        rootRef.doc(docId).update(o);
                    }
                    /*
                                        await firestore.runTransaction(async (t) => {
                                            t.update(rootRef.doc(docId), o);
                                        });
                    */
                } else {
                    logger.debug('adding: ' + JSON.stringify(o));

                    o.created = DateTime.utc().toMillis();
                    o.last_modified = o.created;

                    const newObjectRef = rootRef.doc();
                    if (transaction) {
                        await transaction.set(newObjectRef, o);
                    } else {
                        newObjectRef.set(o);
                    }
                    o.id = newObjectRef.id;

                    /*
                                        await firestore.runTransaction(async (t) => {
                                            const newObjectRef = rootRef.doc();
                                            await t.set(newObjectRef, o);
                                            o.id = newObjectRef.id;
                                        });
                    */
                }
            }
        }

        return objects;
    },

    insertOrUpdateAllInDatabase: async function (objects, collection, transaction) {
        logger.info(`[TRANS: ${transaction != null}] add to database: [${JSON.stringify(objects)}], collection: ${collection}`);
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
                        await transaction.update(rootRef.doc(docId), o);
                    } else {
                        rootRef.doc(docId).update(o);
                        /*
                                                await firestore.runTransaction(async (t) => {
                                                    t.update(rootRef.doc(docId), o);
                                                });
                        */
                    }
                } else {
                    logger.debug('adding: ' + JSON.stringify(o));

                    o.created = DateTime.utc().toMillis();
                    o.last_modified = o.created;

                    const newObjectRef = rootRef.doc();
                    if (transaction) {
                        await transaction.set(newObjectRef, o);
                    } else {
                        newObjectRef.set(o);
                        /*
                                                await firestore.runTransaction(async (t) => {
                                                    const newObjectRef = rootRef.doc();
                                                    await t.set(newObjectRef, o);
                                                    o.id = newObjectRef.id;
                                                });
                        */
                    }
                    o.id = newObjectRef.id;
                }
            }
        }

        return objects;
    },

    getDocumentInDatabase: async function (collection, docId, transaction) {
        logger.debug(`[TRANS: ${transaction != null}] get document [${docId}] in collection: ${collection}`);

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

    paginateQueryInDatabase: async function (queries, collection, orderBys, limit, startAfterKeys, transaction) {
        logger.debug(`[TRANS: ${transaction != null}] paginate in ${collection}: queries = [${JSON.stringify(queries)}]`);
        logger.debug(`[TRANS: ${transaction != null}] paginate in ${collection}: orderBys = [${JSON.stringify(orderBys)}]`);
        logger.debug(`[TRANS: ${transaction != null}] paginate in ${collection}: limit = [${JSON.stringify(limit)}]`);
        logger.debug(`[TRANS: ${transaction != null}] paginate in ${collection}: startAfterKeys = [${JSON.stringify(startAfterKeys)}]`);

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

        return new Promise(async function(resolve) {
            let snapshot = null;
            if (transaction) {
                snapshot = await transaction.get(ref);
            } else {
                snapshot = await ref.get();
            }

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
        });
    },

    queryInDatabase: async function (queries, collection, orderBys, transaction) {
        logger.debug(`[TRANS: ${transaction != null}] query in database: [${JSON.stringify(queries)}], collection: ${collection}`);

        let ret = await this.paginateQueryInDatabase(queries, collection, orderBys,
            null, null, transaction);

        return ret.data;
    },

    queryOneInDatabaseByKey: async function (key, value, collection, transaction) {
        let queries = this.getQueryForPrimaryKey(key, value);

        return await this.queryOneInDatabase(queries, collection, transaction);
    },

    queryOneInDatabase: async function (queries, collection, transaction) {
        let self = this;

        return new Promise(function (resolve){
            self.queryInDatabase(queries, collection, null, transaction).then(function (objects) {
                logger.debug(`objects [${JSON.stringify(queries)}] found in collection [${collection}] : ${JSON.stringify(objects)}`);
                if (objects && objects.length > 0) {
                    resolve(objects[0]);
                } else {
                    resolve(null)
                }
            })
        });
    },

    deleteDocument: async function (docId, collection, transaction) {
        logger.debug(`[TRANS: ${transaction != null}] delete document [${docId}] from collection: [${collection}]`);

        let firestore = firebase.firestore();

        let ref = firestore.collection(collection).doc(docId);

        try {
            if (transaction) {
                await transaction.delete(ref);
            } else {
                await ref.delete();
            }

            return true;
        } catch (e) {
            logger.error(`failed to delete document [${docId}]: ${e}`);
            return false;
        }
    },

    deleteCollection: async function (queries, collection, transaction) {
        logger.debug(`[TRANS: ${transaction != null}] delete collection ${collection} with query: ${JSON.stringify(queries)}`);

        let firestore = firebase.firestore();

        let ref = firestore.collection(collection);
        if (queries) {
            queries.forEach(function (q) {
                ref = ref.where(q.key, q.op, q.value);
            });
        }

        await deleteQueryBatch(ref, 10, transaction);
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

async function deleteQueryBatch(queryRef, batchSize, transaction = null) {
    const snapshot = await queryRef.limit(batchSize).get();

    // When there are no documents left, we are done
    if (snapshot.size === 0) {
        return;
    }

    let firestore = firebase.firestore();

    // Delete documents in a batch
    if (transaction) {
        // If a transaction is provided, use it to delete documents
        snapshot.docs.forEach(doc => transaction.delete(doc.ref));
    } else {
        // If no transaction is provided, perform a standalone batch delete
        const batch = firestore().batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }

    // Recurse on the next process tick, to avoid exploding the stack.
    process.nextTick(() => deleteQueryBatch(queryRef, batchSize, transaction));
}
