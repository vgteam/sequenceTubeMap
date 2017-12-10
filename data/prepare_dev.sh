#!/bin/sh

mkdir ../backend/internalData

echo Generating xg indices from vg files
for f in *.vg
do
	echo $f:
	vg index $f -x ../backend/internalData/$f.xg
done

echo Generating indices from gam files
for f in *.gam
do
	echo $f:
	vg index -N $f -d ../backend/internalData/$f.index
done
