#!/usr/bin/env bash
set -e

function usage() {
    echo >&2 "${0}: Prepare a tube map chunk and BED line on standard output from a pre-made subgraph. Only supports paths, not haplotypes."
    echo >&2
    echo >&2 "Usage: ${0} -x subgraph.xg -r chr1:1-100 [-d 'Description of region'] -o chunk-chr1-1-100 [-g mygam1.gam [-g mygam2.gam ...]] >> regions.bed"
    exit 1
}

while getopts x:g:r:o:d: flag
do
    case "${flag}" in
        x) GRAPH_FILE=${OPTARG};;
        g) GAM_FILES+=("$OPTARG");;
        r) REGION=${OPTARG};;
        o) OUTDIR=${OPTARG};;
        d) DESC="${OPTARG}";;
        *)
            usage
            ;;

    esac
done

if ! command -v jq &> /dev/null
then
    echo >&2 "This script requires jq, exiting..."
    exit 1
fi

if [[ -z "${REGION}" ]] ; then
    echo >&2 "You must specify a region with -r"
    echo >&2
    usage
fi

if [[ -z "${GRAPH_FILE}" ]] ; then
    echo >&2 "You must specify a graph with -x"
    echo >&2
    usage
fi

if [[ -z "${OUTDIR}" ]] ; then
    echo >&2 "You must specify an output directory with -o"
    echo >&2
    usage
fi

if [[ -z "${DESC}" ]] ; then
    DESC="Region ${REGION}"
fi

echo >&2 "Graph File: " $GRAPH_FILE
echo >&2 "Region: " $REGION
echo >&2 "Output Directory: " $OUTDIR

rm -fr $OUTDIR
mkdir -p $OUTDIR

# Parse the region
REGION_END="$(echo ${REGION} | rev | cut -f1 -d'-' | rev)"
REGION_START="$(echo ${REGION} | rev | cut -f2 -d'-' | cut -f1 -d':' | rev)"
REGION_CONTIG="$(echo ${REGION} | rev| cut -f2- -d':' | rev)"

# construct track JSON for graph file
jq -n --arg trackFile "${GRAPH_FILE}" --arg trackType "graph" --argjson trackColorSettings '{"mainPalette": "plainColors", "auxPalette": "greys"}' '$ARGS.named' >> $OUTDIR/tracks.json

# Put the graphy file in place
vg convert -p "${GRAPH_FILE}" > $OUTDIR/chunk.vg
# Start the region BED inside the chunk
printf "${REGION_CONTIG}\t${REGION_START}\t${REGION_END}" > $OUTDIR/regions.tsv


echo >&2 "Gam Files:"
GAM_NUM=0
for GAM_FILE in "${GAM_FILES[@]}"; do
    echo >&2 " - $GAM_FILE"
    # construct track JSON for each gam file
    jq -n --arg trackFile "${GAM_FILE}" --arg trackType "read" --argjson trackColorSettings '{"mainPalette": "blues", "auxPalette": "reds"}' '$ARGS.named' >> $OUTDIR/tracks.json
    # Work out a chunk-internal GAM name with the same leading numbering vg chunk uses
    if [[ "${GAM_NUM}" == "0" ]] ; then
        GAM_LEADER="chunk"
    else
        GAM_LEADER="chunk-${GAM_NUM}"
    fi
    GAM_CHUNK_NAME="${OUTDIR}/${GAM_LEADER}_0_${REGION_CONTIG}_${REGION_START}_${REGION_END}.gam"
    # Put the chunk in place
    cp "${GAM_FILE}" "${GAM_CHUNK_NAME}"
    # List it in the regions TSV like vg would
    printf "\t$(basename "${GAM_CHUNK_NAME}")" >> $OUTDIR/regions.tsv
    GAM_NUM=$((GAM_NUM + 1))
done

# Make the empty but required annotation file. We have no haplotypes to put in it.
touch "${OUTDIR}/chunk_0_${REGION_CONTIG}_${REGION_START}_${REGION_END}.annotate.txt"
printf "\tchunk_0_${REGION_CONTIG}_${REGION_START}_${REGION_END}.annotate.txt\n" >> $OUTDIR/regions.tsv

for file in `ls $OUTDIR/`
do
    printf "$file\n" >> $OUTDIR/chunk_contents.txt
done

# Print BED line
cat $OUTDIR/regions.tsv | cut -f1-3 | tr -d "\n"
printf "\t${DESC}\t${OUTDIR}\n"

