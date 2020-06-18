const config = require('../config');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs');
const ProgressBar = require('progress');
const {checkoutCommit} = require('git-parse');
const getListOfJSONPathsFromFolder = require('./helpers/getListOfJSONPathsFromFolder');

const commits = [
    {hash: '74e767dbaf6394bcb98348d54abf3daaa51e3131', date: '02.2020'},
    {hash: '689e48064259a2e9d8d079e1fee79bb7f1f9a248', date: '03.2020'},
    {hash: 'f62eb8b8f4fc64217c1ac06d45236513b120b504', date: '04.2020'},
    {hash: '7956f0151c72bd3999a7e8b4a17d698785089fbf', date: '05.2020'},
];

const TRACKER_RADAR_DOMAINS_PATH = path.join(config.trackerRadarRepoPath, '/domains/');
const TRACKER_RADAR_ENTITIES_PATH = path.join(config.trackerRadarRepoPath, '/entities/');

const domainMap = new Map();
const entityMap = new Map();
const categoryMap = new Map();
const globalStats = [];

async function main() {
    for (let commit of commits) {
        // eslint-disable-next-line no-await-in-loop
        const checkedOut = await checkoutCommit(config.trackerRadarRepoPath, commit.hash, {force: true});

        if (!checkedOut) {
            console.error('Failed to check out.');
            return;
        }

        const domainFiles = getListOfJSONPathsFromFolder(TRACKER_RADAR_DOMAINS_PATH);
        const entityFiles = getListOfJSONPathsFromFolder(TRACKER_RADAR_ENTITIES_PATH);

        console.log(chalk.yellow(commit.date));

        const progressBar = new ProgressBar('[:bar] :percent ETA :etas :file', {
            complete: chalk.green('='),
            incomplete: ' ',
            total: domainFiles.length + entityFiles.length,
            width: 30
        });

        const stats = {
            failingFiles: 0
        };

        const fingerprintingScores = [0, 0, 0, 0];

        const categoryEntries = new Map();
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

            fingerprintingScores[data.fingerprinting]++;

            const domainObj = domainMap.get(data.domain) || {
                name: data.domain,
                entries: []
            };

            domainObj.entries.push({
                date: commit.date,
                prevalence: data.prevalence,
                sites: data.sites,
                fingerprinting: data.fingerprinting,
                cookies: data.cookies
            });

            domainMap.set(data.domain, domainObj);

            data.categories.forEach(catName => {
                const category = categoryEntries.get(catName) || {name: catName, domains: 0, prevalence: 0};
                category.domains++;
                categoryEntries.set(catName, category);
            });
        });
        Array.from(categoryEntries.values()).forEach(entry => {
            const category = categoryMap.get(entry.name) || {name: entry.name, entries: []};
            entry.prevalence = entry.domains / domainFiles.length;
            category.entries.push(entry);
            categoryMap.set(entry.name, category);
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

            const entityObj = entityMap.get(data.name) || {
                filename: file,
                name: data.name,
                entries: []
            };

            entityObj.entries.push({
                date: commit.date,
                prevalence: data.prevalence,
                properties: data.properties.length
            });

            entityMap.set(data.name, entityObj);
        });

        globalStats.push({
            date: commit.date,
            domains: domainFiles.length,
            entities: entityFiles.length,
            fingerprinting: fingerprintingScores
        });
    }
}

main().then(() => {
    Array.from(domainMap.values()).forEach(item => {
        try {
            fs.writeFileSync(path.join(config.staticData, `/history/domains/${item.name}.json`), JSON.stringify(item));
        } catch (e) {
            console.error(chalk.red(e));
        }
    });
    Array.from(entityMap.values()).forEach(item => {
        try {
            fs.writeFileSync(path.join(config.staticData, `/history/entities/${item.filename}`), JSON.stringify(item));
        } catch (e) {
            console.error(chalk.red(e));
        }
    });
    Array.from(categoryMap.values()).forEach(item => {
        try {
            fs.writeFileSync(path.join(config.staticData, `/history/categories/${item.name}.json`), JSON.stringify(item));
        } catch (e) {
            console.error(chalk.red(e));
        }
    })

    const trending = Array.from(domainMap.values()).map(item => {
        // Get last two prevalence entries
        const prevVals = item.entries.slice(item.entries.length - 2).map(entry => entry.prevalence);
        const diff = prevVals[1] - prevVals[0];
        return {
            diff: (diff * 100).toFixed(2),
            htmlSymbol: (diff > 0) ? '&#x2B06;' : '&#x2B07;',
            htmlClass: (diff > 0) ? 'trend-up' : 'trend-down',
            name: item.name
        };
    }).filter(entry => Math.abs(entry.diff) > 0.5).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 10);
    
    try {
        fs.writeFileSync(path.join(config.staticData, '/history/trending.json'), JSON.stringify(trending));
        fs.writeFileSync(path.join(config.staticData, `/history/global.json`), JSON.stringify(globalStats));
    } catch (e) {
        console.error(e);
    }
});
