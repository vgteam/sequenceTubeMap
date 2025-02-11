#!/usr/bin/env bash
set -e

if [[ -z "${1}" ]]
  then
    echo "You need to specify a vg file as the first parameter"
    exit
fi

echo "${1}"
echo "${1%.vg}"

echo "Generating xg index ${1}.xg from vg file"
vg convert "${1}" -x >"${1}.xg"

if [[ -e "${1%.vg}.vcf.gz" && -e "${1%.vg}.vcf.gz.tbi" ]] ; then
    echo "Generating gbwt index ${1}.gbwt from vg file and VCF"
    vg gbwt -x "${1}" -v "${1%.vg}.vcf.gz" -o "${1}.gbwt"
fi
