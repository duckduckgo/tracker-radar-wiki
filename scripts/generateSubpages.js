const config = require('../config');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs');
const ProgressBar = require('progress');
const mustache = require('mustache');
const getListOfJSONPathsFromFolder = require('./helpers/getListOfJSONPathsFromFolder');
const getTemplate = require('./helpers/getTemplate');
const escapeEntityName = require('./helpers/escapeEntityName');

let TRACKER_RADAR_DOMAINS_PATH = path.join(config.trackerRadarRepoPath, '/domains/');
const TRACKER_RADAR_ENTITIES_PATH = path.join(config.trackerRadarRepoPath, '/entities/');

// Backwards compatibility for regions updates
if (fs.existsSync(path.join(TRACKER_RADAR_DOMAINS_PATH, 'US'))) {
    TRACKER_RADAR_DOMAINS_PATH = path.join(TRACKER_RADAR_DOMAINS_PATH, 'US');
}

const fingerprintTexts = [
    "No use of browser API's",
    "Some use of browser API's, but not obviously for tracking purposes",
    "Use of many browser API's, possibly for tracking purposes",
    "Excessive use of browser API's, almost certainly for tracking purposes"
];

const weightsText = fs.readFileSync(path.join(config.trackerRadarRepoPath, 'build-data/generated/api_fingerprint_weights.json'), 'utf8');
const fingerprintingWeights = JSON.parse(weightsText);

const domainFiles = getListOfJSONPathsFromFolder(TRACKER_RADAR_DOMAINS_PATH);
const entityFiles = getListOfJSONPathsFromFolder(TRACKER_RADAR_ENTITIES_PATH);

const progressBar = new ProgressBar('[:bar] :percent ETA :etas :file', {
    complete: chalk.green('='),
    incomplete: ' ',
    total: (domainFiles.length * 2) + entityFiles.length,
    width: 30
});

const failingReads = [];
const failingWrites = [];

function writeFileCallback(file, e) {
    if (e) {
        failingWrites.push(failingWrites);
    }
}

const domainIndex = new Map();
const categories = new Map();

// Pre process domain files to generate rankings
const prevalenceList = [];
domainFiles.forEach(({file, resolvedPath}) => {
    progressBar.tick({file});

    let data = null;

    try {
        const dataString = fs.readFileSync(resolvedPath, 'utf8');
        data = JSON.parse(dataString);
    } catch (e) {
        failingReads.push(resolvedPath);
        return;
    }

    prevalenceList.push({domain: data.domain, prevalence: data.prevalence});

});

// Creating a mapping of domain to rank
const domainRanks = {};
prevalenceList.sort((a, b) => b.prevalence - a.prevalence).forEach((item, rank) => {domainRanks[item.domain] = rank + 1;});

domainFiles.forEach(({file, resolvedPath}) => {
    progressBar.tick({file});

    let data = null;

    try {
        const dataString = fs.readFileSync(resolvedPath, 'utf8');
        data = JSON.parse(dataString);
    } catch (e) {
        failingReads.push(resolvedPath);
        return;
    }

    try {
        const historicDataString = fs.readFileSync(path.join(config.staticData, '/history/domains/', file), 'utf8');
        const history = JSON.parse(historicDataString);
        data.history = history.entries;
        data.historySerialized = JSON.stringify(data.history);
    } catch (e) {
        failingReads.push(path.join(config.staticData, '/history/domains/', file));
        return;
    }

    // Reformat some data for display
    data.fpText = fingerprintTexts[data.fingerprinting];
    data.prevalence = (data.prevalence * 100).toFixed(2);
    data.cookies = (data.cookies * 100).toFixed(2);
    data.types = data.types ? Object.keys(data.types) : [];
    data.rank = domainRanks[data.domain];
    data.totalDomains = prevalenceList.length;

    if (data.owner && data.owner.name) {
        data.owner.filename = escapeEntityName(data.owner.name);
    }

    const apis = new Set();
    data.resources.forEach(resource => {
        Object.keys(resource.apis).forEach(api => apis.add(api));
    });
    data.fingerprintingApis = [...apis].sort((a, b) => {
        const weightA = fingerprintingWeights[a] || 0;
        const weightB = fingerprintingWeights[b] || 0;
        return weightB - weightA;
    });
    data.hostPath = config.hostPath;

    const exampleSites = new Set();
    data.resources.forEach(res => {
        if (res.exampleSites) {
            res.exampleSites.forEach(site => exampleSites.add(site));
        }
    });

    data.exampleSites = Array.from(exampleSites);

    data.resources = data.resources.map(res => {
        const url = (res.subdomains.length > 0 ? `${res.subdomains[0]}.` : '') +  res.rule.replace(/\\/g, '');

        return {
            url,
            sites: res.sites
        };
    }).sort((a, b) => b.sites - a.sites);
    
    const output = mustache.render(getTemplate('domain'), data, getTemplate);

    domainIndex.set(data.domain, data.prevalence);

    data.categories.forEach(catName => {
        const category = categories.get(catName) || {name: catName, domains: []};
        category.domains.push(data.domain);
        categories.set(catName, category);
    });

    const writePath = path.join(config.domainPagesPath, `${data.domain}.html`);
    fs.writeFileSync(writePath, output, writeFileCallback.bind(null, writePath));
});

