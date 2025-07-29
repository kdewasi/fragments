# Lab 9 S3 Integration Test - Fixed Authentication
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d

`Hello S3!`

HTTP/1.1 201
Content-Type: application/json; charset=utf-8

[Asserts]
jsonpath "$.status" == "ok"
