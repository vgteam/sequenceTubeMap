#!/usr/bin/env bash
set -e

echo "xg file: ${XG}"
echo "gbwt file: ${GBWT}"
echo "gam file: ${GAM}"
echo "region: ${REGION}"
echo "output directory: ${OUTDIR}"

rm -fr $OUTDIR
mkdir -p $OUTDIR

vg chunk -x $XG_FILE -a $GAM_FILE -g -c 20 -p $REGION -T -b $OUTDIR/chunk -E $OUTDIR/regions.tsv > $OUTDIR/chunk.vg
