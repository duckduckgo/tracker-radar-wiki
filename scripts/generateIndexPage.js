const config = require('../config');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs');
const ProgressBar = require('progress');
const mustache = require('mustache');

const lastCommitInfo = {
    hash: '7956f0151c72bd3999a7e8b4a17d698785089fbf',
    date: '06/16/2020',
    crawled: 75000
}

const TRACKER_RADAR_DOMAINS_PATH = path.join(config.trackerRadarRepoPath, '/domains/');
const TRACKER_RADAR_ENTITIES_PATH = path.join(config.trackerRadarRepoPath, '/entities/');

const domainFiles = fs.readdirSync(TRACKER_RADAR_DOMAINS_PATH)
    .filter(file => {
        const resolvedPath = path.resolve(process.cwd(), `${TRACKER_RADAR_DOMAINS_PATH}/${file}`);
        const stat = fs.statSync(resolvedPath);

        return stat && stat.isFile() && file.endsWith('.json');
    });
const entityFiles = fs.readdirSync(TRACKER_RADAR_ENTITIES_PATH)
    .filter(file => {
        const resolvedPath = path.resolve(process.cwd(), `${TRACKER_RADAR_ENTITIES_PATH}/${file}`);
        const stat = fs.statSync(resolvedPath);

        return stat && stat.isFile() && file.endsWith('.json');
    });

const progressBar = new ProgressBar('[:bar] :percent ETA :etas :file', {
    complete: chalk.green('='),
    incomplete: ' ',
    total: domainFiles.length + entityFiles.length,
    width: 30
});

const templateCache = {};

function getTemplate(name) {
    if (templateCache[name]) {
        return templateCache[name];
    }

    const partialPath = path.resolve(process.cwd(), path.join(config.templatesPath, `${name}.mustache`));
    const partialTemplate = fs.readFileSync(partialPath, 'utf8');

    templateCache[name] = partialTemplate;

    return partialTemplate;
}

let domains = [];
let entities = [];
const categories = new Map();

domainFiles.forEach(file => {
    progressBar.tick({file});

    const resolvedPath = path.resolve(process.cwd(), `${TRACKER_RADAR_DOMAINS_PATH}/${file}`);
    let data = null;

    try {
        const dataString = fs.readFileSync(resolvedPath, 'utf8');
        data = JSON.parse(dataString);
    } catch (e) {
        return;
    }

    data.categories.forEach(catName => {
        const category = categories.get(catName) || {name: catName, domains: []};
        category.domains.push(data.domain);
        categories.set(catName, category);
    });

    domains.push({ domain: data.domain, prevalence: data.prevalence, sites: data.sites });
});

entityFiles.forEach(file => {
    progressBar.tick({file});

    const resolvedPath = path.resolve(process.cwd(), `${TRACKER_RADAR_ENTITIES_PATH}/${file}`);
    let data = null;

    try {
        const dataString = fs.readFileSync(resolvedPath, 'utf8');
        data = JSON.parse(dataString);
    } catch (e) {
        return;
    }

    let entityPrevalence = "0";
    if (data.prevalence) {
        // not all entities have this data
        entityPrevalence = (data.prevalence.tracking * 100).toFixed(2);
    }

    entities.push({name: data.name, prevalence: entityPrevalence, properties: data.properties.length});
});

domains = domains.sort((a, b) => b.prevalence - a.prevalence).slice(0, 10);
entities = entities.sort((a, b) => b.prevalence - a.prevalence).slice(0, 10);

const renderData = {
    domains: domains,
    entities: entities,
    categories: Array.from(categories.values()),
    lastCommitInfo: lastCommitInfo
}
const output = mustache.render(getTemplate('index'), renderData, getTemplate);

fs.writeFileSync(path.join(config.basePagesPath, 'index.html'), output);


