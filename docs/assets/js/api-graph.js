(function iife() {
    const graphs = document.querySelectorAll('.graph-container__graph');

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

    const skipTags = ['2020.02','2020.03','2020.04','2020.05','2020.06','2020.07','2020.08','2020.09','2021.07','2021.08'];

    Array.from(graphs).forEach(canvas => {
        const data = window.wikiData.history.find(i => i.api === canvas.dataset.api);
        const entries = data.entries.filter(e => !skipTags.includes(e.tag));

        // eslint-disable-next-line no-unused-vars, no-undef
        const chart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: entries.map(entry => entry.tag),
                datasets: [{
                    label: `abuse score`,
                    backgroundColor: colors.red,
                    borderColor: colors.red,
                    data: entries.map(entry => entry.value)
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
    });

}());