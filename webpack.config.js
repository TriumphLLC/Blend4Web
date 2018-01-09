const path = require('path');
module.exports = [
    {
    entry: path.resolve(__dirname, './index.js'),
        output: {
            path: path.resolve(__dirname, "dist"),
            filename: 'b4w.js'
        }
    },
    {
    entry: path.resolve(__dirname, './uranium/index.js'),
        output: {
            path: path.resolve(__dirname, "uranium"),
            filename: 'ipc.js'
        }
    },

]