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

GAM_FILES_STRING=""

echo "Gam Files:"
for GAM_FILE in "${GAM_FILES[@]}"; do
    echo " - $GAM_FILE"

    # Put gam files into string format to be parsed by jq
    GAM_FILES_STRING="$GAM_FILES_STRING$GAM_FILE\n"

    vg_chunk_params=" $vg_chunk_params -a $GAM_FILE"
done

# Call vg chunk
vg chunk $vg_chunk_params > $OUTDIR/chunk.vg

GAM_FILES_JSON=$(printf "$GAM_FILES_STRING" | jq -R '[.]' | jq -n '[inputs[]]')


# Construct tracks JSON, containing all tracks used to create the chunk
JSON_STRING=$(jq -n \
                  --arg graph_file "$XG_FILE" \
                  --arg haplotype_file "$GBWT" \
                  --argjson gam_files "$GAM_FILES_JSON" \
                  '$ARGS.named' )

printf "%s\n" "$JSON_STRING" > $OUTDIR/tracks.json