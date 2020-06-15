#!/bin/bash

source env.sh

mustache $TRACKER_RADAR_PATH/domains/google.com.json -p ../templates/header.mustache -p ../templates/footer.mustache ../templates/tracker.mustache > ../docs/trackers/google.com.html
