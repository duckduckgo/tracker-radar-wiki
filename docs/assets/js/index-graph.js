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
        grey: "rgb(201, 203, 207)"
    };

    // eslint-disable-next-line no-unused-vars, no-undef
    const chart = new Chart(graph, {
        type: 'line',
        data: {
            labels: window.wikiData.history.map(entry => entry.date),
            datasets: [{
                label: `# domains`,
                backgroundColor: colors.red,
                borderColor: colors.red,
                data: window.wikiData.history.map(entry => entry.domains)
            }]
        },
        options: {
            responsive: false,
            scales: {
                yAxes: [{
                    ticks: {
                        suggestedMin: 0
                    }
                }]
            }
        }
    });

    controller.addEventListener('change', () => {
        if (controller.value === 'domains') {
            chart.data.datasets = [{
                label: `# domains`,
                backgroundColor: colors.red,
                borderColor: colors.red,
                data: window.wikiData.history.map(entry => entry.domains)
            }];
            chart.options.tooltips = {};
            chart.options.scales = {
                yAxes: [{
                    ticks: {
                        suggestedMin: 0
                    }
                }]
            };
        } else if (controller.value === 'entities') {
            chart.data.datasets = [{
                label: `# entities`,
                backgroundColor: colors.blue,
                borderColor: colors.blue,
                data: window.wikiData.history.map(entry => entry.entities)
            }];
            chart.options.tooltips = {};
            chart.options.scales = {
                yAxes: [{
                    ticks: {
                        suggestedMin: 0
                    }
                }]
            };
        } else if (controller.value === 'fingerprinting') {
            chart.data.datasets = [{
                label: `domains with score 0`,
                borderColor: colors.green,
                backgroundColor: colors.green,
                data: window.wikiData.history.map(entry => entry.fingerprinting[0])
            },
            {
                label: `domains with score 1`,
                borderColor: colors.yellow,
                backgroundColor: colors.yellow,
                data: window.wikiData.history.map(entry => entry.fingerprinting[1])
            },
            {
                label: `domains with score 2`,
                borderColor: colors.orange,
                backgroundColor: colors.orange,
                data: window.wikiData.history.map(entry => entry.fingerprinting[2])
            },
            {
                label: `domains with score 3`,
                borderColor: colors.red,
                backgroundColor: colors.red,
                data: window.wikiData.history.map(entry => entry.fingerprinting[3])
            }];
            chart.options.tooltips = {
                mode: 'index'
            };
            chart.options.scales = {
                xAxes: [{
                    stacked: true,
                }],
                yAxes: [{
                    stacked: true
                }]
            };
        }

        chart.update();
    });

}());