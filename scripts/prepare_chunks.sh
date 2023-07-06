#!/usr/bin/env bash
set -e


while getopts x:h:g:r:o: flag
do
    case "${flag}" in
        x) XG_FILE=${OPTARG};;
        h) GBWT=${OPTARG};;
        g) GAM_FILES+=("$OPTARG");;
        r) REGION=${OPTARG};;
        o) OUTDIR=${OPTARG};;
    esac
done

echo "XG File: " $XG_FILE
echo "Haplotype File: " $GBWT
echo "Region: " $REGION
echo "Output Directory: " $OUTDIR

rm -fr $OUTDIR
mkdir -p $OUTDIR

vg_chunk_params="-x $XG_FILE -g -c 20 -p $REGION -T -b $OUTDIR/chunk -E $OUTDIR/regions.tsv"

echo "Gam Files:"
for GAM_FILE in "${GAM_FILES[@]}"; do
    echo " - $GAM_FILE"
    vg_chunk_params=" $vg_chunk_params -a $GAM_FILE"
done

echo $vg_chunk_params

vg chunk $vg_chunk_params > $OUTDIR/chunk.vg
