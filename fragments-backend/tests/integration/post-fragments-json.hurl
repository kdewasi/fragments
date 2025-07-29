# Test JSON fragment creation
POST http://localhost:8080/v1/fragments
Content-Type: application/json
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d
`{"name": "test", "value": 123}`

# We expect to get back an HTTP 201
HTTP/1.1 201

[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "application/json"
jsonpath "$.fragment.size" == 30

[Captures]
url: header "Location"

# Try to GET the JSON fragment we just posted
GET {{url}}
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d

HTTP/1.1 200
Content-Type: application/json
[Asserts]
body == "{\"name\": \"test\", \"value\": 123}" 
