/* eslint-disable max-lines */
const config = require('../config');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs');
const ProgressBar = require('progress');
const simpleGit = require('simple-git');
const getListOfJSONPathsFromFolder = require('./helpers/getListOfJSONPathsFromFolder');

const TRACKER_RADAR_DOMAINS_PATH = path.join(config.trackerRadarRepoPath, '/domains/');
const TRACKER_RADAR_ENTITIES_PATH = path.join(config.trackerRadarRepoPath, '/entities/');
const REGION = 'US';

const domainMap = new Map();
const entityMap = new Map();
const categoryMap = new Map();
let globalStats = [];
let tags = [];

function mkdirIfNotExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

async function main() {
    // make sure that /docs/data/history folder is set up (it's not in git)
    mkdirIfNotExists(path.join(config.staticData, '/history/'));
    mkdirIfNotExists(path.join(config.staticData, '/history/categories/'));
    mkdirIfNotExists(path.join(config.staticData, '/history/domains/'));
    mkdirIfNotExists(path.join(config.staticData, '/history/entities/'));

    // “Those who fail to learn from history are doomed to repeat it.”
    // load historic data that we may alrady have locally because rebuilding everything from scratch takes forever

    let oldTags = [];

    try {
        const dataString = fs.readFileSync(path.join(config.staticData, '/history/', 'global.json'), 'utf8');
        globalStats = JSON.parse(dataString);
    } catch (e) {}

    try {
        const dataString = fs.readFileSync(path.join(config.staticData, '/history/', 'tags.json'), 'utf8');
        oldTags = JSON.parse(dataString);
    } catch (e) {}

    const historicDomainFiles = getListOfJSONPathsFromFolder(path.join(config.staticData, '/history/domains/'));
    const historicEntityFiles = getListOfJSONPathsFromFolder(path.join(config.staticData, '/history/entities/'));
    const historicCategoryFiles = getListOfJSONPathsFromFolder(path.join(config.staticData, '/history/categories/'));
    let failingFiles = 0;

    console.log('Processing historic data');
    console.log('Files to process: ', `${historicDomainFiles.length} domains + ${historicEntityFiles.length} entities + ${historicCategoryFiles.length} categories`);

    const historicProgressBar = new ProgressBar('[:bar] :percent ETA :etas :file', {
        complete: chalk.green('='),
        incomplete: ' ',
        total: historicDomainFiles.length + historicEntityFiles.length + historicCategoryFiles.length,
        width: 30
    });

    historicDomainFiles.forEach(({file, resolvedPath}) => {
        historicProgressBar.tick({file});

        let data = null;

        try {
            const dataString = fs.readFileSync(resolvedPath, 'utf8');
            data = JSON.parse(dataString);
        } catch (e) {
            failingFiles++;
            return;
        }

        domainMap.set(data.name, data);
    });

    historicEntityFiles.forEach(({file, resolvedPath}) => {
        historicProgressBar.tick({file});

        let data = null;

        try {
            const dataString = fs.readFileSync(resolvedPath, 'utf8');
            data = JSON.parse(dataString);
        } catch (e) {
            failingFiles++;
            return;
        }

        entityMap.set(data.name, data);
    });

    historicCategoryFiles.forEach(({file, resolvedPath}) => {
        historicProgressBar.tick({file});

        let data = null;

        try {
            const dataString = fs.readFileSync(resolvedPath, 'utf8');
            data = JSON.parse(dataString);
        } catch (e) {
            failingFiles++;
            return;
        }

        categoryMap.set(data.name, data);
    });

    console.log(`Loading succeeded (${failingFiles} files failed to load).`);

    // load list of all tags, figure out which ones we have to process

    const git = simpleGit(config.trackerRadarRepoPath);
    const tagsString = await git.tag();
    tags = tagsString.split('\n').filter(a => a.length > 0);

    // FOR DEBUG - if you want to build test wiki from an unmerged branch, push it to the list of tags
    // tags.push('muodov/aug-2022');

    try {
        fs.writeFileSync(path.join(config.staticData, '/history/tags.json'), JSON.stringify(tags));
    } catch (e) {
        console.error(chalk.red(e));
    }

    const processTags = tags.filter(tag => !oldTags.includes(tag));

    console.log(chalk.green(`${processTags.length} tag(s) need to be processed: `, processTags));

    for (let tag of processTags) {
        // eslint-disable-next-line no-await-in-loop
        await git.raw('checkout', tag, '--force');

        let domainPath = TRACKER_RADAR_DOMAINS_PATH;
        if (fs.existsSync(path.join(domainPath, REGION))) {
            domainPath = path.join(domainPath, REGION);
        }

        const domainFiles = getListOfJSONPathsFromFolder(domainPath);
        const entityFiles = getListOfJSONPathsFromFolder(TRACKER_RADAR_ENTITIES_PATH);

        console.log('Processing tag: ', chalk.yellow(tag));
        console.log('Files to process: ', `${domainFiles.length} domains + ${entityFiles.length} entities`);

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
                date: tag,
                prevalence: data.prevalence,
                sites: data.sites,
                fingerprinting: data.fingerprinting,
                cookies: data.cookies
            });

            domainMap.set(data.domain, domainObj);

            data.categories.forEach(catName => {
                const category = categoryEntries.get(catName) || {name: catName, domains: 0, prevalence: 0, date: tag};
                category.domains++;
                categoryEntries.set(catName, category);
            });
        });

        // for domains that we haven't seen in this crawl we need to push an entry with a bunch of zeros
        domainMap.forEach(domainObj => {
            const lastEntry = domainObj.entries[domainObj.entries.length - 1];
            if (!lastEntry || lastEntry.date !== tag) {
                domainObj.entries.push({
                    date: tag,
                    prevalence: 0,
                    sites: 0,
                    fingerprinting: 0,
                    cookies: 0
                });
            }
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

            const entityObj = entityMap.get(file) || {
                filename: file,
                name: data.name,
                entries: []
            };

            entityObj.entries.push({
                date: tag,
                prevalence: data.prevalence || {tracking: 0, nonTracking: 0, total: 0},
                properties: data.properties.length
            });

            entityMap.set(file, entityObj);
        });

        console.log(stats);

        globalStats.push({
            date: tag,
            domains: domainFiles.length,
            entities: entityFiles.length,
            fingerprinting: fingerprintingScores
        });
    }
}

