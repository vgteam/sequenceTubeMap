#!/usr/bin/env bash
set -e

if [[ -z "${1}" ]]
  then
    echo "You need to specify a gam file as the first parameter"
    exit
fi

echo "Generating index from gam file"
./vg/vg index -N "./mountedData/${1}" -d "./mountedData/${1}.index"
NO_EXTENSION=${1%.gam}
./vg/vg gamsort -i "./mountedData/${NO_EXTENSION}.sorted.gam.gai" "./mountedData/${NO_EXTENSION}.gam" > "./mountedData/${NO_EXTENSION}.sorted.gam"