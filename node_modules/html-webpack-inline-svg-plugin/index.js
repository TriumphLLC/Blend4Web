'use strict'

const assert = require('assert')
const path = require('path')
const chalk = require('chalk')
const parse5 = require('parse5')
const _ = require('lodash')
const fs = require('fs')
const SVGO = require('svgo')
const svgoDefaultConfig = require(path.resolve(__dirname, 'svgo-config.js'))

// let $

let outputHtml

let userConfig

function HtmlWebpackInlineSVGPlugin (options) {

    assert.equal(options, undefined, 'The HtmlWebpackInlineSVGPlugin does not accept any options')

}

HtmlWebpackInlineSVGPlugin.prototype.apply = function (compiler) {

    // Hook into the html-webpack-plugin processing
    compiler.plugin('compilation', (compilation) => {

        compilation.plugin('html-webpack-plugin-after-html-processing', (htmlPluginData, callback) => {

            // build the custom config
            userConfig =
                htmlPluginData.plugin.options.svgoConfig &&
                _.isObject(htmlPluginData.plugin.options.svgoConfig) ?
                htmlPluginData.plugin.options.svgoConfig :
                {}

            this.processImages(htmlPluginData.html)
                .then((html) => {

                    htmlPluginData.html = html || htmlPluginData.html

                    callback(null, htmlPluginData)

                })
                .catch((err) => callback(null, htmlPluginData))

        })

    })

}


/**
 * find all inline images and replace their html within the output
 * @param {string} html
 * @returns {Promise}
 *
 */
HtmlWebpackInlineSVGPlugin.prototype.processImages = function (html) {

    return new Promise((resolve, reject) => {

        const documentFragment = parse5.parseFragment(html, {
            locationInfo: true
        })

        // grab the images to process from the original DOM fragment
        const inlineImages = this.getInlineImages(documentFragment)

        // if we have no inlined images return the html
        if (!inlineImages.length) return resolve(html)

        // process the imageNodes
        this.updateHTML(html, inlineImages)
            .then((html) => resolve(html))
            .catch((err) => {

                console.log(chalk.underline.red('processImages hit error'))
                console.log(chalk.red(err))

                reject(err)

            })

    })

}


/**
 * run the Promises in a synchronous order
 * allows us to ensure we have completed processing of an inline image
 * before the next ones Promise is called (via then chaining)
 * @param {object} html
 * @param {array} inlineImages
 * @returns {Promise}
 *
 */
HtmlWebpackInlineSVGPlugin.prototype.updateHTML = function (html, inlineImages) {

    return inlineImages.reduce((promise, imageNode) => {

        return promise.then((html) => {

            return this.processImage(html)

        })

    }, Promise.resolve(html))

}


/**
 * get the first inline image and replace it with its inline SVG
 * @returns {Promise}
 *
 */
HtmlWebpackInlineSVGPlugin.prototype.processImage = function (html) {

    return new Promise((resolve, reject) => {

        // rebuild the document fragment each time with the updated html
        const documentFragment = parse5.parseFragment(html, {
            locationInfo: true,
        })

        const inlineImage = this.getFirstInlineImage(documentFragment)

        if (inlineImage) {

            this.processOutputHtml(html, inlineImage)
                .then((html) => {

                    resolve(html)

                })
                .catch((err) => reject(err))

        } else {

            // no inline image - just resolve
            resolve(html)

        }

    })

}


/**
 * get a count for how many inline images the html document contains
 * @param {Object} documentFragment - parse5 processed html
 * @param {array} inlineImages
 * @returns {array}
 *
 */
HtmlWebpackInlineSVGPlugin.prototype.getInlineImages = function (documentFragment, inlineImages) {

    if (!inlineImages) inlineImages = []

    if (documentFragment.childNodes && documentFragment.childNodes.length) {

        documentFragment.childNodes.forEach((childNode) => {

            if (this.isNodeValidInlineImage(childNode)) {

                inlineImages.push(childNode)

            } else {

                inlineImages = this.getInlineImages(childNode, inlineImages)

            }

        })

    }

    return inlineImages

}


/**
 * return the first inline image or false if none
 * @param {Object} documentFragment - parse5 processed html
 * @returns {null|Object} - null if no inline image - parse5 documentFragment if there is
 *
 */
HtmlWebpackInlineSVGPlugin.prototype.getFirstInlineImage = function (documentFragment) {

    const inlineImages = this.getInlineImages(documentFragment)

    if (!inlineImages.length) return null

    return inlineImages[0]

}


/**
 * check if a node is a valid inline image
 * @param {Object} node - parse5 documentFragment
 * @returns {boolean}
 *
 */
HtmlWebpackInlineSVGPlugin.prototype.isNodeValidInlineImage = function (node) {

    return !!(
        node.nodeName === 'img' &&
        _.filter(node.attrs, { name: 'inline' }).length &&
        this.getImagesSrc(node))


}


/**
 * get an inlined images src
 * @param {Object} inlineImage - parse5 document
 * @returns {string}
 *
 */
HtmlWebpackInlineSVGPlugin.prototype.getImagesSrc = function (inlineImage) {

    const svgSrcObject = _.find(inlineImage.attrs, { name: 'src' })

    // image does not have a src attribute
    if (!svgSrcObject) return ''

    const svgSrc = svgSrcObject.value

    // image src attribute must not be blank and it must be referencing a file with a .svg extension
    return svgSrc && svgSrc.indexOf('.svg') !== -1 ? svgSrc : ''

}


/**
 * append the inlineImages SVG data to the output HTML and remove the original img
 * @param {string} html
 * @param {Object} inlineImage - parse5 document
 * @returns {Promise}
 *
 */
HtmlWebpackInlineSVGPlugin.prototype.processOutputHtml = function (html, inlineImage) {

    return new Promise((resolve, reject) => {

        const svgSrc = this.getImagesSrc(inlineImage)

        // if the image isn't valid resolve
        if (!svgSrc) return resolve(html)

        fs.readFile(path.resolve(svgSrc), 'utf8', (err, data) => {

            if (err) reject(err)

            const configObj = Object.assign(svgoDefaultConfig, userConfig)

            const config = {}

            // pass all objects to the config.plugins array
            config.plugins = _.map(configObj, (value, key) => ({ [key]: value }));

            const svgo = new SVGO(config)

            svgo.optimize(data, (result) => {

                if (result.error) return reject(result.error)

                const optimisedSVG = result.data

                html = this.replaceImageWithSVG(html, inlineImage, optimisedSVG)

                resolve(html)

            })

        })

    })

}


/**
 * replace the img with the optimised SVG
 * @param {string} html
 * @param {Object} inlineImage - parse5 document
 * @param {Object} svg
 *
 */
HtmlWebpackInlineSVGPlugin.prototype.replaceImageWithSVG = function (html, inlineImage, svg) {

    const start = inlineImage.__location.startOffset

    const end = inlineImage.__location.endOffset

    // remove the img tag and add the svg content
    return html.substring(0, start) + svg + html.substring(end)

}

module.exports = HtmlWebpackInlineSVGPlugin
