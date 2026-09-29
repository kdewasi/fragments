# Create a plain text fragment and read it back
POST {{host}}/v1/fragments
Content-Type: text/plain
Authorization: Basic {{auth}}
`This is a fragment!`
HTTP 201
[Asserts]
header "Location" matches "^https?://.+/v1/fragments/[0-9a-fA-F-]{36}$"
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" matches "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
# ownerId is a sha256 hex hash, never the email
jsonpath "$.fragment.ownerId" matches "^[0-9a-f]{64}$"
jsonpath "$.fragment.created" isString
jsonpath "$.fragment.updated" isString
jsonpath "$.fragment.type" == "text/plain"
jsonpath "$.fragment.size" == 19
[Captures]
url: header "Location"

GET {{url}}
Authorization: Basic {{auth}}
HTTP 200
Content-Type: text/plain
Content-Length: 19
[Asserts]
body == "This is a fragment!"

# The charset parameter is stored and returned verbatim
POST {{host}}/v1/fragments
Content-Type: text/plain; charset=utf-8
Authorization: Basic {{auth}}
`Fragment with charset`
HTTP 201
[Asserts]
jsonpath "$.fragment.type" == "text/plain; charset=utf-8"
jsonpath "$.fragment.size" == 21
[Captures]
charset_url: header "Location"

GET {{charset_url}}
Authorization: Basic {{auth}}
HTTP 200
Content-Type: text/plain; charset=utf-8
[Asserts]
body == "Fragment with charset"
