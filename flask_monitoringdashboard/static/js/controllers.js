'use strict';

function OverviewController($scope, $http, $location, DTOptionsBuilder, menuService, endpointService) {
    endpointService.reset();
    menuService.reset('overview');
    $scope.alertShow = false;
    $scope.pypi_version = '';
    $scope.dashboard_version = '';
    $scope.isHits = true;

    $scope.table = [];
    $scope.options = DTOptionsBuilder.newOptions().withOption('order', [[4, 'desc']]);

    $scope.selectedItem = 2;

    $scope.sendForm = function (row, value) {
        row.monitor = value;
        $http.post('api/set_rule',
            $.param({
                'name': row.name,
                'value': value
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
                }
            });
    };

    $scope.toggleHits = function () {
        $scope.isHits = !$scope.isHits;
    };

    $http.get('api/overview').then(function (response) {
        $scope.table = response.data;
    });

    $scope.go = function (path) {
        $location.path(path);
    };

    $http.get('https://pypi.org/pypi/Flask-MonitoringDashboard/json').then(function (response) {
        $scope.pypi_version = response.data['info']['version'];

        $http.get('api/info').then(function (response) {
            $scope.dashboard_version = response.data['dashboard-version'];
            $scope.alertShow = $scope.pypi_version !== $scope.dashboard_version;
        })
    });
}

function ConfigurationController($scope, $http, menuService, endpointService) {
    endpointService.reset();
    menuService.reset('configuration');

    $scope.details = {};
    $scope.config = {};

    $http.get('api/deploy_details').then(function (response) {
        $scope.details = response.data;
    });
    $http.get('api/deploy_config').then(function (response) {
        $scope.config = response.data;
    });
}

function HourlyLoadController($scope, $http, menuService, plotlyService, infoService,
                              formService, endpointService) {
    endpointService.reset();
    menuService.reset('hourly_load');
    $scope.title = 'Hourly API Utilization';

    // Set the information box
    infoService.axesText = 'The X-axis presents a number of days. The Y-axis presents every hour of the day.';
    infoService.contentText = 'The color of the cell presents the number of requests that the application ' +
        'received in a single hour. The darker the cell, the more requests it has processed. This information ' +
        'can be used to validate on which moment of the day the Flask application processes to most requests.';

    // Set the form handler
    formService.clear();
    let start = formService.addDate('Start date');
    formService.addDate('End date');
    start.value.setDate(start.value.getDate() - 14);

    formService.setReload(function () {
        let start = formService.getDate('Start date');
        let end = formService.getDate('End date');
        let times = [...Array(24).keys()].map(d => d + ":00");

        $http.get('api/hourly_load/' + start + '/' + end).then(function (response) {
            plotlyService.heatmap(response.data.days, times, response.data.data, {
                yaxis: {
                    autorange: 'reversed'
                }
            });
        });
    });
    formService.reload();
}

function MultiVersionController($scope, $http, menuService, formService, infoService,
                                plotlyService, endpointService) {
    endpointService.reset();
    menuService.reset('multi_version');
    $scope.title = 'Multi version API Utilization';

    // Set the information box
    infoService.axesText = 'The X-axis presents the versions that are used. The Y-axis presents the' +
        'endpoints that are found in the Flask application.';
    infoService.contentText = 'The color of the cell presents the distribution of the amount of requests ' +
        'that the application received in a single version for a single endpoint. The darker the cell, ' +
        'the more requests a certain endpoint has processed in that version. Since it displays the ' +
        'distribution of the load, each column sums up to 100%. This information can be used to validate ' +
        'which endpoints processes the most requests.';

    // Set the form handler
    formService.clear();
    formService.addVersions();
    formService.addEndpoints();

    formService.setReload(function () {
        let versions = formService.getMultiSelection('versions');
        let endpoints = formService.getMultiSelection('endpoints');
        $http.post('api/multi_version', {
            data: {
                versions: versions,
                endpoints: endpoints
            }
        }).then(function (response) {
            plotlyService.heatmap(versions, endpoints,
                response.data.map(l => l.map(i => i == 0 ? 'NaN' : i)), {
                    xaxis: {
                        type: 'category',
                        title: 'Versions'
                    },
                    yaxis: {
                        type: 'category'
                    }
                });
        });
    });
}

