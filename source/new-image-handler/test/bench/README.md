# Benchmark test

## curl.sh make http requests to urls in parallel

```
# edit urls.txt

$ ./curl.sh urls.txt
$ N=10 ./curl.sh urls.txt  # make 10 http requests simultaneously
```