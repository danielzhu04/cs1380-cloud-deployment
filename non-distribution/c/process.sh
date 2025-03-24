#!/bin/bash

# Convert input to a stream of non-stopword terms
# Usage: ./process.sh < input > output

# Convert each line to one word per line, **remove non-letter characters**, make lowercase, convert to ASCII; then remove stopwords (inside d/stopwords.txt)
# Commands that will be useful: tr, iconv, grep

while read -r line || [[ -n "$line" ]]; do
    if [[ -n "$line" ]]; then
        special_char_spaces=$(echo "$line" | tr -cs '[:alnum:]' ' ')
        no_spaces=$(echo "$special_char_spaces" | tr '[:space:]' '\n')
        only_letters=$(echo "$no_spaces" | tr -cd '[:alpha:]\n')
        lowercase=$(echo "$only_letters" | tr '[:upper:]' '[:lower:]')
        to_ascii=$(echo "$lowercase" | iconv -t ASCII//TRANSLIT)
        no_stopwords=$(echo "$to_ascii" | grep -Fvwf "d/stopwords.txt" )

        echo "$no_stopwords"
    fi
done