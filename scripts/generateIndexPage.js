const config = require('../config');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs');
const ProgressBar = require('progress');
const mustache = require('mustache');
const getListOfJSONPathsFromFolder = require('./helpers/getListOfJSONPathsFromFolder');
const getTemplate = require('./helpers/getTemplate');

const historicDataTags = JSON.parse(fs.readFileSync(path.join(config.staticData, '/history/tags.json'), 'utf8'));

const lastTagInfo = {
    name: historicDataTags[historicDataTags.length - 1]
};

let TRACKER_RADAR_DOMAINS_PATH = path.join(config.trackerRadarRepoPath, '/domains/');
const TRACKER_RADAR_ENTITIES_PATH = path.join(config.trackerRadarRepoPath, '/entities/');

// Backwards compatibility for regions updates
if (fs.existsSync(path.join(TRACKER_RADAR_DOMAINS_PATH, 'US'))) {
    TRACKER_RADAR_DOMAINS_PATH = path.join(TRACKER_RADAR_DOMAINS_PATH, 'US');
}

const domainFiles = getListOfJSONPathsFromFolder(TRACKER_RADAR_DOMAINS_PATH);
const entityFiles = getListOfJSONPathsFromFolder(TRACKER_RADAR_ENTITIES_PATH);

const progressBar = new ProgressBar('[:bar] :percent ETA :etas :file', {
    complete: chalk.green('='),
    incomplete: ' ',
    total: domainFiles.length + entityFiles.length,
    width: 30
});

let domains = [];
let entities = [];
const categories = new Map();

domainFiles.forEach(({file, resolvedPath}) => {
    progressBar.tick({file});

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

    domains.push({domain: data.domain, prevalence: data.prevalence, sites: data.sites});
});

entityFiles.forEach(({file, resolvedPath}) => {
    progressBar.tick({file});

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

    entities.push({name: data.name, fileName: file.replace('.json', '.html'), prevalence: entityPrevalence, properties: data.properties.length});
});

domains = domains.sort((a, b) => b.prevalence - a.prevalence);
entities = entities.sort((a, b) => b.prevalence - a.prevalence);

const historicDataString = fs.readFileSync(path.join(config.staticData, '/history/global.json'), 'utf8');

const renderData = {
    domains: domains.slice(0, 10),
    entities: entities.slice(0, 10),
    categories: Array.from(categories.values()),
    lastTagInfo,
    historicDataString,
    hostPath: config.hostPath
};

try {
    const trending = JSON.parse(fs.readFileSync(path.join(config.staticData, '/history/trending.json'), 'utf8'));
    renderData.trending = trending;
} catch (e) {
    throw new Error('Error parsing trending.json data.');
}

const output = mustache.render(getTemplate('index'), renderData, getTemplate);

fs.writeFileSync(path.join(config.basePagesPath, 'index.html'), output);

const top100RenderData = {
    domains: domains.slice(0, 100),
    entities: entities.slice(0, 100),
    hostPath: config.hostPath
};

const top100Output = mustache.render(getTemplate('top100'), top100RenderData, getTemplate);

fs.writeFileSync(path.join(config.basePagesPath, 'top100.html'), top100Output);

const apiHistoryString = fs.readFileSync(path.join(config.staticData, '/history/api-history.json'), 'utf8');
const apiHistory = JSON.parse(apiHistoryString);

const apiHistoryRenderData = {
    apiHistory: apiHistory
        .filter(item => item.api !== 'Document.prototype.cookie') // this was only used before 2020.11, after this date we have split it into a getter and setter
        .map(item => ({api: item.api, entries: item.entries, lastValue: item.entries[item.entries.length - 1].value}))
        .sort((a, b) => b.lastValue - a.lastValue),
    apiHistoryString,
    hostPath: config.hostPath
};

const apiHistoryOutput = mustache.render(getTemplate('apiHistory'), apiHistoryRenderData, getTemplate);

fs.writeFileSync(path.join(config.basePagesPath, 'apiHistory.html'), apiHistoryOutput);