function DailyUtilizationController($scope, $http, menuService, formService, infoService,
                                    plotlyService, endpointService) {
    endpointService.reset();
    menuService.reset('daily_load');
    $scope.title = 'Daily API Utilization';

    // Set the information box
    infoService.axesText = 'The X-axis presents the amount of requests. The Y-axis presents a number of days.';
    infoService.contentText = 'This graph presents a horizontal stacked barplot. Each endpoint is represented ' +
        'by a color. In the legend on the right, you can disable a certain endpoint by clicking on it. You can ' +
        'also show in the information of a single endpoint by double clicking that endpoint in the legend. The ' +
        'information from this graph can be used to see on which days (a subset of) the endpoints are used to most.';

    // Set the form handler
    formService.clear();
    let start = formService.addDate('Start date');
    start.value.setDate(start.value.getDate() - 10);
    formService.addDate('End date');

    formService.setReload(function () {
        let start = formService.getDate('Start date');
        let end = formService.getDate('End date');

        $http.get('api/requests/' + start + '/' + end).then(function (response) {
            let data = response.data.data.map(obj => {
                return {
                    x: obj.values,
                    y: response.data.days,
                    name: obj.name,
                    type: 'bar',
                    orientation: 'h'
                };
            });

            plotlyService.chart(data, {
                barmode: 'stack',
                xaxis: {
                    title: 'Number of requests',
                },
                yaxis: {
                    type: 'category',
                    autorange: 'reversed'
                }
            });
        });
    });
    formService.reload();
}

function ApiPerformanceController($scope, $http, menuService, formService, infoService,
                                  plotlyService, endpointService) {
    endpointService.reset();
    menuService.reset('api_performance');
    $scope.title = 'API Performance';

    // Set the information box
    infoService.axesText = 'The X-axis presents the execution time in ms. The Y-axis presents every endpoint of ' +
        'the Flask application.';
    infoService.contentText = 'In this graph, it is easy to compare the execution time of the different endpoints ' +
        'across each other. This information can be used to validate which endpoints needs to be improved.';

    // Set the form handler
    formService.clear();
    formService.addEndpoints();

    formService.setReload(function () {
        $http.post('api/api_performance', {
            data: {
                endpoints: formService.getMultiSelection('endpoints')
            }
        }).then(function (response) {
            let data = response.data.map(obj => {
                return {
                    x: obj.values,
                    type: 'box',
                    name: obj.name,
                };
            });

            plotlyService.chart(data, {
                xaxis: {
                    title: 'Execution time (ms)',
                },
                yaxis: {
                    type: 'category'
                }
            });
        });
    });
}

function EndpointHourlyLoadController($scope, $http, menuService, endpointService,
                                      infoService, formService, plotlyService) {
    endpointService.reset();
    menuService.reset('endpoint_hourly');
    endpointService.onNameChanged = function (name) {
        $scope.title = 'Hourly API Utilization for ' + name;
    };

    // Set the information box
    infoService.axesText = 'The X-axis presents a number of days. The Y-axis presents every hour of the day.';
    infoService.contentText = 'The color of the cell presents the number of requests that the application ' +
        'received in a single hour. The darker the cell, the more requests it has processed. This information ' +
        'can be used to validate on which moment of the day the Flask application processes to most requests.';

    // Set the form handler
    formService.clear();
    let start = formService.addDate('Start date');
    formService.addDate('End date');
    start.value.setDate(start.value.getDate() - 14);

    formService.setReload(function () {
        let start = formService.getDate('Start date');
        let end = formService.getDate('End date');
        let times = [...Array(24).keys()].map(d => d + ":00 ");

        $http.get('api/hourly_load/' + start + '/' + end + '/' + endpointService.info.id)
            .then(function (response) {
                plotlyService.heatmap(response.data.days, times, response.data.data, {

                    xaxis: {
                        type: 'category',
                        title: 'Versions'
                    },
                    yaxis: {
                        type: 'category',
                        autorange: 'reversed'
                    }

                });
            });
    });
    formService.reload();
}

function EndpointVersionUserController($scope, $http, infoService, endpointService,
                                       menuService, formService, plotlyService, $filter) {
    endpointService.reset();
    menuService.reset('endpoint_user_version');
    endpointService.onNameChanged = function (name) {
        $scope.title = 'User-Focused Multi-Version Performance for ' + name;
    };

    // Set the information box
    infoService.axesText = 'In this graph, the X-axis presents the versions that are used. The Y-axis ' +
        'presents (a subset of) all unique users, as specified by "dashboard.config.group_by". You can ' +
        'use the slider to select a subset of the all unique users.';
    infoService.contentText = '';

    formService.clear();
    formService.addUsers();
    formService.addVersions(endpointService.info.id);

    formService.setReload(function () {
        $http.post('api/version_user/' + endpointService.info.id, {
            data: {
                versions: formService.getMultiSelection('versions'),
                users: formService.getMultiSelection('users')
            }
        }).then(function (response) {
            let versions = response.data.versions.map(
                obj => obj.version + '<br>' + $filter('dateLayout')(obj.date)
            );
            plotlyService.heatmap(versions,
                formService.getMultiSelection('users'),
                response.data.data, {
                    xaxis: {
                        type: 'category',
                        title: 'Versions'
                    },
                    yaxis: {
                        type: 'category',
                        title: 'Users',
                        autorange: 'reversed'
                    }
                });
        });
    });
}

