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

if ! command -v jq &> /dev/null
then
    echo "This script requires jq, exiting..."
    exit
fi

echo "XG File: " $XG_FILE
echo "Haplotype File: " $GBWT
echo "Region: " $REGION
echo "Output Directory: " $OUTDIR

rm -fr $OUTDIR
mkdir -p $OUTDIR

vg_chunk_params="-x $XG_FILE -g -c 20 -p $REGION -T -b $OUTDIR/chunk -E $OUTDIR/regions.tsv"

# construct track JSON for xg file
jq -n --arg trackFile "${XG_FILE}" --arg trackType "graph" --argjson trackColorSettings '{"mainPalette": "greys", "auxPalette": "ygreys"}' '$ARGS.named' >> $OUTDIR/tracks.json

# construct track JSON for gbwt file; if not any specific gbwt file, then default would be haplotype
if [[ ! -z "${GBWT}" ]] ; then
    jq -n --arg trackFile "${GBWT}" --arg trackType "haplotype" --argjson trackColorSettings '{"mainPalette": "blues", "auxPalette": "reds"}' '$ARGS.named' >> $OUTDIR/tracks.json
fi

# construct track JSON for each gam file
echo "Gam Files:"
for GAM_FILE in "${GAM_FILES[@]}"; do
    echo " - $GAM_FILE"
    jq -n --arg trackFile "${GAM_FILE}" --arg trackType "read" --argjson trackColorSettings '{"mainPalette": "blues", "auxPalette": "reds"}' '$ARGS.named' >> $OUTDIR/tracks.json
    vg_chunk_params=" $vg_chunk_params -a $GAM_FILE"
done

# Call vg chunk
vg chunk $vg_chunk_params > $OUTDIR/chunk.vg

for file in `ls $OUTDIR/`
do
    printf "$file\n" >> $OUTDIR/chunk_contents.txt
done