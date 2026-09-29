# Unknown routes return a JSON 404
GET {{host}}/no-such-route
HTTP 404
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 404
jsonpath "$.error.message" == "not found"