entityFiles.forEach(({file, resolvedPath}) => {
    progressBar.tick({file});

    let data = null;

    try {
        const dataString = fs.readFileSync(resolvedPath, 'utf8');
        data = JSON.parse(dataString);
    } catch (e) {
        failingReads.push(resolvedPath);
        return;
    }

    try {
        const historicDataString = fs.readFileSync(path.join(config.staticData, '/history/entities', file), 'utf8');
        const history = JSON.parse(historicDataString);
        data.history = history.entries;
        data.historySerialized = JSON.stringify(data.history);
    } catch (e) {
        failingReads.push(path.join(config.staticData, '/history/entities', file));
        return;
    }

    // add info about which properties have separate 'domain' pages
    data.properties = data.properties.map(domain => {
        if (domainIndex.has(domain)) {
            return {
                domain,
                known: true,
                prevalence: domainIndex.get(domain)
            };
        }
        return {
            domain,
            known: false,
            prevalence: -1
        };
        
    });
    data.properties = data.properties.sort((a, b) => b.prevalence - a.prevalence);

    if (data.prevalence) {
        data.prevalence.tracking = (data.prevalence.tracking * 100).toFixed(2);
        data.prevalence.nonTracking = (data.prevalence.nonTracking * 100).toFixed(2);
        data.prevalence.total = (data.prevalence.total * 100).toFixed(2);
    }

    data.hostPath = config.hostPath;

    const output = mustache.render(getTemplate('entity'), data, getTemplate);

    const writePath = path.join(config.entityPagesPath, file.replace('.json', '.html'));
    fs.writeFileSync(writePath, output, writeFileCallback.bind(null, writePath));
});

Array.from(categories.values()).forEach(data => {
    data.domains = data.domains.map(domain => {
        if (domainIndex.has(domain)) {
            return {
                domain,
                known: true,
                prevalence: domainIndex.get(domain)
            };
        }
        return {
            domain,
            known: false,
            prevalence: 0
        };
        
    });
    data.domains = data.domains.sort((a, b) => b.prevalence - a.prevalence);

    try {
        const historicDataString = fs.readFileSync(path.join(config.staticData, '/history/categories', `${data.name}.json`), 'utf8');
        const history = JSON.parse(historicDataString);
        data.history = history.entries;
        data.historySerialized = JSON.stringify(data.history);
    } catch (e) {
        console.error(chalk.red(e));
    }

    data.hostPath = config.hostPath;

    const output = mustache.render(getTemplate('category'), data, getTemplate);

    const writePath = path.join(config.categoryPagesPath, `${data.name}.html`);
    fs.writeFileSync(writePath, output, writeFileCallback.bind(null, writePath));
});

if (failingReads.length > 0) {
    console.log(`${chalk.red(failingReads.length)} file(s) failed to load.`, failingReads);
} else {
    console.log(`✅ all files loaded correctly.`);
}
if (failingWrites.length > 0) {
    console.log(`${chalk.red(failingWrites.length)} file(s) failed to save.`, failingWrites);
} else {
    console.log(`✅ all files saved correctly.`);
}