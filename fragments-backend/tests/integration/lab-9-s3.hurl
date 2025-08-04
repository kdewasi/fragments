# Lab 9 S3 Integration Test - Complete Flow
# 1. POST a new text fragment
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d

`Hello S3!`

HTTP/1.1 201
Content-Type: application/json; charset=utf-8

[Asserts]
jsonpath "$.status" == "ok"
header "Location" != null

# 2. Capture the Location header for the next requests
[Captures]
url: header "Location"

# 3. GET the fragment to verify it was created
GET {{url}}
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d

HTTP/1.1 200
Content-Type: text/plain

[Asserts]
header "Content-Type" == "text/plain"
body == "Hello S3!"

# 4. DELETE the fragment
DELETE {{url}}
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d

HTTP/1.1 200
Content-Type: application/json; charset=utf-8

[Asserts]
jsonpath "$.status" == "ok"

# 5. Try to GET the fragment again - should return 404
GET {{url}}
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d

HTTP/1.1 404
