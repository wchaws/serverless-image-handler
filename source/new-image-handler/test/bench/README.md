# Benchmark test

## curl.sh: make http requests to urls in parallel

```
# edit urls.txt

$ ./curl.sh urls.txt
$ N=10 ./curl.sh urls.txt  # make 10 http requests simultaneously
```

## vegeta: http load test tools

install https://github.com/tsenart/vegeta firstly

```
# edit vegeta-urls.txt
cat vegeta-urls.txt | vegeta attack -duration=1m -rate=300  -timeout=300s -format=http | vegeta report
```