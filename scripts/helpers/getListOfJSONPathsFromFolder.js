const fs = require('fs');
const path = require('path');

module.exports = function getListOfJSONPathsFromFolder(folderPath) {
    return fs.readdirSync(folderPath)
        // filter out directories and non-json files
        .filter(file => {
            const resolvedPath = path.resolve(process.cwd(), path.join(folderPath, file));
            const stat = fs.statSync(resolvedPath);

            if(stat && stat.isFile() && file.endsWith('.json')) {
                return true;
            }

            console.trace('Skipping path', resolvedPath, stat);
            process.exit(1);
            return false;
        })
        // map file names to full paths
        .map(file => ({
            file,
            resolvedPath: path.resolve(process.cwd(), path.join(folderPath, file))
        }));
};