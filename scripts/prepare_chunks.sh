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

GAM_FILES_JSON=""

echo "Gam Files:"
for GAM_FILE in "${GAM_FILES[@]}"; do
    echo " - $GAM_FILE"

    # Put gam files into array format
    if [ -z "$GAM_FILES_JSON" ]
    then
        GAM_FILES_JSON="$GAM_FILE"
    else
        GAM_FILES_JSON="$GAM_FILES_JSON, $GAM_FILE"
    fi

    vg_chunk_params=" $vg_chunk_params -a $GAM_FILE"
done


# Call vg chunk
vg chunk $vg_chunk_params > $OUTDIR/chunk.vg

# Cosntruct JSON
JSON_STRING=$(jq -n \
                  --arg graph_file "$XG_FILE" \
                  --arg haplotype_file "$GBWT" \
                  --arg gam_files "[$GAM_FILES_JSON]" \
                  '$ARGS.named' )

printf "%s\n" "$JSON_STRING" > $OUTDIR/tracks.json


