const config = require('../config');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs');
const ProgressBar = require('progress');
const simpleGit = require('simple-git');
const getListOfJSONPathsFromFolder = require('./helpers/getListOfJSONPathsFromFolder');

const TRACKER_RADAR_DOMAINS_PATH = path.join(config.trackerRadarRepoPath, '/domains/');
const TRACKER_RADAR_ENTITIES_PATH = path.join(config.trackerRadarRepoPath, '/entities/');

const domainMap = new Map();
const entityMap = new Map();
const categoryMap = new Map();
const globalStats = [];
let tags = [];

async function main() {
    const git = simpleGit(config.trackerRadarRepoPath);
    const tagsString = await git.tag();
    tags = tagsString.split('\n').filter(a => a.length > 0);

    try {
        fs.writeFileSync(path.join(config.staticData, `/history/tags.json`), JSON.stringify(tags));
    } catch (e) {
        console.error(chalk.red(e));
    }

    // FOR DEBUG - if you want to build test wiki from an unmerged branch, push it to the list of tags
    // tags.push('jd/fp-weights');

    for (let tag of tags) {
        // eslint-disable-next-line no-await-in-loop
        await git.raw('checkout', tag, '--force');

        let domainPath = TRACKER_RADAR_DOMAINS_PATH;
        if (fs.existsSync(path.join(domainPath, 'US'))) {
            domainPath = path.join(domainPath, 'US');
        }

        const domainFiles = getListOfJSONPathsFromFolder(domainPath);
        const entityFiles = getListOfJSONPathsFromFolder(TRACKER_RADAR_ENTITIES_PATH);

        console.log('Processing tag: ', chalk.yellow(tag));

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
                diff: diff.toFixed(2),
                htmlSymbol: (diff > 1) ? '&#x2B06;' : '&#x2B07;',
                direction: (diff > 1) ? 'up' : 'down',
                name: item.name
            };
        })
        .filter(entry => Math.abs(entry.diff) > 1.5)
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
        .slice(0, 12);

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
                diff: Math.abs(diff) === Number.MAX_SAFE_INTEGER ? `${diff < 0 ? '-' : ''}∞` : diff.toFixed(2),
                htmlSymbol: (diff > 1) ? '&#x2B06;' : '&#x2B07;',
                direction: (diff > 1) ? 'up' : 'down',
                name: item.name
            };
        })
        .filter(entry => Math.abs(entry.diff) > 1.5)
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
        .slice(0, 12);

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
