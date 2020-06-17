(function iife() {
    /**
     * @type {HTMLInputElement}
     */
    const input = document.querySelector('.search-box__input');
    const output = document.querySelector('.search-box__results');

    if (!input || !output) {
        console.warn('Missing .search-box__input or .search-box__results element.');
        return;
    }

    let searchIndex;
    let searchData;

    // we are using relative URLs so that everything works on both local and production
    let pathPrefix = '..';
    if (location.pathname === '/' || location.pathname === '/tracker-radar-wiki/') {
        pathPrefix = '.';
    }

    fetch(`${pathPrefix}/assets/data/searchIndex.json`)
        .then(response => response.json())
        .then(data => {
            // eslint-disable-next-line no-undef
            searchIndex = lunr.Index.load(data);

            input.removeAttribute('disabled');
            input.setAttribute('placeholder', 'domain or company name');
        });

    fetch(`${pathPrefix}/assets/data/searchData.json`)
        .then(response => response.json())
        .then(data => {searchData = data;});

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
                a.href = `${pathPrefix}/domains/${entry.name}.html`;
                li.appendChild(a);
            } else if (entry.type === 'entity') {
                const a = document.createElement('a');
                a.innerText = `${entry.name} (${entry.type})`;
                a.href = `${pathPrefix}/entities/${entry.name}.html`;
                li.appendChild(a);
            } else {
                li.innerText = `${entry.name} (${entry.type})`;
            }

            tree.appendChild(li);
        });

        output.appendChild(tree);
    });
}());