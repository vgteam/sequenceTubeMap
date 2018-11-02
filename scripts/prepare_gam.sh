#!/usr/bin/env bash
set -e

if [[ -z "${1}" ]]
  then
    echo "You need to specify a gam file as the first parameter"
    exit
fi

echo "Generating index from gam file"
NO_EXTENSION=${1%.gam}
vg gamsort -i "${NO_EXTENSION}.sorted.gam.gai" "${NO_EXTENSION}.gam" > "${NO_EXTENSION}.sorted.gam"
