#!/usr/bin/bash


commitcount=`git rev-list origin/"${GITHUB_BASE_REF}"..."$GITHUB_SHA" | wc -l`
((commitcount=$commitcount-1))

if [ $commitcount -eq 1 ]; then
  echo "There is a commit in this branch"
  exit 0
else
  echo "You must squash your branch"
  echo "You have $commitcount commits"
  exit 1
fi