function EndpointVersionIPController($scope, $http, infoService, endpointService,
                                     menuService, formService, plotlyService, $filter) {
    endpointService.reset();
    menuService.reset('endpoint_ip');
    endpointService.onNameChanged = function (name) {
        $scope.title = 'IP-Focused Multi-Version Performance for ' + name;
    };

    // Set the information box
    infoService.axesText = 'In this graph, the X-axis presents the versions that are used. The Y-axis presents ' +
        '(a subset of) all IP-addresses. You can use the slider to select a subset of the all IP-addresses.';
    infoService.contentText = '';

    formService.clear();
    formService.addIP();
    formService.addVersions(endpointService.info.id);

    formService.setReload(function () {
        $http.post('api/version_ip/' + endpointService.info.id, {
            data: {
                versions: formService.getMultiSelection('versions'),
                ip: formService.getMultiSelection('IP-addresses')
            }
        }).then(function (response) {
            let versions = response.data.versions.map(
                obj => obj.version + '<br>' + $filter('dateLayout')(obj.date)
            );
            plotlyService.heatmap(versions,
                formService.getMultiSelection('IP-addresses'), response.data.data, {
                    xaxis: {
                        type: 'category',
                        title: 'Versions'
                    },
                    yaxis: {
                        type: 'category',
                        title: 'IP-addresses'
                    }
                });
        });
    });
}

function EndpointVersionController($scope, $http, infoService, endpointService,
                                   menuService, formService, plotlyService, $filter) {
    endpointService.reset();
    menuService.reset('endpoint_version');
    endpointService.onNameChanged = function (name) {
        $scope.title = 'Per-Version Performance for ' + name;
    };

    // Set the information box
    infoService.axesText = 'The X-axis presents the execution time in ms. The Y-axis presents the versions that are used.';
    infoService.contentText = 'This graph shows a horizontal boxplot for the versions that are used. With this ' +
        'graph you can found out whether the performance changes across different versions.';

    formService.clear();
    formService.addVersions(endpointService.info.id);

    formService.setReload(function () {
        $http.post('api/endpoint_versions/' + endpointService.info.id, {
            data: {
                versions: formService.getMultiSelection('versions'),
            }
        }).then(function (response) {
            plotlyService.chart(response.data.map(row => {
                return {
                    x: row.values,
                    type: 'box',
                    name: row.version + '<br>' + ($filter('dateLayout')(row.date)),
                    marker: {color: row.color}
                };
            }), {
                xaxis: {
                    title: 'Execution time (ms)',
                },
                yaxis: {
                    type: 'category',
                    autorange: 'reversed'
                },
                margin: {
                    l: 200
                }
            });
        });
    });
}

function EndpointUsersController($scope, $http, infoService, endpointService,
                                 menuService, formService, plotlyService) {
    endpointService.reset();
    menuService.reset('endpoint_user');
    endpointService.onNameChanged = function (name) {
        $scope.title = 'Per-User Performance for ' + name;
    };

    // Set the information box
    infoService.axesText = 'The X-axis presents the execution time in ms. The Y-axis presents the versions that are used.';
    infoService.contentText = 'This graph shows a horizontal boxplot for the versions that are used. With this ' +
        'graph you can found out whether the performance changes across different versions.';

    formService.clear();
    formService.addUsers();

    formService.setReload(function () {
        $http.post('api/endpoint_users/' + endpointService.info.id, {
            data: {
                users: formService.getMultiSelection('users'),
            }
        }).then(function (response) {
            plotlyService.chart(response.data.map(row => {
                return {
                    x: row.values,
                    type: 'box',
                    name: row.user,
                    marker: {color: row.color}
                };
            }), {
                xaxis: {
                    title: 'Execution time (ms)',
                },
                yaxis: {
                    type: 'category',
                    autorange: 'reversed'
                },
                margin: {
                    l: 200
                }
            });
        });
    });
}


function OutlierController($scope, $http, endpointService, menuService,
                           paginationService, plotlyService) {
    $scope.table = [];

    endpointService.reset();
    menuService.reset('endpoint_outlier');
    endpointService.onNameChanged = function (name) {
        $scope.title = 'Outliers for ' + name;
    };

    $scope.pagination = paginationService;
    $http.get('api/num_outliers/' + endpointService.info.id).then(function (response) {
        paginationService.setTotal(response.data);
    });
    paginationService.onReload = function(){
        $http.get('api/outlier_table/' + endpointService.info.id + '/' +
            paginationService.getOffset() + '/' + paginationService.perPage).then(function(response){
                $scope.table = response.data;
        });
    };

    $http.get('api/outlier_graph/' + endpointService.info.id).then(function (response) {
        plotlyService.chart(response.data.map(row => {
            return {
                x: row.values,
                type: 'box',
                name: row.name,
                marker: {color: row.color}
            };
        }), {
            xaxis: {
                title: 'CPU loads (%)',
            },
            yaxis: {
                type: 'category',
                autorange: 'reversed'
            }
        });
    });
}

app.controller('MenuController', function ($scope, menuService) {
    $scope.menu = menuService;
});

app.controller('InfoController', function ($scope, infoService) {
    $scope.info = infoService;
});

app.controller('FormController', function ($scope, formService) {
    $scope.handler = formService;
});

app.controller('EndpointController', function ($scope, endpointService) {
    $scope.endpoint = endpointService;
});