# tracker-radar-wiki
Generation scripts and source for Tracker Radar Wiki

## How to use it

Setup

```bash
npm i
```

If you want to generate search and graph data (e.g. when dataset has changed):

```bash
npm run build-search
npm run build-history
```

If you want to generate HTML pages (e.g. when templates were modified):

```bash
npm run build-index # Builds the home page
npm run build-pages # Builds all other pages
```

Be sure to edit `config.js` to ensure your paths are set correctly.

The `docs` directory is where the built site lives. Use a web server like `python -m SimpleHTTPServer 8000` to serve locally. Pushing to master
will autmatically update the live version of the site.
