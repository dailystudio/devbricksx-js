const fs        = require('fs');
const path      = require('path');
const request   = require('request');
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

    downloadFile: async function (remoteFile) {
        const config = {
            action: 'read',
            expires: '03-17-2025'
        };

        let bucket = firebase.storage();

        let md5Hash = null;
        let fileSize = 0;
        let metadata = await bucket.file(remoteFile).getMetadata();
        if (metadata) {
            md5Hash = Buffer.from(metadata[0].md5Hash).toString('base64');
            fileSize = parseInt(metadata[0].size || '');
        }

        let cacheFilename = getCacheFilenameFromRemotePath(remoteFile, md5Hash, fileSize);
        let cacheFilePath = path.join(CACHE_DIR, cacheFilename);
        logger.debug('local file path: ' + cacheFilePath);

        if (fs.existsSync(cacheFilePath)) {
            logger.info(`cache file found for [${remoteFile}]: ${cacheFilePath}`);

            let cacheFileSize = fs.statSync(cacheFilePath).size;
            logger.debug(`cache file size: ${fileSize}`);
            if (cacheFileSize === fileSize) {
                logger.info(`cache matched: file = ${cacheFilePath}, size = ${cacheFileSize}`);

                return cacheFilePath;
            }
        }

        return new Promise(function (resolve, reject) {
            bucket.file(remoteFile).getSignedUrl(config, function (err, url) {
                logger.debug('download url: ' + url);
                if (err) {
                    logger.error('download failed: ' + err);
                    reject(err);

                    return;
                }

                let file = fs.createWriteStream(cacheFilePath);

                return request.get(url)
                    .pipe(file)
                    .on('finish', function () {
                        resolve(cacheFilePath);
                    });
            });
        });
    }

};

function getCacheFilenameFromRemotePath(remotePath, md5Hash, fileSize) {
    return encodeURIComponent(remotePath)
        + '.' + md5Hash + '.' + fileSize;
}
