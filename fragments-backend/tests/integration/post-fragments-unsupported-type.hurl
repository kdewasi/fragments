# Test unsupported content type
POST http://localhost:8080/v1/fragments
Content-Type: application/octet-stream
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d
`Some binary data`

# We expect to get back an HTTP 415
HTTP/1.1 415

[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.message" contains "Unsupported Content-Type" 
