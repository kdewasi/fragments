# JSON fragments are validated on write
POST {{host}}/v1/fragments
Content-Type: application/json
Authorization: Basic {{auth}}
`{"name": "test", "value": 123}`
HTTP 201
[Asserts]
jsonpath "$.fragment.type" == "application/json"
jsonpath "$.fragment.size" == 30
[Captures]
url: header "Location"

GET {{url}}
Authorization: Basic {{auth}}
HTTP 200
Content-Type: application/json
[Asserts]
body == "{\"name\": \"test\", \"value\": 123}"

# Invalid JSON is rejected
POST {{host}}/v1/fragments
Content-Type: application/json
Authorization: Basic {{auth}}
`{"name": `
HTTP 400
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 400
jsonpath "$.error.message" contains "valid JSON"

# Unsupported Content-Type is rejected
POST {{host}}/v1/fragments
Content-Type: application/octet-stream
Authorization: Basic {{auth}}
`Some binary data`
HTTP 415
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 415
jsonpath "$.error.message" contains "Unsupported Content-Type"

# Missing body is rejected
POST {{host}}/v1/fragments
Content-Type: text/plain
Authorization: Basic {{auth}}
HTTP 400
[Asserts]
jsonpath "$.error.code" == 400
