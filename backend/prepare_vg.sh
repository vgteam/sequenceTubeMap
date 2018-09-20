#!/usr/bin/env bash
set -e

#$vgfile=${1?You need to specify a vg file as the first parameter} 
if [[ -z "${1}" ]]
  then
    echo "You need to specify a vg file as the first parameter"
    exit
fi

if [[ -e "./mountedData/${1%.vg}.vcf.gz" && -e "./mountedData/${1%.vg}.vcf.gz.tbi" ]]
then
    echo "Generating xg index and gbwt index from vg file and VCF"
    ./vg/vg index "./mountedData/${1}" -v "./mountedData/${1%.vg}.vcf.gz" -x "./mountedData/${1}.xg" --gbwt-name "./mountedData/${1}.gbwt"
else
    echo "Generating xg index from vg file"
    ./vg/vg index "./mountedData/${1}" -x "./mountedData/${1}.xg"
fi
