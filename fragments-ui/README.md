# fragments-ui

React + TypeScript + Vite front end for the Fragments API. See the
[repository README](../README.md) for the full picture.

```bash
npm install
npm run dev        # http://localhost:1234, Basic Auth against http://localhost:8080
npm test           # Vitest unit tests
npm run lint
npm run build      # type-check + production bundle in dist/
```

Configuration is read from `VITE_*` variables (see `.env.example`). Production
builds use Cognito: set `VITE_AUTH_MODE=cognito`, `VITE_COGNITO_AUTHORITY` and
`VITE_COGNITO_CLIENT_ID`, either in a local `.env.production` (git-ignored) or
as `--build-arg`s to the Dockerfile.
