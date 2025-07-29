# Test content type with charset
POST http://localhost:8080/v1/fragments
Content-Type: text/plain; charset=utf-8
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d
`Fragment with charset`

# We expect to get back an HTTP 201
HTTP/1.1 201

[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/plain; charset=utf-8"
jsonpath "$.fragment.size" == 21

[Captures]
url: header "Location"

# Try to GET the fragment we just posted
GET {{url}}
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d

HTTP/1.1 200
Content-Type: text/plain; charset=utf-8
[Asserts]
body == "Fragment with charset" 
