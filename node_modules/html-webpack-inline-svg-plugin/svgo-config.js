/**
 * export default set of config options for SVGO
 * values are overridden by setting the svgoConfig param on html-webpack-plugin config
 *
 */

module.exports = {
    cleanupIDs: false, // important when working with inline SVGs, id's allow us to reference the individual symbols
    cleanupAttrs: true,
    removeDoctype: true,
    removeXMLProcInst: true,
    removeComments: true,
    removeMetadata: true,
    removeTitle: true,
    removeDesc: true,
    removeUselessDefs: true,
    removeEditorsNSData: true,
    removeEmptyAttrs: true,
    removeHiddenElems: true,
    removeEmptyText: true,
    removeEmptyContainers: true,
    removeViewBox: false,
    cleanUpEnableBackground: true,
    convertStyleToAttrs: true,
    convertColors: true,
    convertPathData: true,
    convertTransform: true,
    removeUnknownsAndDefaults: true,
    removeNonInheritableGroupAttrs: true,
    removeUselessStrokeAndFill: true,
    removeUnusedNS: true,
    cleanupNumericValues: true,
    moveElemsAttrsToGroup: true,
    moveGroupAttrsToElems: true,
    collapseGroups: true,
    removeRasterImages: false,
    mergePaths: true,
    convertShapeToPath: true,
    sortAttrs: true,
    transformsWithOnePath: false,
    removeDimensions: true,
    removeAttrs: false,
}
