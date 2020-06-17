const config = require('../config');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs');
const ProgressBar = require('progress');
const mustache = require('mustache');
const getListOfJSONPathsFromFolder = require('./helpers/getListOfJSONPathsFromFolder');
const getTemplate = require('./helpers/getTemplate');

const TRACKER_RADAR_DOMAINS_PATH = path.join(config.trackerRadarRepoPath, '/domains/');
const TRACKER_RADAR_ENTITIES_PATH = path.join(config.trackerRadarRepoPath, '/entities/');

const fingerprintTexts = [
    "No use of browser API's",
    "Some use of browser API's, but not obviously for tracking purposes",
    "Use of many browser API's, possibly for tracking purposes",
    "Excessive use of browser API's, almost certainly for tracking purposes"
];

const weightsText = fs.readFileSync(path.join(config.trackerRadarRepoPath, 'build-data/static/api_fingerprint_weights.json'), 'utf8');
const fingerprintingWeights = JSON.parse(weightsText);

const domainFiles = getListOfJSONPathsFromFolder(TRACKER_RADAR_DOMAINS_PATH);
const entityFiles = getListOfJSONPathsFromFolder(TRACKER_RADAR_ENTITIES_PATH);

const progressBar = new ProgressBar('[:bar] :percent ETA :etas :file', {
    complete: chalk.green('='),
    incomplete: ' ',
    total: (domainFiles.length * 2) + entityFiles.length,
    width: 30
});

const stats = {
    failingFiles: 0
};

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
        stats.failingFiles++;
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
        stats.failingFiles++;
        return;
    }

    // Reformat some data for display
    data.fpText = fingerprintTexts[data.fingerprinting];
    data.prevalence = (data.prevalence * 100).toFixed(2);
    data.cookies = (data.cookies * 100).toFixed(2);
    data.types = Object.keys(data.types);
    data.rank = domainRanks[data.domain];
    data.totalDomains = prevalenceList.length;

    const apis = new Set();
    data.resources.forEach(resource => {
        Object.keys(resource.apis).forEach(api => apis.add(api));
    });
    data.fingerprintingApis = [...apis].sort((a, b) => {
        const weightA = fingerprintingWeights[a] || 0;
        const weightB = fingerprintingWeights[b] || 0;
        return weightB - weightA;
    });
    data.resources = data.resources.map(res => res.rule.replace(/\\/g, ''));
    
    const output = mustache.render(getTemplate('domain'), data, getTemplate);

    domainIndex.set(data.domain, data.prevalence);

    data.categories.forEach(catName => {
        const category = categories.get(catName) || {name: catName, domains: []};
        category.domains.push(data.domain);
        categories.set(catName, category);
    });

    fs.writeFile(path.join(config.domainPagesPath, `${data.domain}.html`), output, () => {});
});

entityFiles.forEach(({file, resolvedPath}) => {
    progressBar.tick({file});

    let data = null;

    try {
        const dataString = fs.readFileSync(resolvedPath, 'utf8');
        data = JSON.parse(dataString);
    } catch (e) {
        stats.failingFiles++;
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

    const output = mustache.render(getTemplate('entity'), data, getTemplate);

    fs.writeFile(path.join(config.entityPagesPath, `${data.name}.html`), output, () => {});
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

    const output = mustache.render(getTemplate('category'), data, getTemplate);

    fs.writeFile(path.join(config.categoryPagesPath, `${data.name}.html`), output, () => {});
});