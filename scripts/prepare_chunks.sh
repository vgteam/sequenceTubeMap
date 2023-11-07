#!/usr/bin/env bash
set -e
set -x

function usage() {
    echo >&2 "${0}: Extract graph and read chunks for a region, producing a referencing line for a BED file on standard output"
    echo >&2
    echo >&2 "Usage: ${0} -x mygraph.xg [-h mygraph.gbwt] -r chr1:1-100 [-d 'Description of region'] [-n 123 [-n 456]] -o chunk-chr1-1-100 [-g mygam1.gam [-g mygam2.gam ...]] >> regions.bed"
    exit 1
}

NODE_COLORS=()

while getopts x:h:g:r:o:d:n: flag
do
    case "${flag}" in
        x) GRAPH_FILE=${OPTARG};;
        h) HAPLOTYPE_FILE=${OPTARG};;
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
echo >&2 "Haplotype File: " $HAPLOTYPE_FILE
echo >&2 "Region: " $REGION
echo >&2 "Output Directory: " $OUTDIR
echo >&2 "Node colors: " ${NODE_COLORS[@]}

rm -fr $OUTDIR
mkdir -p $OUTDIR

vg_chunk_params=(-x $GRAPH_FILE -g -c 20 -p $REGION -T -b $OUTDIR/chunk -E $OUTDIR/regions.tsv)


# construct track JSON for graph file
# get path relative to directory above the scripts directory
GRAPH_FILE_PATH=$(realpath --relative-to $(dirname ${BASH_SOURCE[0]})/../ $GRAPH_FILE)
echo ${GRAPH_FILE_PATH}
GRAPH_PALETTE="$(cat " $(dirname ${BASH_SOURCE[0]})/../src/config.json" | jq '.defaultGraphColorPalette')"
jq -n --arg trackFile "${GRAPH_FILE_PATH}" --arg trackType "graph" --argjson trackColorSettings "$GRAPH_PALETTE" '$ARGS.named' >> $OUTDIR/temp.json

# construct track JSON for haplotype file, if provided
HAPLOTYPE_PALETTE="$(cat "$(dirname ${BASH_SOURCE[0]})/../src/config.json" | jq '.defaultHaplotypeColorPalette')"
if [[ ! -z "${HAPLOTYPE_FILE}" ]] ; then
    HAPLOTYPE_FILE_PATH=$(realpath --relative-to $(dirname ${BASH_SOURCE[0]})/../ $HAPLOTYPE_FILE)
    echo ${HAPLOTYPE_FILE_PATH}
    jq -n --arg trackFile "${HAPLOTYPE_FILE_PATH}" --arg trackType "haplotype" --argjson trackColorSettings "$HAPLOTYPE_PALETTE" '$ARGS.named' >> $OUTDIR/temp.json
fi

# construct track JSON for each gam file
echo >&2 "Gam Files:"
READ_PALETTE="$(cat "$(dirname ${BASH_SOURCE[0]})/../src/config.json" | jq '.defaultReadColorPalette')"
echo >&2 "Read Palette: $READ_PALETTE"
for GAM_FILE in "${GAM_FILES[@]}"; do
    GAM_FILE_PATH=$(realpath --relative-to $(dirname ${BASH_SOURCE[0]})/../ $GAM_FILE)
    echo >&2 " - $GAM_FILE_PATH"
    jq -n --arg trackFile "${GAM_FILE_PATH}" --arg trackType "read" --argjson trackColorSettings "$READ_PALETTE" '$ARGS.named' >> $OUTDIR/temp.json
    vg_chunk_params+=(-a $GAM_FILE)
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

# Call vg chunk
vg chunk "${vg_chunk_params[@]}" > $OUTDIR/chunk.vg

for file in `ls $OUTDIR/`
do
    printf "$file\n" >> $OUTDIR/chunk_contents.txt
done

# Print BED line
cat $OUTDIR/regions.tsv | cut -f1-3 | tr -d "\n"
printf "\t${DESC}\t${OUTDIR}\n"
