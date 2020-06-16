(function() {
    const graph = document.querySelector('.graph-container__graph');

    if (!graph) {
        console.warn('Missing .graph-container__graph element.')
        return;
    }

    const lineChart = new Chart(graph, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: `prevalence over time`,
                backgroundColor: 'rgb(255, 99, 132)',
                borderColor: 'rgb(255, 99, 132)',
                data: []
            }]
        },
        options: {
            responsive: false,
            scales: {
                yAxes: [{
                    ticks: {
                        suggestedMin: 0,
                        suggestedMax: 1
                    }
                }]
            }
        }
    });

    fetch(`../assets/data/history/${window.wikiData.domain}.json`)
        .then(response => response.json())
        .then(data => {

            const labels = [];
            const chartData = [];

            data.entries.forEach(entry => {
                labels.push(entry.date);
                chartData.push(entry.prevalence);
            });

            console.log(labels, chartData);

            labels.forEach(l => lineChart.data.labels.push(l));
            chartData.forEach(d => lineChart.data.datasets.forEach(dataset => dataset.data.push(d)));

            lineChart.update({duration: 300});
        });

})();