#!/usr/bin/env bash

# This script deletes files which have been uploaded via the web app to the
#  ./uploads folder and which are older than 1 hour. This prevents the
# folder from accumulating unnecessary files.
# Automatically run this script periodically by adding a line to your
# crontab. Run 'crontab -e' and add the following line to run the script
# hourly (replace correct path and remove "):
# "0 * * * * bash [substitute your path here]/sequenceTubeMap/scripts/deleteOldUploads.sh"

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
cd "${DIR}/../uploads"
touch -d '-1 hour' limit
for f in ./*;
do
  if [ limit -nt "${f}" ]; then
      rm "${f}"
  fi
done