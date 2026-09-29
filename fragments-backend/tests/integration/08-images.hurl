# Image fragments are validated, stored in S3 and converted with sharp
POST {{host}}/v1/fragments
Content-Type: image/png
Authorization: Basic {{auth}}
file,fixtures/test.png;
HTTP 201
[Asserts]
jsonpath "$.fragment.type" == "image/png"
jsonpath "$.fragment.size" == {{png_size}}
[Captures]
url: header "Location"

GET {{url}}
Authorization: Basic {{auth}}
HTTP 200
Content-Type: image/png
[Asserts]
bytes count == {{png_size}}
sha256 == hex,55bca3a93373a93a9dfe1565e076b53abcaeb5e929725d48518e34254bb4173a;

GET {{url}}.jpg
Authorization: Basic {{auth}}
HTTP 200
Content-Type: image/jpeg
[Asserts]
bytes count > 0

GET {{url}}.webp
Authorization: Basic {{auth}}
HTTP 200
Content-Type: image/webp
[Asserts]
bytes count > 0

GET {{url}}.txt
Authorization: Basic {{auth}}
HTTP 415

# Bytes that are not an image are rejected
POST {{host}}/v1/fragments
Content-Type: image/png
Authorization: Basic {{auth}}
`this is not a png`
HTTP 400
[Asserts]
jsonpath "$.error.message" contains "valid image"

# Mismatched declared type is rejected
POST {{host}}/v1/fragments
Content-Type: image/jpeg
Authorization: Basic {{auth}}
file,fixtures/test.png;
HTTP 400

DELETE {{url}}
Authorization: Basic {{auth}}
HTTP 200
