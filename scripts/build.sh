#!/bin/bash

source env.sh

domain_pat='.*\/(.*)\.json$'

# Shamelessly ripped from: https://stackoverflow.com/questions/238073/how-to-add-a-progress-bar-to-a-shell-script
function ProgressBar {
    # Process data
    let _progress=(${1}*100/${2}*100)/100
    let _done=(${_progress}*4)/10
    let _left=40-$_done
    # Build progressbar string lengths
    _fill=$(printf "%${_done}s")
    _empty=$(printf "%${_left}s")

    # 1.2 Build progressbar strings and print the ProgressBar line
    # 1.2.1 Output example:                           
    # 1.2.1.1 Progress: [########################################] 100%
    printf "\rProgress: [${_fill// /#}${_empty// /-}] ${_progress}%%"

}

tracker_count=$(ls $TRACKER_RADAR_PATH/domains | wc -l)
counter=0

mkdir -p ../docs/trackers

echo "Generating tracker html files. Sit back for a bit..."

ProgressBar ${counter} ${tracker_count}
for filename in $TRACKER_RADAR_PATH/domains/*.json; do
    [[ "$filename" =~ $domain_pat ]]
    mustache -p ../templates/header.mustache -p ../templates/footer.mustache $filename ../templates/tracker.mustache > ../docs/trackers/${BASH_REMATCH[1]}.html
    counter=$((counter + 1))
    ProgressBar ${counter} ${tracker_count}
done
