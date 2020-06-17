const fs = require('fs');
const path = require('path');

module.exports = function getListOfJSONPathsFromFolder(folderPath) {
    return fs.readdirSync(folderPath)
        // filter out directories and non-json files
        .filter(file => {
            const resolvedPath = path.resolve(process.cwd(), `${folderPath}/${file}`);
            const stat = fs.statSync(resolvedPath);

            return stat && stat.isFile() && file.endsWith('.json');
        })
        // map file names to full paths
        .map(file => ({
            file,
            resolvedPath: path.resolve(process.cwd(), `${folderPath}/${file}`)
        }));
};