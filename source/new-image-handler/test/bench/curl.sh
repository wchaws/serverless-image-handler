#!/usr/bin/env bash
# ./curl.sh urls.txt 2

URLS=$1
N=${2:-2}

echo "request ${N} urls in parallel"
printf "time_total(sec)\thttp_code\tsize_download(bytes)\turl\n"
grep -v '^#' ${URLS} | xargs -P ${N} -I {} curl -s "{}" -o /dev/null -w "%{time_total}\t%{http_code}\t%{size_download}\t{}\n"