main().then(() => {
    console.log('Writing json files to disk…');

    Array.from(domainMap.values()).forEach(item => {
        try {
            fs.writeFileSync(path.join(config.staticData, `/history/domains/`, `${item.name}.json`), JSON.stringify(item));
        } catch (e) {
            console.error(chalk.red(e));
        }
    });
    Array.from(entityMap.values()).forEach(item => {
        try {
            fs.writeFileSync(path.join(config.staticData, `/history/entities/`, `${item.filename}`), JSON.stringify(item));
        } catch (e) {
            console.error(chalk.red(e));
        }
    });
    Array.from(categoryMap.values()).forEach(item => {
        try {
            fs.writeFileSync(path.join(config.staticData, `/history/categories/`, `${item.name}.json`), JSON.stringify(item));
        } catch (e) {
            console.error(chalk.red(e));
        }
    });

    const lastTag = tags[tags.length - 1];

    console.log('Calculating trending domains and entities…');

    const interestingDomains = Array.from(domainMap.values())
        .filter(item => {
            const lastEntry = item.entries[item.entries.length - 1];
            const prevEntry = item.entries[item.entries.length - 2];

            return item.entries.length > 1 && (lastEntry.prevalence > 0.01 || prevEntry.prevalence > 0.01) && lastEntry.date === lastTag;
        });

    const trendingDomains = interestingDomains
        .map(item => {
            // Get last two prevalence entries
            const prevVals = item.entries.slice(item.entries.length - 2).map(entry => entry.prevalence);
            const diff = prevVals[1] - prevVals[0];
            return {
                diff: (diff * 100).toFixed(2),
                htmlSymbol: (diff > 0) ? '&#x2B06;' : '&#x2B07;',
                direction: (diff > 0) ? 'up' : 'down',
                name: item.name
            };
        })
        .filter(entry => Math.abs(entry.diff) > 0.5)
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
        .slice(0, 12);

    const trendingDomainsRelative = interestingDomains
        .map(item => {
            // Get last two prevalence entries
            const prevVals = item.entries.slice(item.entries.length - 2).map(entry => entry.prevalence);
            let diff = prevVals[0] === 0 ? Number.MAX_SAFE_INTEGER : prevVals[1] / prevVals[0];

            if (diff < 1) {
                diff = prevVals[1] === 0 ? -Number.MAX_SAFE_INTEGER : -(prevVals[0] / prevVals[1]);
            }

            return {
                diff,
                htmlSymbol: (diff > 1) ? '&#x2B06;' : '&#x2B07;',
                direction: (diff > 1) ? 'up' : 'down',
                name: item.name
            };
        })
        .filter(entry => Math.abs(entry.diff) > 1.5)
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
        .slice(0, 12)
        .map(item => {
            item.diff = Math.abs(item.diff) === Number.MAX_SAFE_INTEGER ? `${item.diff < 0 ? '-' : ''}∞` : item.diff.toFixed(2);
            return item;
        });

    const topNewDomains = Array.from(domainMap.values())
        .filter(item => item.entries.length === 1 && item.entries[0].date === lastTag)
        .map(item => ({
            prevalence: (item.entries[0].prevalence * 100).toFixed(2),
            name: item.name
        }))
        .sort((a, b) => b.prevalence - a.prevalence)
        .slice(0, 12);

    const interestingEntities = Array.from(entityMap.values())
        .filter(item => {
            const lastEntry = item.entries[item.entries.length - 1];
            const prevEntry = item.entries[item.entries.length - 2];

            return item.entries.length > 1 && lastEntry.prevalence && prevEntry.prevalence && (lastEntry.prevalence.total > 0.01 || prevEntry.prevalence.total > 0.01) && lastEntry.date === lastTag;
        });
    
    const trendingEntities = interestingEntities
        .map(item => {
            // Get last two tracking prevalence entries
            const prevVals = item.entries.slice(item.entries.length - 2).map(entry => (entry.prevalence ? entry.prevalence.total : 0));
            const diff = prevVals[1] - prevVals[0];
            return {
                diff: (diff * 100).toFixed(2),
                htmlSymbol: (diff > 0) ? '&#x2B06;' : '&#x2B07;',
                direction: (diff > 0) ? 'up' : 'down',
                name: item.name
            };
        })
        .filter(entry => Math.abs(entry.diff) > 0.05)
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
        .slice(0, 12);

    const trendingEntitiesRelative = interestingEntities
        .map(item => {
            // Get last two tracking prevalence entries
            const prevVals = item.entries.slice(item.entries.length - 2).map(entry => (entry.prevalence ? entry.prevalence.total : 0));
            let diff = prevVals[0] === 0 ? Number.MAX_SAFE_INTEGER : prevVals[1] / prevVals[0];

            if (diff < 1) {
                diff = prevVals[1] === 0 ? -Number.MAX_SAFE_INTEGER : -(prevVals[0] / prevVals[1]);
            }

            return {
                diff,
                htmlSymbol: (diff > 1) ? '&#x2B06;' : '&#x2B07;',
                direction: (diff > 1) ? 'up' : 'down',
                name: item.name
            };
        })
        .filter(entry => Math.abs(entry.diff) > 1.5)
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
        .slice(0, 12)
        .map(item => {
            item.diff = Math.abs(item.diff) === Number.MAX_SAFE_INTEGER ? `${item.diff < 0 ? '-' : ''}∞` : item.diff.toFixed(2);
            return item;
        });

    const topNewEntities = Array.from(entityMap.values())
        .filter(item => item.entries.length === 1 && item.entries[0].prevalence && item.entries[0].prevalence.total > 0 && item.entries[0].date === lastTag)
        .map(item => ({
            prevalence: (item.entries[0].prevalence.total * 100).toFixed(2),
            name: item.name
        }))
        .sort((a, b) => b.prevalence - a.prevalence)
        .slice(0, 12);

    const trending = {
        domains: trendingDomains,
        domainsRelative: trendingDomainsRelative,
        domainsNew: topNewDomains,
        entities: trendingEntities,
        entitiesRelative: trendingEntitiesRelative,
        entitiesNew: topNewEntities
    };

    try {
        fs.writeFileSync(path.join(config.staticData, '/history/trending.json'), JSON.stringify(trending, null, 2));
        fs.writeFileSync(path.join(config.staticData, `/history/global.json`), JSON.stringify(globalStats, null, 2));
    } catch (e) {
        console.error(e);
    }

    console.log('✅ Done.');
});
