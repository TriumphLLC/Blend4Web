var tmp = require('temporary');
var fs = require('fs');
var path = require('path');
var unzip = require('unzip');
var zipFolder = require('./index');

var txtFileName = 'file.txt';
var txtFileContents = 'this is a text file';
var zipFileName = 'archive.zip';

function emptyDirectory(dirName) {
	var dirFiles = fs.readdirSync(dirName);
	dirFiles.forEach(function(f) {
		var entryPath = path.join(dirName, f);
		var fileStats = fs.statSync(entryPath);
		if(fileStats.isFile()) {
			fs.unlink(entryPath);
		} else {
			emptyDirectory(entryPath);
		}
	});
}

module.exports = {
	setUp: function(callback) {
		this.tmpSrcDir = new tmp.Dir();

		var writePath = this.tmpSrcDir.path;

		fs.writeFileSync(path.join(writePath, txtFileName), txtFileContents);
		this.txtFileName = txtFileName;
		this.txtFileContents = txtFileContents;

		this.tmpZipFile = new tmp.File();
		this.tmpZipExtractionDir = new tmp.Dir();

		zipFolder(writePath, this.tmpZipFile.path, function() {

			callback();

		});
		
	},

	tearDown: function(callback) {
		
		emptyDirectory(this.tmpSrcDir.path);
		this.tmpSrcDir.rmdir();

		emptyDirectory(this.tmpZipExtractionDir.path);
		this.tmpZipExtractionDir.rmdir();
		
		this.tmpZipFile.unlink();
		
		callback();
	},

	// Ensure the zip has been created
	itCreatesTheZipFile: function(test) {
		test.ok(fs.existsSync(this.tmpZipFile.path), 'zip exists');
		test.done();
	},

	// Assume the zip is valid if it can be unzipped
	// and the unzipped contents are not empty
	theZipFileIsValid: function(test) {

		test.expect(1);

		var dstPath = this.tmpZipExtractionDir.path;

		fs.createReadStream(this.tmpZipFile.path)
			.pipe(unzip.Extract({ path: dstPath }))
			.on('close', function() {
				var dirList = fs.readdirSync(dstPath);
				test.ok(dirList.length > 0, 'the zip contains files');
				test.done();
			});

	},
	
	theZipFileContainsTheRightFiles: function(test) {

		var dstPath = this.tmpZipExtractionDir.path;
		var txtFileName = this.txtFileName;
		var txtFilePath = path.join(dstPath, txtFileName);
		var txtFileContents = this.txtFileContents;

		fs.createReadStream(this.tmpZipFile.path)
			.pipe(unzip.Extract({ path: dstPath }))
			.on('close', function() {
				
				test.ok(fs.existsSync(txtFilePath), 'txt file exists');
				test.equals(fs.readFileSync(txtFilePath), txtFileContents, 'contents are the same we put in');
				test.done();
			});

	}
};
