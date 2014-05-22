#!/bin/bash

name=$1
if [ -z "$name" ]; then
	name=output;
fi

#ffmpeg -f alsa -i pulse -ab 192 -acodec pcm_s16le -f x11grab -s `xdpyinfo | grep 'dimensions:'|awk '{print $2}'` -r 30 -i :0.0 -sameq $name.mkv

#ffmpeg -f alsa -i pulse -ab 192 -acodec pcm_s16le $name.wav -f x11grab -s `xdpyinfo | grep 'dimensions:'|awk '{print $2}'` -r 30 -i :0.0 -an -vcodec libx264 -preset ultrafast $name.mkv

#ffmpeg -f alsa -i pulse -ab 192 -acodec pcm_s16le $name.wav -f x11grab -s `xdpyinfo | grep 'dimensions:'|awk '{print $2}'` -r 30 -i :0.0 -an -vcodec huffyuv -sameq $name.mkv

ffmpeg -f x11grab -s `xdpyinfo | grep 'dimensions:'|awk '{print $2}'` -r 30 -i :0.0 -an -vcodec huffyuv -sameq $name.mkv
