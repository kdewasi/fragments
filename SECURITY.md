# Security

## Reporting a vulnerability

Please do not open a public issue for security problems. Email the maintainer
(see the GitHub profile of [@kdewasi](https://github.com/kdewasi)) with a
description and, if possible, steps to reproduce. You will get a reply as soon
as possible.

## Security model

**Authentication**

- Production runs with Amazon Cognito. Clients send the Cognito *ID token* as a
  Bearer token; the API verifies its signature, issuer, audience, expiry and
  `token_use` against the user pool's JWKS (`aws-jwt-verify`).
- HTTP Basic Auth (`HTPASSWD_FILE`) exists for local development and automated
  tests only. The server refuses to start with Basic Auth when
  `NODE_ENV=production`, and the production Docker image contains no
  `.htpasswd` file. The test users in `fragments-backend/tests/.htpasswd` are
  bcrypt-hashed, well known, and must never be reused anywhere real.
- Credentials and tokens are never logged: the request logger redacts
  `Authorization`, and authentication failures log only the reason.

**Authorization and data isolation**

- Users are identified by a SHA-256 hash of their email address. The hash is the
  DynamoDB partition key and the S3 key prefix, so every query is scoped to the
  caller. Fragments belonging to other users answer `404`.

**Input handling**

- Only the eleven supported content types are accepted, with a configurable body
  size limit (`MAX_FRAGMENT_SIZE`, 5 MB by default).
- JSON and YAML bodies must parse; image bodies are sniffed with `sharp` and
  must match the declared type. A `PUT` may not change a fragment's type.
- Markdown is rendered with raw HTML disabled, so converted HTML cannot carry
  scripts from a fragment's content.

**Transport and HTTP hardening**

- `helmet` security headers, a CORS allow-list (`CORS_ORIGINS`), per-client
  rate limiting (`express-rate-limit`), correct client IPs behind the load
  balancer (`TRUST_PROXY`), and a request id on every response.
- Server-side errors are logged in full but reported to clients as a generic
  `500`; only 4xx messages are exposed.
- The UI is served by an unprivileged nginx with a Content Security Policy and
  the usual anti-framing / MIME-sniffing headers; the service worker caches the
  app shell only, never API responses, and all offline data is cleared on sign-out.

**Supply chain and infrastructure**

- Both packages run `npm audit --omit=dev --audit-level=high` in CI, and
  Dependabot keeps npm packages, Docker base images and GitHub Actions current.
- Containers run as a non-root user with a health check; dependencies are
  installed with `npm ci --omit=dev` from the lockfile.
- The CD pipeline authenticates to AWS with GitHub OIDC (short-lived
  credentials, no long-lived keys in GitHub). The ECS task role is limited to
  the fragments bucket and table (`fragments-backend/deploy/iam/`).
- `.gitleaks.toml` is provided for local secret scanning; enabling GitHub's
  secret scanning and push protection on the repository is strongly recommended.

## Credential exposure notice (repository history before the 2026-09 cleanup)

Earlier commits of this repository contained credentials in plain text. They
have been removed from the current tree, but **they remain in the git history**
until the history is rewritten, and must be treated as compromised:

1. **AWS access key, secret key and session token** (AWS Academy Learner Lab)
   in a deployment notes file. These were temporary credentials that expire on
   their own, but confirm in the AWS console that no long-lived keys were
   created with them and rotate anything that was.
2. **A personal email address and an HTTP Basic Auth password**, both in the
   `.htpasswd` used by the production deployment and in tests, docs and debug
   scripts. Change that password anywhere it may have been reused.
3. **Cognito user pool and app client identifiers** and a load balancer host
   name. These are not secrets by themselves, but rotate the Cognito app client
   if the pool is still in use.
4. **Docker Hub and AWS secrets configured in GitHub Actions** were not in the
   repository, but rotate the Docker Hub access token as a precaution.

To purge the history (all collaborators must re-clone afterwards):

```bash
pip install git-filter-repo
git filter-repo --invert-paths \
  --path fragments-backend/DEPLOYMENT-READY.md \
  --path fragments-backend/.htpasswd \
  --path debug-upload.js --path test-image-upload.html --path test-conversion.html
git push --force --all && git push --force --tags
```

Then enable *Secret scanning* and *Push protection* under the repository's
Settings → Code security, so this cannot happen again unnoticed.
