# KnowledgeBridge React UI

Traditional React JS application using `react-scripts` (Create React App structure).

## Features

- **Q&A Workspace** calls the existing Spring Boot `GET /api/gbrain/answer` endpoint.
- Displays conversational answers, citations, model information, and token usage.
- Source-preview panel inspired by the earlier RAG application.
- **Admin Ingestion** supports manual text entry and file selection.
- Responsive layout for desktop and smaller screens.

## Run locally

Requirements: Node.js 18 or newer and npm.

```bash
npm install
npm start
```

The UI runs at `http://localhost:3000`. The `proxy` entry in `package.json` forwards `/api` calls to Spring Boot at `http://localhost:8080`.

Keep these services running separately:

1. gBrain HTTP/MCP server on port `8787`.
2. Spring Boot API on port `8080`.
3. React UI on port `3000`.

## Existing backend contract

The Q&A tab uses the endpoint already developed:

```http
GET /api/gbrain/answer?question=What%20is%20the%20PTO%20rollover%20limit%3F
```

Expected response:

```json
{
  "question": "What is the PTO rollover limit?",
  "answer": "Employees may carry over up to five unused vacation days. [employee-leave-policy]",
  "citations": [
    {
      "pageSlug": "employee-leave-policy",
      "rowNumber": null,
      "citationIndex": 1
    }
  ],
  "gaps": [],
  "modelUsed": "openrouter:anthropic/claude-haiku-4.5",
  "usage": {
    "inputTokens": 702,
    "outputTokens": 106
  }
}
```

## Backend endpoints required for Admin Ingestion

These endpoints are referenced by `src/api/knowledgeBridgeApi.js` and must be added to Spring Boot.

### Manual text

```http
POST /api/gbrain/ingest/text
Content-Type: application/json

{
  "title": "Employee Leave Policy",
  "slug": "employee-leave-policy",
  "content": "Full-time employees receive twenty vacation days each year."
}
```

### File upload

```http
POST /api/gbrain/ingest/file
Content-Type: multipart/form-data

title: Employee Leave Policy
slug: employee-leave-policy
file: <selected document>
```

The file endpoint should extract text from the uploaded file, create Markdown content, and call gBrain's `put_page` tool. Start with TXT and Markdown. Add PDF and DOCX after the basic flow works.

## Optional deployed API URL

Copy `.env.example` to `.env` and set:

```text
REACT_APP_API_BASE_URL=https://your-api-host
```

Do not place gBrain or OpenRouter tokens in the React application. Secrets remain in the Spring Boot and gBrain environments.
