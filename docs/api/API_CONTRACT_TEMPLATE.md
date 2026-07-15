# API contract template (DoD §4)

Use this for every new or modified API. Also update OpenAPI:
`artifacts/api-server/src/lib/openapi-spec.ts` and/or `@workspace/api-spec`.

## Endpoint

- **Method:** `GET|POST|PATCH|PUT|DELETE`
- **Path:** `/api/...`
- **Auth:** Bearer session | public | admin

## Request

```json
{
  "field": "value"
}
```

### Validation rules

- required fields:
- formats / enums / max lengths:
- business rules:

## Responses

### 200 / 201 — success

```json
{}
```

### 400 — validation

```json
{ "error": "Invalid input", "details": {} }
```

### 401 — unauthorized

```json
{ "error": "Unauthorized" }
```

### 403 — forbidden

```json
{ "error": "Forbidden" }
```

### 404 / 409 / 429 — as applicable

```json
{ "error": "...", "code": "OPTIONAL_CODE" }
```

## Examples

curl / client examples here.
