/* eslint-disable max-lines */
const config = require('../config');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs');
const ProgressBar = require('progress');
const simpleGit = require('simple-git');

const STATIC_PATH = path.join(config.trackerRadarRepoPath, '/build-data/static/api_fingerprint_weights.json');
const GENERATED_PATH = path.join(config.trackerRadarRepoPath, '/build-data/generated/api_fingerprint_weights.json');

const fpHistory = new Map();

async function main() {
    const git = simpleGit(config.trackerRadarRepoPath);
    const tagsString = await git.tag();
    const tags = tagsString.split('\n').filter(a => a.length > 0);

    const progressBar = new ProgressBar('[:bar] :percent ETA :etas :tag', {
        complete: chalk.green('='),
        incomplete: ' ',
        total: tags.length,
        width: 30
    });

    for (let tag of tags) {
        // eslint-disable-next-line no-await-in-loop
        await git.raw('checkout', tag, '--force');

        progressBar.tick({tag});

        let data;

        try {
            const dataString = fs.readFileSync(GENERATED_PATH, 'utf8');
            data = JSON.parse(dataString);
        } catch (e) {}

        try {
            const dataString = fs.readFileSync(STATIC_PATH, 'utf8');
            data = JSON.parse(dataString);
        } catch (e) {}

        if(!data) {
            console.log(chalk.red(`Can't read fingerprinting data for tag ${tag}.`));
            continue;
        }

        Object.keys(data).forEach(api => {
            const apiData = fpHistory.get(api) || {api, entries: []};

            apiData.entries.push({
                tag,
                value: data[api]
            });

            fpHistory.set(api, apiData);
        });
    }
}

main().then(() => {
    try {
        fs.writeFileSync(path.join(config.staticData, '/history/api-history.json'), JSON.stringify(Array.from(fpHistory.values()), null, 2));
    } catch (e) {
        console.error(e);
    }

    console.log('✅ Done.');
});
