var CONFIG   = require('../config.js'),
    child    = require('child_process'),
    exec     = require('child_process').exec,
    spawn    = require('child_process').spawn,
    fs       = require('fs'),
    Q        = require('q'),
    colors   = require('colors'),
    mustache = require('mustache'),
    moment   = require('moment'),
    _        = require('lodash');

var finalResults = {},
	now          = moment();


function runMetrics(opts) {
    var deferred = Q.defer(),
        viewport = opts.viewport.split('x'),
        width    = viewport[0],
        height   = viewport[1],
        screenName = (opts.disableJS) ? 'NoJS' : opts.viewport,
        urlSlug    = opts.url.replace(/[^a-z0-9]/gi, '_').toLowerCase(),
        screenshotFilename = now.format("YYYYMMDD_HHmmss") + '_' + urlSlug + '_' + screenName + '.jpg',
        cmdArgs = [
            '--format=json',
            //'--analyze-css',
            //'--film-strip',
            '--viewport='+width+'x'+height,
            '--url="' + opts.url + '"',
            '--screenshot="' + __dirname + '/../www/renders/' + screenshotFilename + '"'
        ];

    if (opts.disableJS) {
        cmdArgs.push('--disable-js');
    }

    child.exec('node_modules/phantomas/phantomas.js ' + cmdArgs.join(' '), function(error, stdout, stderr) {
    //runCmd('node_modules/phantomas/phantomas.js', cmdArgs, function(stdout) {
    //var stdout = execSync('node_modules/phantomas/phantomas.js ' + cmdArgs.join(' '));
        var result = JSON.parse(stdout);
        finalResults[opts.url][screenName].done          = true;
        finalResults[opts.url][screenName].cmd           = cmdArgs.join(' ');
        finalResults[opts.url][screenName].metrics       = result;
        finalResults[opts.url][screenName].viewportWidth = parseInt(width, 10);
        finalResults[opts.url][screenName].viewportName  = screenName;
        finalResults[opts.url][screenName].screenshot    = screenshotFilename;


        //console.log('node_modules/phantomas/phantomas.js ' + cmdArgs.join(' '), result.metrics.imageCount);
        //console.log(opts.url, screenName, result.metrics.imageCount);
        //console.log(stdout + '\n\n');

        // Yes, this is hacky
        if (stdout.indexOf('Internal Server Error') != -1) {
        	finalResults[opts.url][screenName].pageError = true;
            deferred.resolve(result); // TODO: This should not be resolve
        }

        displayProgress();
        deferred.resolve(result);
    });

    return deferred.promise;
}

function displayProgress() {
    var totalReports = 0,
        doneReports  = 0;

    process.stdout.write("\u001b[0;0H"); // Moves to 0,0

    console.log('Running news metrics...\n');

    _.each(finalResults, function(screenSizes, url) {
        var resultLine = '';
        _.each(screenSizes, function(values, screenSize) {
            if (values.pageError) {
                resultLine += screenSize.red.bold + ' ';
                doneReports += 1;
            } else if (values.done) {
                resultLine += screenSize.green.bold + ' ';
                doneReports += 1;
            } else {
                resultLine += screenSize.grey + ' ';
            }

            totalReports += 1;
        });

        console.log(resultLine + ' ' + url);
    });

    console.log('\n' + doneReports + '/' + totalReports + ' reports complete');
}

function testUrlScreenSizes(url, screenSizes, sequentially) {
    var promiseChain = Q.fcall(function(){}),

        promises = screenSizes.map(function(screenSize) {
	        finalResults[url] = finalResults[url] || {};
	        finalResults[url][screenSize] = finalResults[url][screenSize] || {};
	        finalResults[url][screenSize].done = false;

	        if (sequentially) {
	            promiseChain = promiseChain.then(function() {
	            	return runMetrics({
			            url:       url,
			            viewport:  screenSize,
			            disableJS: false
	        		});
	            });
	        } else {
		        return runMetrics({
		            url:       url,
		            viewport:  screenSize,
		            disableJS: false
	        	});
	        }

	        displayProgress();
    	});

    // No JS version
    finalResults[url]['NoJS'] = { done: false };
    if (sequentially) {
    	promiseChain = promiseChain.then(function() {
        	return runMetrics({
	            url:       url,
	            viewport:  '1280x1024',
	            disableJS: true
    		});
        });
    } else {
	    promises.push(runMetrics({
	        url:       url,
	        viewport:  '1280x1024',
	        disableJS: true
	    }));
    }


    if (sequentially) {
    	return promiseChain;
    } else {
    	return Q.all(promises);
    }
}

function renderReport(results) {
    var templateFile = fs.readFileSync('templates/results_mustache.html').toString(),
        datestamp    = moment().format("YYYYMMDD_HHmm"),
        outputFile   = 'reports/' + datestamp + '_report.html',
        viewVars = {
            title: "Test title"
        };

    var rendered = mustache.to_html(templateFile, viewVars);
    fs.writeFileSync(outputFile, rendered);
}


function generateJsonReport(results) {
    var reportsDir  = __dirname + '/../www/reports',
        datestamp   = now.format("YYYYMMDD_HHmmss"),
        finalReport = {
            generated:      now.format('MMMM Do YYYY, h:mm:ss a'),
            generatedISO:   now.toISOString(),
            generatedEpoch: now.valueOf(),
            reports:        results
        };

    fs.writeFileSync(reportsDir + "/_latest.json", JSON.stringify(finalReport));

    // Archive
    fs.writeFileSync(reportsDir + "/" + datestamp + "_report.json", JSON.stringify(finalReport));

    // Generate list of available reports
    var reports = fs.readdirSync(reportsDir),
        availableReports = [];

    _.each(reports, function(reportFile) {
        if (reportFile.match(/\d{8}_\d{6}_report/)) {
            var reportDate = require(reportsDir + '/' + reportFile).generatedEpoch;
            availableReports.push([reportDate, reportFile]);
        }
    });
    fs.writeFileSync(reportsDir + "/_reports.json", JSON.stringify(availableReports));
}

function run() {
    var promises = [];

    // BBC sites
    CONFIG.bbcServices.map(function(service) {
        promises.push(testUrlScreenSizes('http://www.live.bbc.co.uk/' + service, CONFIG.screenSizes));
    });

    // External sites
    CONFIG.externalSites.map(function(url) {
        promises.push(testUrlScreenSizes(url, CONFIG.screenSizes));
    });

    // Sandbox URLs
    // These need to run sequentially, so as not to
    // hit the ContentAPI rate limiting
    var sandboxPromiseChain = Q.fcall(function(){});
    CONFIG.sandbox.map(function(url) {
    	sandboxPromiseChain = sandboxPromiseChain.then(function() {
    		return testUrlScreenSizes(url, CONFIG.screenSizes, true)
    	});
    });

    promises.push(sandboxPromiseChain);

    // All reports are done, write to JSON
    Q.all(promises).then(function() {
        generateJsonReport(finalResults);
        console.log('\nDone');
    });

    process.stdout.write("\u001b[2J"); // Clears screen
    displayProgress();
}

run();
