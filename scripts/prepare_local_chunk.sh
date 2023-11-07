#!/usr/bin/env bash
set -e

function usage() {
    echo >&2 "${0}: Prepare a tube map chunk and BED line on standard output from a pre-made subgraph. Only supports paths, not haplotypes."
    echo >&2
    echo >&2 "Usage: ${0} -x subgraph.xg -r chr1:1-100 [-d 'Description of region'] [-n 123 [-n 456]] -o chunk-chr1-1-100 [-g mygam1.gam [-g mygam2.gam ...]] >> regions.bed"
    exit 1
}

NODE_COLORS=()

while getopts x:g:r:o:d:n: flag
do
    case "${flag}" in
        x) GRAPH_FILE=${OPTARG};;
        g) GAM_FILES+=("$OPTARG");;
        r) REGION=${OPTARG};;
        o) OUTDIR=${OPTARG};;
        d) DESC="${OPTARG}";;
        n) NODE_COLORS+=("${OPTARG}");;
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
echo >&2 "Node colors: " ${NODE_COLORS[@]}

rm -fr $OUTDIR
mkdir -p $OUTDIR

# Parse the region
REGION_END="$(echo ${REGION} | rev | cut -f1 -d'-' | rev)"
REGION_START="$(echo ${REGION} | rev | cut -f2 -d'-' | cut -f1 -d':' | rev)"
REGION_CONTIG="$(echo ${REGION} | rev| cut -f2- -d':' | rev)"

# get path relative to directory above the scripts directory
GRAPH_FILE_PATH=$(realpath --relative-to $(dirname ${BASH_SOURCE[0]})/../ $GRAPH_FILE)

# construct track JSON for graph file
GRAPH_PALETTE="$(cat "$(dirname ${BASH_SOURCE[0]})/../src/config.json" | jq '.defaultGraphColorPalette')"
jq -n --arg trackFile "${GRAPH_FILE_PATH}" --arg trackType "graph" --argjson trackColorSettings "$GRAPH_PALETTE" '$ARGS.named' >> $OUTDIR/temp.json

# Put the graphy file in place
vg convert -p "${GRAPH_FILE}" > $OUTDIR/chunk.vg
# Start the region BED inside the chunk
printf "${REGION_CONTIG}\t${REGION_START}\t${REGION_END}" > $OUTDIR/regions.tsv


echo >&2 "Gam Files:"
GAM_NUM=0
READ_PALETTE="$(cat "$(dirname ${BASH_SOURCE[0]})/../src/config.json" | jq '.defaultReadColorPalette')"
for GAM_FILE in "${GAM_FILES[@]}"; do
    echo >&2 " - $GAM_FILE"

    GAM_FILE_PATH=$(realpath --relative-to $(dirname ${BASH_SOURCE[0]})/../ $GAM_FILE)
    # construct track JSON for each gam file
    jq -n --arg trackFile "${GAM_FILE_PATH}" --arg trackType "read" --argjson trackColorSettings "$READ_PALETTE" '$ARGS.named' >> $OUTDIR/temp.json
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

# put all tracks objects into an array
(jq -s '.' < $OUTDIR/temp.json) > $OUTDIR/tracks.json

rm $OUTDIR/temp.json

# construct node file
if [[ ! -z "${NODE_COLORS}" ]] ; then
    for NODENAME in "${NODE_COLORS[@]}"; do
        echo >&2 "Highlighted node: $NODENAME"
        printf "$NODENAME\n" >> $OUTDIR/nodeColors.tsv
    done
fi

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

