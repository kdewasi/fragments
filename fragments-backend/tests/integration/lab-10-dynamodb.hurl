# tests/integration/lab-10-dynamodb.hurl
# Lab 10 DynamoDB Integration Test - Complete test scenario

# 1. POST a new JSON fragment
POST http://localhost:8080/v1/fragments
Content-Type: application/json
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d
`{ "service": "DynamoDB" }`

# 2. Confirm 201 and capture Location and fragment ID
HTTP/1.1 201
[Asserts]
# Check response structure
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "application/json"
jsonpath "$.fragment.size" == 25
# Our fragment ids use UUIDs
jsonpath "$.fragment.id" matches "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
# Our ownerId hash is a hex encoded string
jsonpath "$.fragment.ownerId" matches "^[0-9a-fA-F]+$"
# Check for timestamps
jsonpath "$.fragment.created" isString
jsonpath "$.fragment.updated" isString
# Location header should be present
header "Location" matches "^http:\/\/localhost:8080\/v1\/fragments\/[A-Za-z0-9_-]+$"

[Captures]
fragment1_url: header "Location"
fragment1_id: jsonpath "$.fragment.id"

# 3. GET the fragment info (metadata) for the first fragment
GET {{fragment1_url}}/info
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == {{fragment1_id}}
jsonpath "$.fragment.type" == "application/json"
jsonpath "$.fragment.size" == 25
jsonpath "$.fragment.created" isString
jsonpath "$.fragment.updated" isString

# 4. POST a second Markdown fragment
POST http://localhost:8080/v1/fragments
Content-Type: text/markdown
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d
`DynamoDB is **great**.`

# 5. Confirm 201 and capture second Location and fragment ID
HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/markdown"
jsonpath "$.fragment.size" == 22
jsonpath "$.fragment.id" matches "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
jsonpath "$.fragment.ownerId" matches "^[0-9a-fA-F]+$"
jsonpath "$.fragment.created" isString
jsonpath "$.fragment.updated" isString
header "Location" matches "^http:\/\/localhost:8080\/v1\/fragments\/[A-Za-z0-9_-]+$"

[Captures]
fragment2_url: header "Location"
fragment2_id: jsonpath "$.fragment.id"

# 6. GET the fragment info (metadata) for the second fragment
GET {{fragment2_url}}/info
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == {{fragment2_id}}
jsonpath "$.fragment.type" == "text/markdown"
jsonpath "$.fragment.size" == 22
jsonpath "$.fragment.created" isString
jsonpath "$.fragment.updated" isString

# 7. GET all fragments for the user (without expanding)
GET http://localhost:8080/v1/fragments
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragments" isCollection
# Verify both fragment IDs are in the list
jsonpath "$.fragments" includes {{fragment1_id}}
jsonpath "$.fragments" includes {{fragment2_id}}

# 8. DELETE the first fragment
DELETE {{fragment1_url}}
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d

# 9. Confirm 200 status for deletion
HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"

# 10. Try to GET the first fragment again (should be 404)
GET {{fragment1_url}}
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d

# 11. Confirm 404 since fragment should be deleted
HTTP/1.1 404

# 12. GET all fragments again and verify first is NOT included but second IS
GET http://localhost:8080/v1/fragments
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragments" isCollection
# First fragment should NOT be in the list
jsonpath "$.fragments" not includes {{fragment1_id}}
# Second fragment should still be in the list
jsonpath "$.fragments" includes {{fragment2_id}}
