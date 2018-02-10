#!/usr/bin/env bash
set -e

mkdir ../backend/internalData

echo "Generating xg and gbwt indices from vg files"
for f in *.vg
do
	echo "${f}:"
    
    if [[ -e "${f%.vg}.vcf.gz" && -e "${f%.vg}.vcf.gz.tbi" ]]
    then
        # Assume graph was built with alt paths
        vg index "${f}" -v "${f%.vg}.vcf.gz" -x "../backend/internalData/${f}.xg" --gbwt-name "../backend/internalData/${f}.gbwt"
    else
        vg index "${f}" -x "../backend/internalData/${f}.xg"
    fi
done

echo "Generating indices from gam files"
for f in *.gam
do
	echo "${f}:"
	vg index -N "${f}" -d "../backend/internalData/${f}.index"
done

