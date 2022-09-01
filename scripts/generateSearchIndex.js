const config = require('../config');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs');
const lunr = require('lunr');
const ProgressBar = require('progress');
const getListOfJSONPathsFromFolder = require('./helpers/getListOfJSONPathsFromFolder');

let TRACKER_RADAR_DOMAINS_PATH = path.join(config.trackerRadarRepoPath, '/domains/');
const TRACKER_RADAR_ENTITIES_PATH = path.join(config.trackerRadarRepoPath, '/entities/');
const REGION = 'US';

// Backwards compatibility for regions updates
if (fs.existsSync(path.join(TRACKER_RADAR_DOMAINS_PATH, REGION))) {
    TRACKER_RADAR_DOMAINS_PATH = path.join(TRACKER_RADAR_DOMAINS_PATH, REGION);
}

const domainFiles = getListOfJSONPathsFromFolder(TRACKER_RADAR_DOMAINS_PATH);
const entityFiles = getListOfJSONPathsFromFolder(TRACKER_RADAR_ENTITIES_PATH);

const progressBar = new ProgressBar('[:bar] :percent ETA :etas :file', {
    complete: chalk.green('='),
    incomplete: ' ',
    total: domainFiles.length + entityFiles.length,
    width: 30
});

const stats = {
    failingFiles: 0
};

const indexData = [];

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

    indexData.push({
        name: data.domain,
        type: 'domain'
    });
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

    indexData.push({
        name: data.name,
        type: 'entity'
    });
});

const searchIndex = lunr(function lunrInit() {
    this.ref('id');
    this.field('name');

    indexData.forEach((item, idx) => {
        this.add({
            id: idx,
            name: item.name
        });
    });
});

fs.writeFileSync(path.join(config.staticData, 'searchData.json'), JSON.stringify(indexData));
fs.writeFileSync(path.join(config.staticData, 'searchIndex.json'), JSON.stringify(searchIndex));

console.log(stats);