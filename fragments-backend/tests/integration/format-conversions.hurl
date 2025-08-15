# Format Conversion Tests
# Test all major format conversions

# 1. POST a Markdown fragment
POST http://localhost:8080/v1/fragments
Content-Type: text/markdown
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d
`# Hello World
This is **bold** text.`

HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/markdown"

[Captures]
markdown_url: header "Location"
markdown_id: jsonpath "$.fragment.id"

# 2. Convert Markdown to HTML
GET {{markdown_url}}.html
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d

HTTP/1.1 200
Content-Type: text/html; charset=utf-8
[Asserts]
body contains "<h1>Hello World</h1>"
body contains "<strong>bold</strong>"

# 3. Convert Markdown to plain text
GET {{markdown_url}}.txt
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d

HTTP/1.1 200
Content-Type: text/plain

# 4. POST a JSON fragment
POST http://localhost:8080/v1/fragments
Content-Type: application/json
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d
`{"name": "test", "value": 123}`

HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "application/json"

[Captures]
json_url: header "Location"

# 5. Convert JSON to YAML
GET {{json_url}}.yaml
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d

HTTP/1.1 200
Content-Type: application/yaml
[Asserts]
body contains "name: test"
body contains "value: 123"

# 6. Convert JSON to plain text
GET {{json_url}}.txt
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d

HTTP/1.1 200
Content-Type: text/plain

# 7. Test unsupported conversion
GET {{json_url}}.html
[BasicAuth]
kishandewasi606@gmail.com:Jckzwtjh7d

HTTP/1.1 415
[Asserts]
jsonpath "$.error" contains "Cannot convert"
