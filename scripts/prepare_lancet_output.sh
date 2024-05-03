#!/usr/bin/env bash
# prepare_lancet_input.sh: Turn a directory of Lancet output into a Tube Map BED file and directory that can be hosted on the web.
set -x

function usage() {
    echo >&2 "${0}: Prepare a directory of Lancet data ."
    echo >&2
    echo >&2 "The input directory should have in it:"
    echo >&2 "- variant_calling_regions.with_calls.bed, an extended BED file with biallelic VCF REF in column 6, ALT in column 7, and INFO in column 9 with a TYPE field"
    echo >&2 "- giraffe_alignments/, a directory with, for each VCF record:"
    echo >&2 "    - <CONTIG>_<START>_<END>.giraffe.gbz"
    echo >&2 "    - normal.<CONTIG>_<START>_<END>.gam"
    echo >&2 "    - tumor.<CONTIG>_<START>_<END>.gam"
    echo >&2 "Note that it is tolerated for the END used in the file names to not match the one used in the BED records."
    echo >&2
    echo >&2 "Usage: ${0} <INPUT_DIR> <OUTPUT_DIR>"
    exit 1
}

INPUT_DIR="${1}"
OUTPUT_DIR="${2}"

if [[ -z "${OUTPUT_DIR}" || -z "${INPUT_DIR}" || ! -d "${INPUT_DIR}" ]] ; then
    usage
fi

# Make all the paths absolute
INPUT_DIR="$(realpath "${INPUT_DIR}")"
OUTPUT_DIR="$(realpath "${OUTPUT_DIR}")"

INPUT_BED="${INPUT_DIR}/variant_calling_regions.with_calls.bed"
INPUT_DATA_DIR="${INPUT_DIR}/giraffe_alignments"

if [[ ! -f "${INPUT_BED}" || ! -d "${INPUT_DATA_DIR}" ]] ; then
    usage
fi


SCRIPTS_DIR="$(dirname "$(realpath "${BASH_SOURCE[0]}")")"

mkdir -p "${OUTPUT_DIR}"

OUTPUT_BED="${OUTPUT_DIR}/index.bed"
rm -f "${OUTPUT_BED}"

# We need to ber in the output directory to use relative paths in the generated BED.
cd "${OUTPUT_DIR}"

while IFS="" read -r INPUT_LINE || [[ -n "${INPUT_LINE}" ]] ; do
    # Read all the lines, even if the newline is missing. See <https://stackoverflow.com/a/1521498>

    # Parse the BED
    CONTIG="$(echo "${INPUT_LINE}" | cut -f1)"
    START_POS="$(echo "${INPUT_LINE}" | cut -f2)"
    END_POS="$(echo "${INPUT_LINE}" | cut -f3)"
    REF_SEQ="$(echo "${INPUT_LINE}" | cut -f6)"
    ALT_SEQ="$(echo "${INPUT_LINE}" | cut -f7)"
    INFO="$(echo "${INPUT_LINE}" | cut -f9)"

    # Fetch out the type (MNP, INS, etc.)
    VARIANT_TYPE="$(echo "${INFO}" | grep -o "TYPE=[A-Z]*" | cut -f2 -d'=')"
    

    # End positions on the variants are not actually the end positions used in
    # the filenames. So find the right graph based only on the start position.
    INPUT_GRAPH="$(find "${INPUT_DATA_DIR}" -name "${CONTIG}_${START_POS}_*.giraffe.gbz")"
    INPUT_GRAPH_BASENAME="$(basename "${INPUT_GRAPH}")"
    SLUG="${INPUT_GRAPH_BASENAME%.giraffe.gbz}"
    
    INPUT_NORMAL_GAM="${INPUT_DATA_DIR}/normal.${SLUG}.gam"
    INPUT_TUMOR_GAM="${INPUT_DATA_DIR}/tumor.${SLUG}.gam"
    
    # Make the chunk directory
    "${SCRIPTS_DIR}/prepare_local_chunk.sh" \
         -x "${INPUT_GRAPH}" \
         -g "${INPUT_NORMAL_GAM}" \
         -p '{"mainPalette": "blues", "auxPalette": "blues"}' \
         -g "${INPUT_TUMOR_GAM}" \
         -p '{"mainPalette": "reds", "auxPalette": "reds"}' \
         -r "${CONTIG}:${START_POS}-${END_POS}" \
         -d "Tumor-specific ${REF_SEQ} -> ${ALT_SEQ} ${VARIANT_TYPE} variant" \
         -o "${SLUG}" \
         >>"${OUTPUT_BED}"

    # We want to hide the path cover paths from Giraffe and only show the paths from the original Lancet GFA
    vg paths --drop-paths --paths-by "path_cover_" -x "${SLUG}/chunk.vg" >"${SLUG}/chunk.vg.new"
    mv "${SLUG}/chunk.vg.new" "${SLUG}/chunk.vg"

done <"${INPUT_BED}"
