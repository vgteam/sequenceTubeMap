#!/bin/sh

echo Generating xg indices from vg files
for f in *.vg
do
	echo $f:
	vg index $f -x ./out/$f.xg
done

echo Generating indices from gam files
for f in *.gam
do
	echo $f:
	vg index -N $f -d ./out/$f.index
done
