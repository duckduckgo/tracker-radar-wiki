(function iife() {
    const graph = document.querySelector('.graph-container__graph');

    if (!graph) {
        console.warn('Missing .graph-container__graph element.');
        return;
    }

    if (!window.wikiData || !window.wikiData.history || !window.wikiData.history.length) {
        console.warn('Missing history data.');
        return;
    }

    // eslint-disable-next-line no-unused-vars, no-undef
    const chart = new Chart(graph, {
        type: 'line',
        data: {
            labels: window.wikiData.history.map(entry => entry.date),
            datasets: [{
                label: `prevalence (%)`,
                backgroundColor: 'rgb(255, 99, 132)',
                borderColor: 'rgb(255, 99, 132)',
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

}());