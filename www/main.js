var metricsApp = angular.module('metricsApp', []);
metricsApp.controller('MainController', function($scope, $http) {

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
                        }
                     });
            });
         });


    // Get latest report
    $http.get('reports/_latest.json')
         .success(function(data) {
            $scope.reportDate  = data.generatedEpoch;
            $scope.latestMetricsData = data.reports;
            console.log(data.reports);
         });
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
                    console.log(metrics);
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
        return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
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
