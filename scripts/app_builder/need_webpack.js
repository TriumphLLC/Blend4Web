const meta_data = require("./meta_data");
const path = require("path");
const cmd_parser = require('command-line-args');
const consts = require("./constants");
const fs = require("fs");

function parse_cmd() {
    // Parse commandline options
    const option_definitions = [
        { name: 'verbose', alias: 'v', type: Boolean },
        { name: 'html', type: String, defaultOption: true }
    ]
    const options = cmd_parser(option_definitions)
    if (options.verbose)
        console.log("Options: \n", options);
    return options;
}

var main = function () {
    cmd_opt = parse_cmd();
    var html = path.resolve(cmd_opt.html);
    
    if (!fs.existsSync(html) || fs.lstatSync(html).isDirectory()) {
        console.error(html + " is not a file")
        process.exit(consts.RET_ERROR);
    }
    
    desc = meta_data.get_meta_data(html, cmd_opt.verbose);

    return meta_data.need_webpack(desc.html, desc.proj, cmd_opt.verbose);
}

if (require.main === module) {
    process.exit(main()); 
}