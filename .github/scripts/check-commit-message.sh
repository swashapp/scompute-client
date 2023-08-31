#!/usr/bin/bash

commitmessage=`git log -n 1 --skip 1 --pretty=%B`
pattern="^(revert: )?(feat|fix|docs|style|refactor|test|chore|build|ci|perf|content)(\(.+\))?: [[:print:]]{1,80}[[:space:]]{0,2}[[:print:][:space:]]+$"

echo "------- last commit message is -------"
echo -e $commitmessage
echo "--------------------------------------"


[[ $commitmessage =~ $pattern ]] && (echo "commit message is ok" && exit 0) || (echo "commit message is wrong" &&exit 1)