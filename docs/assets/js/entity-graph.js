(function iife() {
    const graph = document.querySelector('.graph-container__graph');
    const controller = document.querySelector('.graph-container__controller');

    if (!graph) {
        console.warn('Missing .graph-container__graph element.');
        return;
    }

    if (!window.wikiData || !window.wikiData.history || !window.wikiData.history.length) {
        console.warn('Missing history data.');
        return;
    }

    const colors = {
        red: "rgb(255, 99, 132)",
        orange: "rgb(255, 159, 64)",
        yellow: "rgb(255, 205, 86)",
        green: "rgb(75, 192, 192)",
        blue: "rgb(54, 162, 235)",
        purple: "rgb(153, 102, 255)",
        grey: "rgb(201, 203, 207)",
        clear: "rgba(0, 0, 0, 0)"
    };

    function getPrevalenceChartData() {
        return {
            type: 'line',
            data: {
                labels: window.wikiData.history.map(entry => entry.date),
                datasets: [{
                    label: `Tracking Prevalence`,
                    borderColor: colors.green,
                    backgroundColor: colors.clear,
                    data: window.wikiData.history.map(entry => entry.prevalence.tracking * 100)
                },
                {
                    label: `Non-Tracking Prevalence`,
                    borderColor: colors.yellow,
                    backgroundColor: colors.clear,
                    data: window.wikiData.history.map(entry => entry.prevalence.nonTracking * 100)
                },
                {
                    label: `Total Prevalence`,
                    borderColor: colors.orange,
                    backgroundColor: colors.clear,
                    data: window.wikiData.history.map(entry => entry.prevalence.total * 100)
                }]
            },
            options: {
                responsive: false,
                scales: {
                    yAxes: [{
                        ticks: {
                            suggestedMin: 0,
                            suggestedMax: 100
                        }
                    }]
                }
            }
        };
    }

    function getPropertiesChartData() {
        return {
            type: 'line',
            data: {
                labels: window.wikiData.history.map(entry => entry.date),
                datasets: [{
                    label: `# of properties`,
                    backgroundColor: colors.blue,
                    borderColor: colors.blue,
                    data: window.wikiData.history.map(entry => entry.properties)
                }]
            },
            options: {
                responsive: false,
                scales: {
                    yAxes: [{
                        ticks: {
                            suggestedMin: 0,
                            suggestedMax: 500,
                            stepSize: 1
                        }
                    }]
                }
            }
        }
    }

    // eslint-disable-next-line no-unused-vars, no-undef
    const chart = new Chart(graph, window.wikiData.history[0].prevalence ? getPrevalenceChartData() : getPropertiesChartData());

    controller.addEventListener('change', () => {
        if (controller.value === 'prevalence') {
            chart.data.datasets = [{
                label: `Tracking Prevalence`,
                borderColor: colors.green,
                backgroundColor: colors.clear,
                data: window.wikiData.history.map(entry => entry.prevalence.tracking * 100)
            },
            {
                label: `Non-Tracking Prevalence`,
                borderColor: colors.yellow,
                backgroundColor: colors.clear,
                data: window.wikiData.history.map(entry => entry.prevalence.nonTracking * 100)
            },
            {
                label: `Total Prevalence`,
                borderColor: colors.orange,
                backgroundColor: colors.clear,
                data: window.wikiData.history.map(entry => entry.prevalence.total * 100)
            }];
            chart.options.scales = {
                yAxes: [{
                    ticks: {
                        suggestedMin: 0,
                        suggestedMax: 100
                    }
                }]
            };
        } else if (controller.value === 'properties') {
            chart.data.datasets = [{
                label: `# of properties`,
                backgroundColor: colors.blue,
                borderColor: colors.blue,
                data: window.wikiData.history.map(entry => entry.properties)
            }];
            chart.options.scales.yAxes = [{
                ticks: {
                    suggestedMin: 0,
                    suggestedMax: 500,
                    stepSize: 1
                }
            }];
        }

        chart.update();
    });

}());