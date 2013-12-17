var metricsApp = angular.module('metricsApp', []);
metricsApp.controller('MainController', function($scope, $http, bytesFilter) {

    var metricsData = [],
        reportsLoaded = 0;

    // Load last 10 reports
    $http.get('reports/_reports.json')
         .success(function(data) {
            var latestReports = _.last(data, 10);
            _.each(latestReports, function(report) {
                var reportTimestamp = report[0],
                    reportFilename  = report[1];

                $http.get('reports/'+reportFilename)
                     .success(function(reportData) {
                        reportsLoaded += 1;
                        metricsData.push(reportData);

                        if (reportsLoaded == latestReports.length) {
                            $scope.metricsData = _.sortBy(metricsData, 'generatedEpoch');
                            $scope.latestMetricsData = reportData.reports;
                            //console.log(reportData);
                            //$scope.reportDate = 'xxx';
                            $scope.reportDate = reportData.generated;
                        }
                     });
            });
         });


    // Get latest report
    /*$http.get('reports/_latest.json')
         .success(function(data) {
            $scope.reportDate  = data.generatedEpoch;
            $scope.latestMetricsData = data.reports;
            console.log(data.reports);
         });*/
    $scope.getTotal = function(entry) {
        var total = _.reduce(entry, function(sum, values) {
            return sum + values.size;
        }, 0);
        return bytesFilter(total);
        //console.log(entry);
    };

    $scope.showRequests = function() {
        console.log(this.metrics.viewport);
        var counter = 1;
        _.each(this.metrics.frameworksSummary, function(val) {
            if (_.isObject(val)) {
                _.each(val.entries, function(entry) {
                    console.log(counter, entry[0], bytesFilter(entry[1]));
                    counter += 1;
                });
            }
        });
    };

    $scope.showFrameworksRequests = function() {
        console.log(this.metrics.viewport);
        var counter = 1;
        _.each(this.metrics.frameworksSummary, function(val) {
            if (_.isObject(val)) {
                _.each(val.entries, function(entry) {
                    console.log(counter, entry[0], bytesFilter(entry[1]));
                    counter += 1;
                });
            }
        });
        // /console.log(this.metrics.frameworksSummary);
    };
});


/* Graph Directive */
metricsApp.directive('graph', [
    function() {
        return {
            restrict: 'A',
            scope: {
                data: '=graph',
                type: '='
            },
            link: function(scope, element, attrs) {
                var ctx = element[0].getContext("2d");

                scope.$watch('data', function(metrics) {
                    //console.log(metrics);
                    var chartData = {
                        labels: _.map(metrics, function(val) {
                                    return moment(val.generatedEpoch).format('h:mma');
                                }),
                        datasets: [
                            {
                                fillColor : "rgba(220,220,220,0.5)",
                                strokeColor : "rgba(220,220,220,1)",
                                pointColor : "rgba(220,220,220,1)",
                                pointStrokeColor : "#fff",
                                data : [65,59,90,81,56,55,40,123,45,70]
                            },
                            {
                                fillColor : "rgba(151,0,0,0.5)",
                                strokeColor : "rgba(151,0,0,1)",
                                pointColor : "rgba(151,0,0,1)",
                                pointStrokeColor : "#fff",
                                data : [28,48,40,19,96,27,40,123,45,70]
                            }
                        ]
                    };

                    new Chart(ctx).Line(chartData);

                }, true);


                //console.log(scope, element);
            }
        };
    }
]);


/* Filters */
metricsApp.filter('bytes', function() {
    return function(bytes, precision) {
        if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
        if (typeof precision === 'undefined') precision = 1;
        var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
            number = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  '' + units[number];
    };
});

metricsApp.filter('domain', function () {
  return function (input) {
    var matches,
        output = "",
        urls = /\w+:\/\/([\w|\.]+)/;

    matches = urls.exec(input);

    if (matches !== null) output = matches[1];

    return output;
  };
});

metricsApp.filter('orderObjectBy', function(){
   return function(input, attribute) {
    if (!angular.isObject(input)) return input;

    var array = [];
    for(var objectKey in input) {
        array.push(input[objectKey]);
    }

    array.sort(function(a, b){
        a = parseInt(a[attribute], 10);
        b = parseInt(b[attribute], 10);
        return a - b;
    });
    return array;
   };
});


// From https://github.com/vpegado/angular-percentage-filter/blob/master/percentage.js
metricsApp.filter('percentage', function () {
        return function (input) {
            var rounded = Math.round(input*10000)/100;
            if (rounded == NaN) {
                return '';
            }
            var percentage = '' + rounded + '%';
            return percentage;
        };
    });


metricsApp.directive('jqSparkline', [function () {
        'use strict';
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, elem, attrs, ngModel) {

                 var opts={};
                opts.type = attrs.type || 'line';

                scope.$watch(attrs.ngModel, function () {
                    render();
                });

                scope.$watch(attrs.opts, function(){
                  render();
                }
                  );
                var render = function () {
                    var model;
                    if(attrs.opts) angular.extend(opts, angular.fromJson(attrs.opts));
                    //console.log(opts);
                    // Trim trailing comma if we are a string
                    //console.log(ngModel.$viewValue);
                    /*angular.isString(ngModel.$viewValue) ? model = ngModel.$viewValue.replace(/(^,)|(,$)/g, "") : model = ngModel.$viewValue;
                    var data;

                    var frameworksSize = _.reduce(ngModel.$viewValue.summary.frameworks, function(sum, values) {
                        return sum + values.size;
                    }, 0);
                    model = [0, 0, ngModel.$viewValue.size, frameworksSize]; // target, performance, range, range2, range3

                    // Make sure we have an array of numbers
                    angular.isArray(model) ? data = model : data = model.split(',');
                    $(elem).sparkline(data, opts);*/
                };
            }
        }
    }]);