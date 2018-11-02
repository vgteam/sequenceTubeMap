#!/usr/bin/env bash
set -e

if [[ -z "${1}" ]]
  then
    echo "You need to specify a vg file as the first parameter"
    exit
fi

echo "${1}"
echo "${1%.vg}"

if [[ -e "${1%.vg}.vcf.gz" && -e "${1%.vg}.vcf.gz.tbi" ]]
then
    echo "Generating xg index and gbwt index from vg file and VCF"
    vg index "${1}" -v "${1%.vg}.vcf.gz" -x "${1}.xg" --gbwt-name "${1}.gbwt"
else
    echo "Generating xg index from vg file"
    vg index "${1}" -x "${1}.xg"
fi
