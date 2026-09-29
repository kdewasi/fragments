# PUT replaces data (same type only); DELETE removes the fragment
POST {{host}}/v1/fragments
Content-Type: text/plain
Authorization: Basic {{auth}}
`Original`
HTTP 201
[Captures]
url: header "Location"
id: jsonpath "$.fragment.id"

PUT {{url}}
Content-Type: text/plain
Authorization: Basic {{auth}}
`Updated content!`
HTTP 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == {{id}}
jsonpath "$.fragment.size" == 16

GET {{url}}
Authorization: Basic {{auth}}
HTTP 200
[Asserts]
body == "Updated content!"

# Changing the type is not allowed
PUT {{url}}
Content-Type: text/markdown
Authorization: Basic {{auth}}
`# nope`
HTTP 400
[Asserts]
jsonpath "$.error.message" contains "does not match"

# Another user cannot update or delete it
PUT {{url}}
Content-Type: text/plain
Authorization: Basic {{auth2}}
`hijack`
HTTP 404

DELETE {{url}}
Authorization: Basic {{auth2}}
HTTP 404

# Unknown fragment
PUT {{host}}/v1/fragments/does-not-exist
Content-Type: text/plain
Authorization: Basic {{auth}}
`x`
HTTP 404

DELETE {{host}}/v1/fragments/does-not-exist
Authorization: Basic {{auth}}
HTTP 404

# Owner deletes it
DELETE {{url}}
Authorization: Basic {{auth}}
HTTP 200
[Asserts]
jsonpath "$.status" == "ok"

GET {{url}}
Authorization: Basic {{auth}}
HTTP 404

GET {{url}}/info
Authorization: Basic {{auth}}
HTTP 404
