const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";

async function parseResponse(response) {
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body?.message || body?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body;
}

function extractMcpText(body) {
  return body?.content?.find(
    (item) => item.type === "text" && typeof item.text === "string"
  )?.text;
}

function throwForMcpError(body) {
  if (!body?.isError) return;

  const text = extractMcpText(body);
  if (text) {
    try {
      const error = JSON.parse(text);
      throw new Error(error.message || error.error || text);
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        throw new Error(text);
      }
      throw parseError;
    }
  }

  throw new Error("The gBrain operation failed.");
}

export async function askQuestion(question) {
  const params = new URLSearchParams({ question });
  const response = await fetch(
    `${API_BASE_URL}/api/gbrain/answer?${params.toString()}`
  );
  return parseResponse(response);
}

export async function ingestText({ title, slug, content }) {
  const response = await fetch(`${API_BASE_URL}/api/gbrain/ingest/text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title, slug, content })
  });
  return parseResponse(response);
}

export async function ingestFile({ title, file }) {
  const formData = new FormData();

  if (title?.trim()) {
    formData.append("title", title.trim());
  }

  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/gbrain/ingest/file`, {
    method: "POST",
    body: formData
  });
  return parseResponse(response);
}

export async function listPages() {
  const response = await fetch(`${API_BASE_URL}/api/gbrain/pages`);
  const body = await parseResponse(response);

  throwForMcpError(body);

  if (Array.isArray(body)) {
    return body;
  }

  const text = extractMcpText(body);

  if (!text) {
    return [];
  }

  let pages;
  try {
    pages = JSON.parse(text);
  } catch (error) {
    throw new Error("The knowledge-page response was not valid JSON.");
  }

  if (!Array.isArray(pages)) {
    throw new Error("The knowledge-page response did not contain a page list.");
  }

  return pages.map((page) => ({
    slug: page.slug,
    sourceId: page.sourceId ?? page.source_id,
    type: page.type,
    title: page.title,
    updatedAt: page.updatedAt ?? page.updated_at
  }));
}

export async function getPage(slug) {
  const response = await fetch(
    `${API_BASE_URL}/api/gbrain/pages/${encodeURIComponent(slug)}`
  );
  const body = await parseResponse(response);
  throwForMcpError(body);

  if (typeof body === "string") {
    return { slug, content: body };
  }

  const text = extractMcpText(body);
  if (!text) {
    throw new Error("gBrain returned no content for this page.");
  }

  try {
    const page = JSON.parse(text);
    return {
      slug: page.slug || slug,
      title: page.title,
      content:
        page.content ??
        page.markdown ??
        page.page?.content ??
        page.text ??
        text
    };
  } catch {
    return { slug, content: text };
  }
}

export async function deletePage(slug) {
  const response = await fetch(
    `${API_BASE_URL}/api/gbrain/pages/${encodeURIComponent(slug)}`,
    { method: "DELETE" }
  );
  const body = await parseResponse(response);
  throwForMcpError(body);

  const text = extractMcpText(body);
  if (!text) return body;

  try {
    return JSON.parse(text);
  } catch {
    return { status: "soft_deleted", slug, message: text };
  }
}
