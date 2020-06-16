(function() {
    const trendingList = document.querySelector('.trending-list');

    fetch(`../assets/data/history/trending.json`)
        .then(response => response.json())
        .then(data => {

            data.forEach(entry => {
                const li = document.createElement('li');

                const a = document.createElement('a');
                a.href = `./domains/${entry.name}.html`;
                a.innerHTML = `${entry.name} - &#x21E7;${(entry.diff * 100).toFixed(2)}&#37;`;
                li.appendChild(a);
                trendingList.appendChild(li);
            });      

        });
})();