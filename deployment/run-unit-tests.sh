#!/bin/bash
#
# This assumes all of the OS-level configuration has been completed and git repo has already been cloned
#
# This script should be run from the repo's deployment directory
# cd deployment
# ./run-unit-tests.sh
#

# Get reference for all important folders
template_dir="$PWD"
source_dir="$template_dir/../source"

echo "------------------------------------------------------------------------------"
echo "[Init] Clean old dist and node_modules folders"
echo "------------------------------------------------------------------------------"
echo "find $source_dir/services -iname "node_modules" -type d -exec rm -r "{}" \; 2> /dev/null"
find $source_dir/services -iname "node_modules" -type d -exec rm -r "{}" \; 2> /dev/null
echo "find $source_dir/services -iname "dist" -type d -exec rm -r "{}" \; 2> /dev/null"
find $source_dir/services -iname "dist" -type d -exec rm -r "{}" \; 2> /dev/null
echo "find ../ -type f -name 'package-lock.json' -delete"
find $source_dir/services -type f -name 'package-lock.json' -delete
echo "find $source_dir/resources -iname "node_modules" -type d -exec rm -r "{}" \; 2> /dev/null"
find $source_dir/resources -iname "node_modules" -type d -exec rm -r "{}" \; 2> /dev/null
echo "find $source_dir/resources -iname "dist" -type d -exec rm -r "{}" \; 2> /dev/null"
find $source_dir/resources -iname "dist" -type d -exec rm -r "{}" \; 2> /dev/null
echo "find ../ -type f -name 'package-lock.json' -delete"
find $source_dir/resources -type f -name 'package-lock.json' -delete
echo "find $source_dir/simulator -iname "node_modules" -type d -exec rm -r "{}" \; 2> /dev/null"
find $source_dir/simulator -iname "node_modules" -type d -exec rm -r "{}" \; 2> /dev/null
echo "find $source_dir/simulator -iname "dist" -type d -exec rm -r "{}" \; 2> /dev/null"
find $source_dir/simulator -iname "dist" -type d -exec rm -r "{}" \; 2> /dev/null
echo "find ../ -type f -name 'package-lock.json' -delete"
find $source_dir/simulator -type f -name 'package-lock.json' -delete

echo "------------------------------------------------------------------------------"
echo "[Test] rest-api-handler"
echo "------------------------------------------------------------------------------"
cd $source_dir/rest-api-handler
npm install
npm test

echo "------------------------------------------------------------------------------"
echo "[Test] solution-helper"
echo "------------------------------------------------------------------------------"
cd $source_dir/solution-helper
npm install
npm test

echo "------------------------------------------------------------------------------"
echo "[Test] stream-processor"
echo "------------------------------------------------------------------------------"
cd $source_dir/stream-processor
npm install
npm test
