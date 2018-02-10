#!/usr/bin/env bash
set -e

# vg silently fails to put indexes in directories that don't exist
mkdir -p ./out

echo "Generating xg and gbwt indices from vg files"
for f in *.vg
do
	echo "${f}:"
    
    if [[ -e "${f%.vg}.vcf.gz" && -e "${f%.vg}.vcf.gz.tbi" ]]
    then
        # Assume graph was built with alt paths
        vg index "${f}" -v "${f%.vg}.vcf.gz" -x "./out/${f}.xg" --gbwt-name "./out/${f}.gbwt"
    else
        vg index "${f}" -x "./out/${f}.xg"
    fi
done

echo Generating indices from gam files
for f in *.gam
do
	echo "${f}":
	vg index -N "${f}" -d "./out/${f}.index"
done
