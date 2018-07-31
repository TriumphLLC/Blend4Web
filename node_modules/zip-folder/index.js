var fs = require('fs');
var archiver = require('archiver');

function zipFolder(srcFolder, zipFilePath, callback) {
	var output = fs.createWriteStream(zipFilePath);
	var zipArchive = archiver('zip');

	output.on('close', function() {
		callback();
	});

	zipArchive.pipe(output);

	zipArchive.bulk([
		{ cwd: srcFolder, src: ['**/*'], expand: true }
	]);

	zipArchive.finalize(function(err, bytes) {
		if(err) {
			callback(err);
		}
	});
}

module.exports = zipFolder;
