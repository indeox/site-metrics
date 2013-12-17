var CONFIG   = require('../config.js'),
    exec     = require('child_process').exec,
    moment   = require('moment'),
    request  = require('request'),
    _        = require('lodash');
    Q        = require('q');


/* Generates a HAR file using netsniff.js */
function generateHAR(opts) {
    var deferred = Q.defer(),
        now = moment(),
        viewport = opts.viewport.split('x'),
        width    = viewport[0],
        height   = viewport[1],
        screenName = (opts.disableJS) ? 'NoJS' : opts.viewport,
        urlSlug    = opts.url.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    var screenshotFilename = now.format("YYYYMMDD_HHmmss") + '_' + urlSlug + '_' + screenName + '.jpg';

    if (viewport == 'No JS') {
        width  = 1280;
        height = 1024;
        disableJS = true;
    }

    var cmd = [
            __dirname + '/../node_modules/phantomjs/bin/phantomjs',
            __dirname + '/netsniff.js',
            '"' + opts.url + '"',
            width+'x'+height,
            '--screenshot="' + __dirname + '/../www/renders/' + screenshotFilename + '"'
        ];

    if (opts.disableJS) {
        cmd.push('--disable-js');
    }

    exec(cmd.join(' '), { maxBuffer: 10000*1024 }, function(error, stdout, stderr) {
        var result = JSON.parse(stdout);
        result.log.screenshot = screenshotFilename;
        deferred.resolve(result);
    });

    return deferred.promise;
}

/* Cleans up the data */
function summariseHAR(har) {
    var deferred = Q.defer();

    addContentLengthHeaders(har).then(function(har) {

        var outputSummary = {
            size: getTotalSize(har),
            count: har.log.entries.length,
            summary: getResourceSummary(har.log.entries),
            screenshot: har.log.screenshot
        };

        // Do the same for external resources (ex: Frameworks, etc)
        _.each(CONFIG.assetGroups, function(match, groupName) {
            var groupAssets = _.filter(har.log.entries, function(entry) {
                return entry.request.url.match(match);
            });

            outputSummary[groupName + 'Summary'] = getResourceSummary(groupAssets);
        });


        deferred.resolve(outputSummary);

    });

    return deferred.promise;
}

/* Reads the headers and returns an object with all resources
   grouped by content type */
function getResourceSummary(entries) {
    var contentTypes = {
        _size: 0,
        _count: 0
    };
    entries.forEach(function(entry) {
        var assetMeta = getAssetMeta(entry.response.headers);
        //console.log(entry.request.url, entry);
        contentTypes[assetMeta.type] = contentTypes[assetMeta.type] || { size: 0, count: 0, entries: [] };
        contentTypes[assetMeta.type].size += assetMeta.contentLength;
        contentTypes[assetMeta.type].count += 1;
        contentTypes[assetMeta.type].entries.push([entry.request.url, assetMeta.contentLength]);

        contentTypes._size  += assetMeta.contentLength;
        contentTypes._count += 1;
    });

    return contentTypes;
}



/* This adds missing Content-Length headers due to PhantomJS not reporting
   them on occasions where the moon and the stars don't align */
function addContentLengthHeaders(har) {
    var deferred = Q.defer(),
        requestsDone  = 0,
        totalRequests = 0;

    _.transform(har.log.entries, function(result, values, key) {
            //console.log(values.response.headers);
            var resourceUrl     = values.request.url,
                responseHeaders = values.response.headers,

                isGzip = _.find(responseHeaders, function(entry) {
                    return entry.name == 'Content-Encoding' && entry.value == 'gzip';
                }),

                hasContentLength = _.find(responseHeaders, function(entry) {
                    return entry.name == 'Content-Length';
                });

        // Add Content Length headers when necessary
        if (!isGzip && !hasContentLength) {
            //console.log('XXX');
            //console.log(har.log.entries[key]);
            har.log.entries[key].response.headers.push({
                name:  'Content-Length',
                value: har.log.entries[key].response.bodySize
            });
        }

        if (isGzip && !hasContentLength) {
            totalRequests += 1;

            request({
                url: resourceUrl,
                headers: {
                    'Accept-Encoding': 'gzip'
                }

            }, function(err, response, body) {
                //console.log(har.log.entries[key].response.headers);
                //console.log(resourceUrl, response.headers['content-length'] || body.length);
                har.log.entries[key].response.headers.push({
                    name:  'Content-Length',
                    value: response.headers['content-length'] || body.length
                });
                har.log.entries[key].response.content.size = response.headers['content-length'];

                requestsDone += 1;

                if (requestsDone === totalRequests) {
                    deferred.resolve(har);
                }
            });
        }
    });

    return deferred.promise;
}


// Taken from https://github.com/macbre/phantomas/blob/master/core/modules/requestsMonitor/requestsMonitor.js
function getAssetMeta(headers) {
    var entry = {};
    headers.forEach(function(header) {
        //entry.headers[header.name] = header.value;
        switch (header.name.toLowerCase()) {
            // TODO: why it's not gzipped?
            // because: http://code.google.com/p/phantomjs/issues/detail?id=156
            // should equal bodySize
            case 'content-length':
                entry.contentLength = parseInt(header.value, 10);
                break;

            // detect content type
            case 'content-type':
                // parse header value
                var value = header.value.split(';').shift().toLowerCase();

                switch(value) {
                    case 'text/html':
                        entry.type = 'html';
                        entry.isHTML = true;
                        break;

                    case 'text/css':
                        entry.type = 'css';
                        entry.isCSS = true;
                        break;

                    case 'application/x-javascript':
                    case 'application/javascript':
                    case 'text/javascript':
                        entry.type = 'js';
                        entry.isJS = true;
                        break;

                    case 'application/json':
                    case 'application/octet-stream':
                        entry.type = 'json';
                        entry.isJSON = true;
                        break;

                    case 'image/png':
                    case 'image/jpeg':
                    case 'image/gif':
                    case 'image/svg+xml':
                        entry.type = 'image';
                        entry.isImage = true;
                        break;

                    // @see http://stackoverflow.com/questions/2871655/proper-mime-type-for-fonts
                    case 'application/font-wof':
                    case 'application/font-woff':
                    case 'application/vnd.ms-fontobject':
                    case 'application/x-font-opentype':
                    case 'application/x-font-truetype':
                    case 'application/x-font-ttf':
                    case 'application/x-font-woff':
                        entry.type = 'webfont';
                        entry.isWebFont = true;
                        break;

                }
                break;

            // detect content encoding
            case 'content-encoding':
                if (header.value === 'gzip') {
                    entry.gzip = true;
                }
                break;
        }
    });

    return entry;
}


function getTotalSize(har) {
    return _.reduce(har.log.entries, function(sum, entry) {
      var entrySize = _.findWhere(entry.response.headers, { name: 'Content-Length' }).value;
      return sum + parseInt(entrySize, 10);
    }, 0);
}



/* Process a page */
function processPage(opts) {
    return generateHAR(opts).then(summariseHAR)
                     .then(function(summary) {
                        summary.url      = opts.url;
                        summary.viewport = opts.viewport;
                        return summary;
                     });
}



module.exports = {
    processPage: processPage,
    generateHAR: generateHAR
};