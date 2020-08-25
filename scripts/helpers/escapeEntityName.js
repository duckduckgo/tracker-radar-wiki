/**
 * Transforms entity name to a valid file name (same regex as used in Tracker Radar)
 * 
 * @param {string} entityName 
 * @returns {string}
 */
module.exports = entityName => {
    return entityName.replace(/\/|!|"|:|>|<|\/|\\|\||\?|\*/g, '');
};