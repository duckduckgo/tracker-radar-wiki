(function() {
    const trendingList = document.querySelector('.trending-list');

    fetch(`./assets/data/history/trending.json`)
        .then(response => response.json())
        .then(data => {

            data.forEach(entry => {
                const li = document.createElement('li');

                const trendArrow = (entry.diff > 0) ? '&#x2B06;' : '&#x2B07;'
                const trendClass = (entry.diff > 0) ? 'trend-up' : 'trend-down';

                const a = document.createElement('a');
                a.href = `./domains/${entry.name}.html`;
                a.innerHTML = `${entry.name}`;
                li.appendChild(a);
                const span = document.createElement('span');
                span.innerHTML = `&nbsp- <span class=${trendClass}>${trendArrow}${(entry.diff * 100).toFixed(2)}&#37;</span>`;
                li.appendChild(span);
                trendingList.appendChild(li);
            });      

        });
})();