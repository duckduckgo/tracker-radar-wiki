const fs = require('fs');
const path = require('path');
const config = require('../../config');

const templateCache = {};

module.exports = function getTemplate(name) {
    if (templateCache[name]) {
        return templateCache[name];
    }

    const partialPath = path.resolve(process.cwd(), path.join(config.templatesPath, `${name}.mustache`));
    const partialTemplate = fs.readFileSync(partialPath, 'utf8');

    templateCache[name] = partialTemplate;

    return partialTemplate;
};