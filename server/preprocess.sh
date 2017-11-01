#!/bin/sh

#$vgfile=${1?You need to specify a vg file as the first parameter}
if [ -z "$1" ]
  then
    echo "You need to specify a vg file as the first parameter"
    exit
fi

if [ -z "S2" ]
  then
    echo "You need to specify a gam file as the second parameter"
    exit
fi

echo Generating xg index from vg file
./vg/vg index ./mountedData/$1 -x ./mountedData/$1.xg

echo Generating index from gam file
./vg/vg index -N ./mountedData/$2 -d ./mountedData/$2.index
