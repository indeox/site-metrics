if (!Date.prototype.toISOString) {
    Date.prototype.toISOString = function () {
        function pad(n) { return n < 10 ? '0' + n : n; }
        function ms(n) { return n < 10 ? '00'+ n : n < 100 ? '0' + n : n }
        return this.getFullYear() + '-' +
            pad(this.getMonth() + 1) + '-' +
            pad(this.getDate()) + 'T' +
            pad(this.getHours()) + ':' +
            pad(this.getMinutes()) + ':' +
            pad(this.getSeconds()) + '.' +
            ms(this.getMilliseconds()) + 'Z';
    }
}

function createHAR(address, title, startTime, resources) {
    var entries = [];

    resources.forEach(function (resource) {
        var request = resource.request,
            startReply = resource.startReply,
            endReply = resource.endReply;

        if (!request || !startReply || !endReply) {
            return;
        }

        // Exclude Data URI from HAR file because
        // they aren't included in specification
        if (request.url.match(/(^data:image\/.*)/i)) {
            return;
        }

        entries.push({
            startedDateTime: request.time.toISOString(),
            time: endReply.time - request.time,
            request: {
                method: request.method,
                url: request.url,
                httpVersion: "HTTP/1.1",
                cookies: [],
                headers: request.headers,
                queryString: [],
                headersSize: -1,
                bodySize: -1
            },
            response: {
                status: endReply.status,
                statusText: endReply.statusText,
                httpVersion: "HTTP/1.1",
                cookies: [],
                headers: endReply.headers,
                redirectURL: "",
                headersSize: -1,
                bodySize: startReply.bodySize,
                content: {
                    size: startReply.bodySize,
                    mimeType: endReply.contentType
                }
            },
            cache: {},
            timings: {
                blocked: 0,
                dns: -1,
                connect: -1,
                send: 0,
                wait: startReply.time - request.time,
                receive: endReply.time - startReply.time,
                ssl: -1
            },
            pageref: address
        });
    });

    return {
        log: {
            version: '1.2',
            creator: {
                name: "PhantomJS",
                version: phantom.version.major + '.' + phantom.version.minor +
                    '.' + phantom.version.patch
            },
            pages: [{
                startedDateTime: startTime.toISOString(),
                id: address,
                title: title,
                pageTimings: {
                    onLoad: page.endTime - page.startTime
                }
            }],
            entries: entries
        }
    };
}

var page = require('webpage').create(),
    system = require('system');

if (system.args.length === 1) {
    console.log('Usage: netsniff.js <some URL>');
    phantom.exit(1);
} else {

    var viewportSize = (system.args[2] || '1280x1024').split('x'),
        width = viewportSize[0],
        height = viewportSize[1];

    page.address = system.args[1];
    page.viewportSize = { width: width, height: height };
    page.resources = [];
    var currentRequests = 0,
        lastRequestTimeout,
        finalTimeout;

    if (system.args.indexOf('--disable-js') != -1) {
        page.settings.javascriptEnabled = false;
    }

    system.args.map(function(arg) {
        if (arg.indexOf('--screenshot') != -1) {
            screenshotName = arg.split('=')[1];
        }
    });

    page.onLoadStarted = function () {
        page.startTime = new Date();
    };

    page.onResourceRequested = function (req) {
        currentRequests += 1;
        page.resources[req.id] = {
            request: req,
            startReply: null,
            endReply: null
        };
    };

    page.onResourceReceived = function (res) {
        if (res.stage === 'start') {
            page.resources[res.id].startReply = res;
        }
        if (res.stage === 'end') {
            page.resources[res.id].endReply = res;

            currentRequests -= 1;
            debouncedReport();
        }
    };

    page.onError = function(err) {
        // Page errors end up here
    }

    page.open(page.address, function (status) {
        var har;
        if (status !== 'success') {
            console.log('FAIL to load the address');
            phantom.exit(1);
        } else {
            page.endTime = new Date();
            page.loadTime = page.endTime.valueOf() - page.startTime.valueOf();
            page.title = page.evaluate(function () {
                return document.title;
            });
            //har = createHAR(page.address, page.title, page.startTime, page.resources);
            //console.log(JSON.stringify(har, undefined, 4));

            //debouncedReport();
            //phantom.exit();
        }
    });

    function debouncedReport() {
        clearTimeout(lastRequestTimeout);
        clearTimeout(finalTimeout);

        if (currentRequests < 1) {
            clearTimeout(finalTimeout);
            lastRequestTimeout = setTimeout(function() {
                //console.log(page.address, page.title, page.startTime, page.resources);
                har = createHAR(page.address, page.title, page.startTime, page.resources);

                /*page.clipRect = {
                    top: 0,
                    left: 0,
                    width: width,
                    height: height
                };*/

                if (screenshotName) {
                    page.render(screenshotName);
                }
                //
                //har.render = page.renderBase64('JPEG');

                console.log(JSON.stringify(har, undefined, 4));
                phantom.exit();
            }, 1000);
        }

        finalTimeout = setTimeout(function() {
            if (screenshotName) {
                page.render(screenshotName);
            }

            har = createHAR(page.address, page.title, page.startTime, page.resources);
            console.log(JSON.stringify(har, undefined, 4));
            phantom.exit();
        }, 5000);
    }
}
