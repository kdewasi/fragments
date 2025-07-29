# Test unauthenticated POST
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
`Unauthenticated fragment`

# We expect to get back an HTTP 401
HTTP/1.1 401

[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.message" == "Unauthorized" 
