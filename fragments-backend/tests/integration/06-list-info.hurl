# Listing, expansion, metadata and per-user isolation
POST {{host}}/v1/fragments
Content-Type: text/markdown
Authorization: Basic {{auth}}
`DynamoDB is **great**.`
HTTP 201
[Asserts]
jsonpath "$.fragment.size" == 22
[Captures]
url: header "Location"
id: jsonpath "$.fragment.id"

GET {{url}}/info
Authorization: Basic {{auth}}
HTTP 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == {{id}}
jsonpath "$.fragment.type" == "text/markdown"
jsonpath "$.fragment.size" == 22
jsonpath "$.fragment.created" isString
jsonpath "$.fragment.updated" isString

# ids only
GET {{host}}/v1/fragments
Authorization: Basic {{auth}}
HTTP 200
[Asserts]
jsonpath "$.fragments" isCollection
jsonpath "$.fragments" contains {{id}}

# expanded metadata
GET {{host}}/v1/fragments?expand=1
Authorization: Basic {{auth}}
HTTP 200
[Asserts]
jsonpath "$.fragments[?(@.id == '{{id}}')].type" contains "text/markdown"
jsonpath "$.fragments[?(@.id == '{{id}}')].size" contains 22

# a different user does not see it
GET {{host}}/v1/fragments
Authorization: Basic {{auth2}}
HTTP 200
[Asserts]
jsonpath "$.fragments" not contains {{id}}

GET {{url}}
Authorization: Basic {{auth2}}
HTTP 404

DELETE {{url}}
Authorization: Basic {{auth}}
HTTP 200

GET {{host}}/v1/fragments
Authorization: Basic {{auth}}
HTTP 200
[Asserts]
jsonpath "$.fragments" not contains {{id}}
