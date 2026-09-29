# Text conversions via the .ext suffix
POST {{host}}/v1/fragments
Content-Type: text/markdown
Authorization: Basic {{auth}}
```
# Hello World
This is **bold** text.
```
HTTP 201
[Captures]
markdown_url: header "Location"

GET {{markdown_url}}.html
Authorization: Basic {{auth}}
HTTP 200
Content-Type: text/html; charset=utf-8
[Asserts]
body contains "<h1>Hello World</h1>"
body contains "<strong>bold</strong>"

GET {{markdown_url}}.txt
Authorization: Basic {{auth}}
HTTP 200
Content-Type: text/plain; charset=utf-8
[Asserts]
body contains "# Hello World"

GET {{markdown_url}}.md
Authorization: Basic {{auth}}
HTTP 200
Content-Type: text/markdown; charset=utf-8

# JSON -> YAML / text
POST {{host}}/v1/fragments
Content-Type: application/json
Authorization: Basic {{auth}}
`{"name": "test", "value": 123}`
HTTP 201
[Captures]
json_url: header "Location"

GET {{json_url}}.yaml
Authorization: Basic {{auth}}
HTTP 200
Content-Type: application/yaml
[Asserts]
body contains "name: test"
body contains "value: 123"

GET {{json_url}}.yml
Authorization: Basic {{auth}}
HTTP 200
Content-Type: application/yaml

GET {{json_url}}.txt
Authorization: Basic {{auth}}
HTTP 200
Content-Type: text/plain; charset=utf-8

# JSON cannot become HTML
GET {{json_url}}.html
Authorization: Basic {{auth}}
HTTP 415
[Asserts]
jsonpath "$.error.code" == 415
jsonpath "$.error.message" contains "Cannot convert"

# Unknown extension
GET {{json_url}}.exe
Authorization: Basic {{auth}}
HTTP 400
[Asserts]
jsonpath "$.error.message" contains "Unsupported conversion extension"

# CSV -> JSON
POST {{host}}/v1/fragments
Content-Type: text/csv
Authorization: Basic {{auth}}
```
name,age
Ada,36
"Smith, John",41
```
HTTP 201
[Captures]
csv_url: header "Location"

GET {{csv_url}}.json
Authorization: Basic {{auth}}
HTTP 200
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$" count == 2
jsonpath "$[0].name" == "Ada"
jsonpath "$[1].name" == "Smith, John"
jsonpath "$[1].age" == "41"

# YAML -> text only
POST {{host}}/v1/fragments
Content-Type: application/yaml
Authorization: Basic {{auth}}
`service: fragments`
HTTP 201
[Captures]
yaml_url: header "Location"

GET {{yaml_url}}.txt
Authorization: Basic {{auth}}
HTTP 200

GET {{yaml_url}}.json
Authorization: Basic {{auth}}
HTTP 415
