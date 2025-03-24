#!/bin/bash
# This is a student test

DIFF_PERCENT=${DIFF_PERCENT:-0}

# create file inline
LOCAL_INDEX_FILE="$(
cat << EOF
test | 2 | https://test/local/url/index.html
test merg | 1 | https://test/local/url/index.html
merg | 1 | https://test/local/url/index.html
index file | 3 | https://test/local/url/index.html
EOF
)"

INITIAL_GLOBAL_INDEX_FILE="$(
cat << EOF
test glob index | https://test/global/url/index.html 1
glob index file | https://test/global/url/index.html 1
test glob | https://test/global/url/index.html 2
glob index | https://test/global/url/index.html 2
index file | https://test/global/url/index.html 2
test | https://test/global/url/index.html 4
glob | https://test/global/url/index.html 3
index | https://test/global/url/index.html 1
file | https://test/global/url/index.html 2
EOF
)"

cd "$(dirname "$0")/../.." || exit 1

NEW_GLOBAL_INDEX_FILE="$(
    echo "$LOCAL_INDEX_FILE" | ./c/merge.js <(echo "$INITIAL_GLOBAL_INDEX_FILE") | sort
)"

EXPECTED_GLOBAL_INDEX_FILE="$(
cat << EOF
file | https://test/global/url/index.html 2
glob index file | https://test/global/url/index.html 1
glob index | https://test/global/url/index.html 2
glob | https://test/global/url/index.html 3
index file | https://test/local/url/index.html 3 https://test/global/url/index.html 2
index | https://test/global/url/index.html 1
merg | https://test/local/url/index.html 1
test glob index | https://test/global/url/index.html 1
test glob | https://test/global/url/index.html 2
test merg | https://test/local/url/index.html 1
test | https://test/global/url/index.html 4 https://test/local/url/index.html 2
EOF
)"

if DIFF_PERCENT=$DIFF_PERCENT ./t/gi-diff.js <(echo "$NEW_GLOBAL_INDEX_FILE") <(echo "$EXPECTED_GLOBAL_INDEX_FILE") >&2
then
    echo "$0 success: global indexes are identical"
    exit 0
else
    echo "$0 failure: global indexes are not identical"
    exit 1
fi
