# Unauthenticated metadata and health endpoints
GET {{host}}
HTTP 200
Cache-Control: no-cache
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.author" isString
jsonpath "$.githubUrl" matches /^https:\/\/github.com\/.+/
jsonpath "$.version" matches /^\d+\.\d+\.\d+$/
header "X-Request-Id" exists
header "X-Content-Type-Options" == "nosniff"

GET {{host}}/health
HTTP 200
Cache-Control: no-cache
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.uptime" isNumber
