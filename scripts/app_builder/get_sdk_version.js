const path = require("path");
const fs = require("fs");


exports.get_sdk_version = function() {
    var contents = fs.readFileSync(path.join(__dirname, "..", "..", "VERSION")).toString();
    return contents.split(" ")[1].split(".");
}

var main = function () {
    console.log(exports.get_sdk_version())
    return 0;
}

if (require.main === module) {
    var ret = main();
    process.exit(ret); 
}