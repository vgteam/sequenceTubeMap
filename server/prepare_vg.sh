#!/bin/sh

#$vgfile=${1?You need to specify a vg file as the first parameter} 
if [ -z "$1" ]
  then
    echo "You need to specify a vg file as the first parameter"
    exit
fi

echo Generating xg index from vg file
./vg/vg index ./mountedData/$1 -x ./mountedData/$1.xg
