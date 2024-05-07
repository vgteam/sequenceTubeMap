#!/usr/bin/env bash
# prepare_lancet_input.sh: Turn a directory of Lancet output into a Tube Map BED file and directory that can be hosted on the web.

function usage() {
    echo >&2 "${0}: Prepare a directory of Lancet data ."
    echo >&2
    echo >&2 "The input directory should have in it:"
    echo >&2 "- variant_calling_regions.with_calls.bed, an extended BED file with biallelic VCF REF in column 6, ALT in column 7, and INFO in column 9 with a TYPE field"
    echo >&2 "- giraffe_alignments/, a directory with, for each VCF record:"
    echo >&2 "    - <CONTIG>_<START>_<END>.giraffe.gbz"
    echo >&2 "    - normal.<CONTIG>_<START>_<END>.gam"
    echo >&2 "    - tumor.<CONTIG>_<START>_<END>.gam"
    echo >&2 "The ranges in the file named will not correspond exactly to those in the BED records; files for a range overlapping and centered on the BED record will be used."
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
    # These are 0-based, end-exclusive coordinates
    START_BED_POS="$(echo "${INPUT_LINE}" | cut -f2)"
    END_BED_POS="$(echo "${INPUT_LINE}" | cut -f3)"
    REF_SEQ="$(echo "${INPUT_LINE}" | cut -f6)"
    ALT_SEQ="$(echo "${INPUT_LINE}" | cut -f7)"
    INFO="$(echo "${INPUT_LINE}" | cut -f9)"

    # Compute 1-based, end-inclusive coordinates
    START_POS=$((START_BED_POS+1))
    END_POS="${END_BED_POS}"

    # Fetch out the type (MNP, INS, etc.)
    VARIANT_TYPE="$(echo "${INFO}" | grep -o "TYPE=[A-Z]*" | cut -f2 -d'=')"

    # Find the best overlapping graph file.
    # These are the 1-based, end-exclusive coordinates from the filenames
    BEST_START=""
    BEST_END=""
    # These are the 0-based, end-exclusive coordinates
    BEST_BED_START=""
    BEST_BED_END=""
    # This is how many more bases are on one side fo the variant than are on the other
    BEST_UNEVENNESS=""

    CANDIDATES=("${INPUT_DATA_DIR}/${CONTIG}_"*".giraffe.gbz")
    for GRAPH_FILE in "${CANDIDATES[@]}" ; do
        GRAPH_BASENAME="$(basename "${GRAPH_FILE}")"
        # Work out the region this graph covers. Remember to convert to 1-based
        GRAPH_START="$(echo "${GRAPH_BASENAME%.giraffe.gbz}" | cut -f2 -d'_')"
        GRAPH_END="$(echo "${GRAPH_BASENAME%.giraffe.gbz}" | cut -f3 -d'_')"

        # Convert to 0-based, end-exclusive
        GRAPH_BED_START=$((GRAPH_START-1))
        GRAPH_BED_END="${GRAPH_END}"

        BEFORE_BASES=$((START_BED_POS-GRAPH_BED_START))
        AFTER_BASES=$((GRAPH_BED_END-END_BED_POS))
        if [[ "${BEFORE_BASES}" -lt 0 || "${AFTER_BASES}" -lt 0 ]] ; then
            # This graph does not overlap the variant we are working on
            continue
        fi

        # Work out how uneven the centering is
        if [[ "${BEFORE_BASES}" -gt "${AFTER_BASES}" ]] ; then
            UNEVENNESS=$((BEFORE_BASES-AFTER_BASES))
        else
            UNEVENNESS=$((AFTER_BASES-BEFORE_BASES))
        fi

        if [[ -z "${BEST_UNEVENNESS}" || "${BEST_UNEVENNESS}" -gt "${UNEVENNESS}" ]] ; then
            # This is the best graph so far
            BEST_START="${GRAPH_START}"
            BEST_END="${GRAPH_END}"
            BEST_BED_START="${GRAPH_BED_START}"
            BEST_BED_END="${GRAPH_BED_END}"
            BEST_UNEVENNESS="${UNEVENNESS}"
        fi
    done

    if [[ -z "${BEST_START}" ]] ; then
        echo >&2 "No graph in ${INPUT_DATA_DIR} overlaps the variant ${INPUT_LINE}"
        exit 1
    fi

    # Find the best graph again
    INPUT_GRAPH="$(find "${INPUT_DATA_DIR}" -name "${CONTIG}_${BEST_START}_${BEST_END}.giraffe.gbz")"
    INPUT_GRAPH_BASENAME="$(basename "${INPUT_GRAPH}")"
    SLUG="${INPUT_GRAPH_BASENAME%.giraffe.gbz}"
    
    INPUT_NORMAL_GAM="${INPUT_DATA_DIR}/normal.${SLUG}.gam"
    INPUT_TUMOR_GAM="${INPUT_DATA_DIR}/tumor.${SLUG}.gam"
    
    # Make the chunk directory. Remember to use a 1-based, end-inclusive range and description coordinates.
    "${SCRIPTS_DIR}/prepare_local_chunk.sh" \
         -x "${INPUT_GRAPH}" \
         -g "${INPUT_NORMAL_GAM}" \
         -p '{"mainPalette": "blues", "auxPalette": "blues"}' \
         -g "${INPUT_TUMOR_GAM}" \
         -p '{"mainPalette": "reds", "auxPalette": "reds"}' \
         -r "${CONTIG}:${BEST_START}-${BEST_END}" \
         -d "Tumor-specific ${REF_SEQ} -> ${ALT_SEQ} ${VARIANT_TYPE} variant at ${CONTIG}:${START_POS}" \
         -o "${SLUG}" \
         >>"${OUTPUT_BED}"

    # We want to hide the path cover paths from Giraffe and only show the paths from the original Lancet GFA
    vg paths --drop-paths --paths-by "path_cover_" -x "${SLUG}/chunk.vg" >"${SLUG}/chunk.vg.new"
    mv "${SLUG}/chunk.vg.new" "${SLUG}/chunk.vg"

done <"${INPUT_BED}"
