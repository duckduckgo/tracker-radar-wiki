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
npm run build-pages
```