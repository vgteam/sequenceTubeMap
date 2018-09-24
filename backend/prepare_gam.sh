#!/usr/bin/env bash
set -e

if [[ -z "${1}" ]]
  then
    echo "You need to specify a gam file as the first parameter"
    exit
fi

echo "Generating index from gam file"
NO_EXTENSION=${1%.gam}
./vg/vg gamsort -i "./mountedData/${NO_EXTENSION}.sorted.gam.gai" "./mountedData/${NO_EXTENSION}.gam" > "./mountedData/${NO_EXTENSION}.sorted.gam"
