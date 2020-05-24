#!/usr/bin/env sh

set -e

yarn build

cd dist

git init
git add -A
git commit -m 'deploy'

git push -f git@github.com:cmath10/vue-match-3-game.git master:gh-pages

cd -
