const fs        = require('fs');
const path      = require('path');
const admin     = require('firebase-admin');
const request   = require('request');
const URL       = require("url");
const logger    = require('../development/logger.js');

const CACHE_DIR = './caches';

if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR)
}

module.exports = {

    uploadFile: function (file, directory) {
        return new Promise(function (resolve, reject) {
            if (!file) {
                reject('image file is empty');
            }

            let newFileName = `${directory}/${file.filename}`;
            logger.debug('filename on firebase storage: ' + newFileName);

            let bucket = firebase.storage();

            bucket.upload(file.path, {
                destination: newFileName,
                public: true,
                metadata: {
                    contentType: file.mimetype
                }
            }, function (err, file) {
                if (err) {
                    reject(err)
                }

                let url = `http://storage.googleapis.com/${newFileName}`;

                resolve(url)
            });

        })
    },

    downloadFile: function (remoteFile) {
        return new Promise(function (resolve, reject) {
            const config = {
                action: 'read',
                expires: '03-17-2025'
            };

            let bucket = firebase.storage();

            bucket.file(remoteFile).getSignedUrl(config, function (err, url) {
                console.log('download url: ' + url);
                if (err) {
                    logger.error('download failed: ' + err);
                    reject(err);

                    return;
                }

                let cacheFilename = getCacheFilenameFromDownloadUrl(url);
                let cacheFilePath = path.join(CACHE_DIR, cacheFilename);
                logger.debug('local file path: ' + cacheFilePath);

                if (fs.existsSync(cacheFilePath)) {
                    logger.info(`cache file found for [${remoteFile}]: ${cacheFilePath}`);

                    resolve(cacheFilePath);

                    return;
                }

                let file = fs.createWriteStream(cacheFilePath);

                return request.get(url)
                    .on('end', function () {
                        resolve(cacheFilePath)
                    })
                    .pipe(file);
            });
        });
    }

};

function getCacheFilenameFromDownloadUrl(url) {
    let path = URL.parse(url).pathname;
    let segments = path.split('/');

    return segments[segments.length - 1];
}