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
                label: `prevalence (%)`,
                backgroundColor: colors.red,
                borderColor: colors.red,
                data: window.wikiData.history.map(entry => entry.prevalence * 100)
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
    });

    controller.addEventListener('change', () => {
        if (controller.value === 'prevalence') {
            chart.data.datasets = [{
                label: `prevalence (%)`,
                backgroundColor: colors.red,
                borderColor: colors.red,
                data: window.wikiData.history.map(entry => entry.prevalence * 100)
            }];
            chart.options.scales.yAxes = [{
                ticks: {
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            }];
        } else if (controller.value === 'domains') {
            chart.data.datasets = [{
                label: `# of domains`,
                backgroundColor: colors.orange,
                borderColor: colors.orange,
                data: window.wikiData.history.map(entry => entry.domains)
            }];
            chart.options.scales.yAxes = [{
                ticks: {}
            }];
        }

        chart.update();
    });

}());