(function() {
    const input = document.querySelector('.search-box__input');
    const output = document.querySelector('.search-box__results');

    if (!input || !output) {
        console.warn('Missing .search-box__input or .search-box__results element.')
        return;
    }

    let searchIndex;
    let searchData;

    fetch('/assets/data/searchIndex.json')
        .then(response => response.json())
        .then(data => {
            searchIndex = lunr.Index.load(data);

            input.removeAttribute('disabled');
            input.setAttribute('placeholder', 'domain or company name');
        });

    fetch('/assets/data/searchData.json')
        .then(response => response.json())
        .then(data => searchData = data);

    input.addEventListener('change', () => {
        const results = searchIndex.search(input.value);

        output.innerHTML = '';
        const tree = document.createDocumentFragment();

        // don't show more than 10 results
        results.length = 10;

        results.forEach(result => {
            const entry = searchData[result.ref];

            const li = document.createElement('li');
            
            if (entry.type === 'domain') {
                const a = document.createElement('a');
                a.innerText = `${entry.name} (${entry.type})`;
                a.href = `/trackers/${entry.name}.html`;
                li.appendChild(a);
            } else {
                li.innerText = `${entry.name} (${entry.type})`;
            }

            tree.appendChild(li);
        });

        output.appendChild(tree);
    });
})();