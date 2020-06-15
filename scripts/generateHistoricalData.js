const config = require('../config');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs');
const ProgressBar = require('progress');
const {checkoutCommit} = require('git-parse');

const commits = [
    {hash: '17c5fd0acb7b63417d428574425ac0ca22aa8bd8', date: '02.2020'},
    {hash: '069a29144861144caa4e51e1b4a9bc1c9c70790d', date: '03.2020'},
    {hash: 'aa2244f3bf69382f389b9faefb7a4fb5d6d52599', date: '04.2020'},
    {hash: '7956f0151c72bd3999a7e8b4a17d698785089fbf', date: '05.2020'},
];

const TRACKER_RADAR_DOMAINS_PATH = path.join(config.trackerRadarRepoPath, '/domains/');
// const TRACKER_RADAR_ENTITIES_PATH = path.join(config.trackerRadarRepoPath, '/entities/');

const domainMap = new Map();

async function main() {
    for (let commit of commits) {
        const checkedOut = await checkoutCommit(config.trackerRadarRepoPath, commit.hash, {force: true});

        if (!checkedOut) {
            console.error('Failed to check out.');
            return;
        }

        const domainFiles = fs.readdirSync(TRACKER_RADAR_DOMAINS_PATH)
            .filter(file => {
                const resolvedPath = path.resolve(process.cwd(), `${TRACKER_RADAR_DOMAINS_PATH}/${file}`);
                const stat = fs.statSync(resolvedPath);

                return stat && stat.isFile() && file.endsWith('.json');
            });

        console.log(chalk.yellow(commit.date));

        const progressBar = new ProgressBar('[:bar] :percent ETA :etas :file', {
            complete: chalk.green('='),
            incomplete: ' ',
            total: domainFiles.length,
            width: 30
        });

        const stats = {
            failingFiles: 0
        };

        domainFiles.forEach(file => {
            progressBar.tick({file});

            const resolvedPath = path.resolve(process.cwd(), `${TRACKER_RADAR_DOMAINS_PATH}/${file}`);
            let data = null;

            try {
                const dataString = fs.readFileSync(resolvedPath, 'utf8');
                data = JSON.parse(dataString);
            } catch (e) {
                stats.failingFiles++;
                return;
            }

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
        });

    }
}

main().then(() => {
    Array.from(domainMap.values()).forEach(item => {

        fs.writeFileSync(path.join(config.staticData, `/history/${item.name}.json`), JSON.stringify(item)); 
    
    });
});
