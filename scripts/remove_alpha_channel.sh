#!/bin/bash

# remove alpha chanel from rgba image
for file in "$@"
do
    echo Removing alpha $file
    convert $file -background white -alpha remove $file
    convert $file PNG24:$file
done
