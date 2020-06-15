#!/bin/bash

source env.sh

mustache -p ../templates/header.mustache -p ../templates/footer.mustache $TRACKER_RADAR_PATH/domains/google.com.json ../templates/tracker.mustache > ../docs/trackers/google.com.html
