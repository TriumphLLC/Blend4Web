var REG_GROUP = /^\s*\[(.+?)\]\s*$/
var REG_PROP = /^\s*([^#].*?)\s*=\s*(.*?)\s*$/

function parse(string){
	var object = {}
	var lines = string.split('\n')
	var group
	var match

	for(var i = 0, len = lines.length; i !== len; i++){
		if(match = lines[i].match(REG_GROUP))
			object[match[1]] = group = object[match[1]] || {};
		else if(group && (match = lines[i].match(REG_PROP)))
			group[match[1]] = match[2];
	}

	return object;
}

function parseFile(file, callback){
	fs.readFile(file, 'utf-8', function(error, data){
		if(error)
			return callback(error);

		callback(null, parse(data))
	})
}


function parseFileSync(file){
	return parse(fs.readFileSync(file, 'utf-8'))
}

module.exports = {
	parse: parse,
	parseFile: parseFile,
	parseFileSync: parseFileSync
}