# 404 Test - Non-existent route
GET http://localhost:8080/no-such-route

# We should get back an HTTP 1.1 404 response
HTTP/1.1 404

[Asserts]
# We expect to get back a JSON response with error details
jsonpath "$.status" == "error"
jsonpath "$.error.message" == "not found"
jsonpath "$.error.code" == 404 
