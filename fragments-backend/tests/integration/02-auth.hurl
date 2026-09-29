# Every /v1 route requires credentials
GET {{host}}/v1/fragments
HTTP 401
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 401
jsonpath "$.error.message" == "Unauthorized"

POST {{host}}/v1/fragments
Content-Type: text/plain
`Unauthenticated fragment`
HTTP 401
[Asserts]
jsonpath "$.error.message" == "Unauthorized"

# Wrong password
GET {{host}}/v1/fragments
Authorization: Basic {{badauth}}
HTTP 401

# Good credentials
GET {{host}}/v1/fragments
Authorization: Basic {{auth}}
HTTP 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragments" isCollection
