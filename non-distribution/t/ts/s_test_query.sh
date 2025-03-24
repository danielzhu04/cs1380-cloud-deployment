#!/bin/bash
# This is a student test

T_FOLDER=${T_FOLDER:-t}
R_FOLDER=${R_FOLDER:-}

cd "$(dirname "$0")/../..$R_FOLDER" || exit 1

DIFF=${DIFF:-diff}

# Test 1: search term with 1 word
term="glob"

cat "$T_FOLDER"/d/s_test_query_global.txt > d/global-index.txt


if $DIFF <(./query.js "$term") <(cat "$T_FOLDER"/d/s_test_query_results.txt) >&2;
then
    echo "$0 success: search results are identical"
else
    echo "$0 failure: search results are not identical"
fi

# Test 2: search term with 2 words
term="glob bypassindex"

cat "$T_FOLDER"/d/s_test_query_global.txt > d/global-index.txt

if $DIFF <(./query.js "$term") <(cat "$T_FOLDER"/d/s_test_query_results2.txt) >&2;
then
    echo "$0 success: search results are identical"
else
    echo "$0 failure: search results are not identical"
fi

# Test 3: search term with 3 words
term="glob bypassindex file"

cat "$T_FOLDER"/d/s_test_query_global.txt > d/global-index.txt

if $DIFF <(./query.js "$term") <(cat "$T_FOLDER"/d/s_test_query_results3.txt) >&2;
then
    echo "$0 success: search results are identical"
else
    echo "$0 failure: search results are not identical"
fi

# Test 4: search term with no results
term="abcdefg"

cat "$T_FOLDER"/d/s_test_query_global.txt > d/global-index.txt

if $DIFF <(./query.js "$term") <(cat "$T_FOLDER"/d/s_test_query_results4.txt) >&2;
then
    echo "$0 success: search results are identical"
else
    echo "$0 failure: search results are not identical"
fi

# Test 5: search term with all uppercase letters + special characters
term="MERG!!!!!"

cat "$T_FOLDER"/d/s_test_query_global.txt > d/global-index.txt

if $DIFF <(./query.js "$term") <(cat "$T_FOLDER"/d/s_test_query_results5.txt) >&2;
then
    echo "$0 success: search results are identical"
else
    echo "$0 failure: search results are not identical"
fi

# Test 6: search term with a stopword (should return all global index data since we'd be searching for "nothing")
term="index"

cat "$T_FOLDER"/d/s_test_query_global.txt > d/global-index.txt

if $DIFF <(./query.js "$term") <(cat "$T_FOLDER"/d/s_test_query_results6.txt) >&2;
then
    echo "$0 success: search results are identical"
    exit 0
else
    echo "$0 failure: search results are not identical"
    exit 1
fi