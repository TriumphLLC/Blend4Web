# Node ini-parser
Parse .ini files

## Install
```
npm install ini-parser
```

## Usage
```js
var parser = require('ini-parser')

parse.parse(String)

parser.parseFile('path/to/file', function(error, data){
	// do something
})

parse.parseFileSync('path/to/file')
```

## Example
```js
var parser = require('ini-parser')

console.log( parser.parseFileSync('rythmbox.desktop') )

{
	"Desktop Entry": {
		"Name": "Rhythmbox",
		"GenericName": "Music Player",
		"X-GNOME-FullName": "Rhythmbox Music Player",
		"Comment": "Play and organize your music collection",
		"Exec": "rhythmbox %U",
		"Terminal": "false",
		"Type": "Application",
		"Icon": "rhythmbox",
		"X-GNOME-DocPath": "rhythmbox/rhythmbox.xml",
		"Categories": "GNOME;GTK;AudioVideo;",
		"MimeType": "application/x-ogg;application/ogg;audio/x-vorbis+ogg;audio/x-scpls;audio/x-mp3;audio/x-mpeg;audio/mpeg;audio/x-mpegurl;audio/x-flac;",
		"Keywords": "Mp3;Audio;CD;MTP;Podcast;DAAP;Playlist;Ipod;",
		"StartupNotify": "true",
		"X-GNOME-Bugzilla-Bugzilla": "GNOME",
		"X-GNOME-Bugzilla-Product": "rhythmbox",
		"X-GNOME-Bugzilla-Component": "general",
		"X-GNOME-Bugzilla-OtherBinaries": "rhythmbox-client;rhythmbox-metadata;",
		"X-GNOME-Bugzilla-Version": "2.96",
		"Actions": "Play;Pause;Next;Previous;",
		"X-Ubuntu-Gettext-Domain": "rhythmbox"
	},
	
	"Desktop Action Play": {
		"Name": "Play",
		"Exec": "rhythmbox-client --play"
	},
	
	"Desktop Action Pause": {
		"Name": "Pause",
		"Exec": "rhythmbox-client --pause"
	},
	
	"Desktop Action Next": {
		"Name": "Next",
		"Exec": "rhythmbox-client --next"
	},
	
	"Desktop Action Previous": {
		"Name": "Previous",
		"Exec": "rhythmbox-client --previous"
	}
}
```
<br>
file rhythmbox.desktop

```ini
[Desktop Entry]
Name=Rhythmbox
GenericName=Music Player
X-GNOME-FullName=Rhythmbox Music Player
Comment=Play and organize your music collection
Exec=rhythmbox %U
Terminal=false
Type=Application
Icon=rhythmbox
X-GNOME-DocPath=rhythmbox/rhythmbox.xml
Categories=GNOME;GTK;AudioVideo;
MimeType=application/x-ogg;application/ogg;audio/x-vorbis+ogg;audio/x-scpls;audio/x-mp3;audio/x-mpeg;audio/mpeg;audio/x-mpegurl;audio/x-flac;
Keywords=Mp3;Audio;CD;MTP;Podcast;DAAP;Playlist;Ipod;
StartupNotify=true
X-GNOME-Bugzilla-Bugzilla=GNOME
X-GNOME-Bugzilla-Product=rhythmbox
X-GNOME-Bugzilla-Component=general
X-GNOME-Bugzilla-OtherBinaries=rhythmbox-client;rhythmbox-metadata;
X-GNOME-Bugzilla-Version=2.96
Actions=Play;Pause;Next;Previous;
X-Ubuntu-Gettext-Domain=rhythmbox

[Desktop Action Play]
Name=Play
Exec=rhythmbox-client --play

[Desktop Action Pause]
Name=Pause
Exec=rhythmbox-client --pause

[Desktop Action Next]
Name=Next
Exec=rhythmbox-client --next

[Desktop Action Previous]
Name=Previous
Exec=rhythmbox-client --previous
```

