#!/bin/sh
set -e

mkdir ../backend/internalData

echo "Generating xg indices from vg files"
for f in *.vg
do
	echo "${f}:"
	vg index "${f}" -x "../backend/internalData/${f}.xg"
done

echo "Generating indices from gam files"
for f in *.gam
do
	echo "${f}:"
	vg index -N "${f}" -d "../backend/internalData/${f}.index"
done

echo "Generating xg/gbwt pairs from FASTA and VCF files"
for f in *.fa
do
    if [ ! -e "${f%.fa}.vcf.gz" ]
    then
        continue
    fi
    
    echo "${f}:"
    vg construct -r "${f}" -v "${f%.fa}.vcf.gz" -a > "../backend/internalData/${f}.vg"
    vg index "../backend/internalData/${f}.vg" -v "${f%.fa}.vcf.gz" -x "../backend/internalData/${f}.xg" --gbwt-name "../backend/internalData/${f}.gbwt"
done
