#!/usr/bin/env bash
set -e

if [[ -z "${1}" ]]
  then
    echo "You need to specify a gam file as the first parameter"
    exit
fi

echo "Generating index from gam file"
./vg/vg index -N "./mountedData/${1}" -d "./mountedData/${1}.index"
