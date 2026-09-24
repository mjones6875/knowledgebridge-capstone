import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  askQuestion,
  deletePage,
  getPage,
  ingestFile,
  ingestText,
  listPages,
} from "./api/knowledgeBridgeApi";

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatUpdatedAt(value) {
  if (!value) return "Unknown";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function removeInlineCitations(answer, citations = []) {
  let cleanedAnswer = answer || "";

  citations.forEach((citation) => {
    if (!citation.pageSlug) return;

    const escapedSlug = citation.pageSlug.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

    cleanedAnswer = cleanedAnswer.replace(
      new RegExp(`\\s*\\[${escapedSlug}\\]`, "g"),
      "",
    );
  });

  return cleanedAnswer.trim();
}

function KnowledgeIcon() {
  return (
    <div className="brand-mark" aria-hidden="true">
      K
    </div>
  );
}

function Spinner() {
  return <span className="spinner" aria-label="Loading" />;
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function ChatTab() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [sourcePage, setSourcePage] = useState(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const citedSources = useMemo(() => {
    const seen = new Set();
    const sources = [];

    messages.forEach((message) => {
      (message.citations || []).forEach((citation) => {
        if (!seen.has(citation.pageSlug)) {
          seen.add(citation.pageSlug);
          sources.push(citation);
        }
      });
    });

    return sources;
  }, [messages]);

  useEffect(() => {
    let active = true;

    if (!selectedCitation?.pageSlug) {
      setSourcePage(null);
      setSourceError("");
      setSourceLoading(false);

      return () => {
        active = false;
      };
    }

    setSourcePage(null);
    setSourceError("");
    setSourceLoading(true);

    getPage(selectedCitation.pageSlug)
      .then((page) => {
        if (active) {
          setSourcePage(page);
        }
      })
      .catch((requestError) => {
        if (active) {
          setSourceError(
            requestError.message || "Unable to load the cited knowledge page.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setSourceLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedCitation]);

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || loading) {
      return;
    }

    setError("");
    setQuestion("");

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        text: trimmedQuestion,
      },
    ]);

    setLoading(true);

    try {
      const response = await askQuestion(trimmedQuestion);

      const citations = response.citations || [];

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: removeInlineCitations(response.answer, citations),
        citations,
        modelUsed: response.modelUsed,
        usage: response.usage,
      };

      setMessages((current) => [...current, assistantMessage]);

      if (assistantMessage.citations.length > 0) {
        setSelectedCitation(assistantMessage.citations[0]);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to retrieve an answer.");
    } finally {
      setLoading(false);
    }
  }

  function clearConversation() {
    setMessages([]);
    setSelectedCitation(null);
    setSourcePage(null);
    setSourceError("");
    setError("");
  }

  return (
    <main className="workspace-grid">
      <section className="panel chat-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Knowledge assistant</span>

            <h1>Chat Workspace</h1>

            <p>
              Ask questions and receive grounded answers with linked sources.
            </p>
          </div>

          <div className="heading-actions">
            <div className="message-count">
              <span>Messages</span>
              <strong>{messages.length}</strong>
            </div>

            {messages.length > 0 && (
              <button
                className="text-button"
                type="button"
                onClick={clearConversation}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="conversation" aria-live="polite">
          {messages.length === 0 && !loading ? (
            <EmptyState
              icon="✦"
              title="Ask about your knowledge base"
              description="Try: What is the PTO rollover limit?"
            />
          ) : (
            messages.map((message) => (
              <article className={`message ${message.role}`} key={message.id}>
                <div className="message-label">
                  {message.role === "assistant" ? "KNOWLEDGEBRIDGE" : "YOU"}
                </div>

                <div className="message-text">{message.text}</div>

                {message.citations?.length > 0 && (
                  <div className="source-block">
                    <span>Sources</span>

                    <div className="source-chips">
                      {message.citations.map((citation) => (
                        <button
                          type="button"
                          className={`source-chip ${
                            selectedCitation?.pageSlug === citation.pageSlug
                              ? "active"
                              : ""
                          }`}
                          key={`${citation.pageSlug}-${citation.citationIndex}`}
                          onClick={() => setSelectedCitation(citation)}
                        >
                          {citation.pageSlug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {message.modelUsed && (
                  <div className="message-meta">
                    {message.modelUsed}

                    {message.usage &&
                      ` · ${
                        message.usage.inputTokens + message.usage.outputTokens
                      } tokens`}
                  </div>
                )}
              </article>
            ))
          )}

          {loading && (
            <article className="message assistant loading-message">
              <Spinner />
              Searching the knowledge base and preparing an answer…
            </article>
          )}
        </div>

        {error && <div className="alert error">{error}</div>}

        <form className="question-form" onSubmit={handleSubmit}>
          <label htmlFor="question">Ask a question</label>

          <div className="question-row">
            <input
              id="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask a question about the uploaded knowledge…"
              autoComplete="off"
            />

            <button
              className="primary-button"
              type="submit"
              disabled={!question.trim() || loading}
            >
              {loading ? <Spinner /> : "Send"}
            </button>
          </div>
        </form>
      </section>

      <aside className="panel source-panel">
        <div className="panel-heading compact">
          <div>
            <span className="eyebrow">Document viewer</span>

            <h2>Source Preview</h2>

            <p>Review the sources used to generate the answer.</p>
          </div>
        </div>

        {selectedCitation ? (
          <div className="source-preview">
            <div className="document-toolbar">
              <span className="document-dot" />

              <strong>{selectedCitation.pageSlug}</strong>
            </div>

            <div className="document-page">
              <span className="document-kicker">CITED KNOWLEDGE PAGE</span>

              <h2>
                {sourcePage?.title ||
                  selectedCitation.pageSlug.replaceAll("-", " ")}
              </h2>

              {sourceLoading ? (
                <div className="source-document-status">
                  <Spinner />
                  Loading cited content…
                </div>
              ) : sourceError ? (
                <div className="alert error source-document-error">
                  {sourceError}
                </div>
              ) : (
                <pre className="source-document-content">
                  {sourcePage?.content ||
                    "No content was returned for this page."}
                </pre>
              )}

              <dl>
                <div>
                  <dt>Source ID</dt>
                  <dd>{selectedCitation.pageSlug}</dd>
                </div>

                <div>
                  <dt>Citation</dt>
                  <dd>#{selectedCitation.citationIndex}</dd>
                </div>

                <div>
                  <dt>Row</dt>
                  <dd>{selectedCitation.rowNumber ?? "Entire page"}</dd>
                </div>
              </dl>
            </div>
          </div>
        ) : (
          <EmptyState
            icon="▤"
            title="No source selected"
            description={
              citedSources.length > 0
                ? "Select a citation to preview it."
                : "Sources will appear here after an answer is generated."
            }
          />
        )}
      </aside>
    </main>
  );
}

function AdminTab() {
  const [mode, setMode] = useState("text");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const [pages, setPages] = useState([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [pagesError, setPagesError] = useState("");
  const [pagesNotice, setPagesNotice] = useState(null);
  const [pageAction, setPageAction] = useState(null);

  const [workflowExpanded, setWorkflowExpanded] = useState(false);

  const loadPages = useCallback(async () => {
    setPagesLoading(true);
    setPagesError("");

    try {
      const result = await listPages();
      setPages(result);
    } catch (requestError) {
      setPagesError(
        requestError.message || "Unable to load previously ingested knowledge.",
      );
    } finally {
      setPagesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  async function handleDownload(page) {
    setPagesNotice(null);

    setPageAction({
      slug: page.slug,
      type: "download",
    });

    try {
      const pageContent = await getPage(page.slug);

      const blob = new Blob([pageContent.content], {
        type: "text/markdown;charset=utf-8",
      });

      const downloadUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = `${page.slug}.md`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(downloadUrl);

      setPagesNotice({
        type: "success",
        text: `Downloaded ${page.slug}.md`,
      });
    } catch (requestError) {
      setPagesNotice({
        type: "error",
        text: requestError.message || "Unable to download the knowledge page.",
      });
    } finally {
      setPageAction(null);
    }
  }

  async function handleDelete(page) {
    const confirmed = window.confirm(
      `Delete “${page.title || page.slug}”?\n\n` +
        "It will be removed from search but can be restored within 72 hours.",
    );

    if (!confirmed) {
      return;
    }

    setPagesNotice(null);

    setPageAction({
      slug: page.slug,
      type: "delete",
    });

    try {
      const result = await deletePage(page.slug);

      setPagesNotice({
        type: "success",
        text:
          result?.status === "soft_deleted"
            ? `“${
                page.title || page.slug
              }” was deleted and can be restored within 72 hours.`
            : `“${page.title || page.slug}” was deleted.`,
      });

      await loadPages();
    } catch (requestError) {
      setPagesNotice({
        type: "error",
        text: requestError.message || "Unable to delete the knowledge page.",
      });
    } finally {
      setPageAction(null);
    }
  }

  function handleTitleChange(event) {
    const nextTitle = event.target.value;

    setTitle(nextTitle);

    if (!slugEdited) {
      setSlug(slugify(nextTitle));
    }
  }

  function handleFileSelection(selectedFile) {
    if (!selectedFile) return;

    const lowerCaseName = selectedFile.name.toLowerCase();

    if (!lowerCaseName.endsWith(".txt") && !lowerCaseName.endsWith(".md")) {
      setFile(null);
      setNotice({
        type: "error",
        text: "Only TXT and Markdown files are currently supported.",
      });
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setFile(null);
      setNotice({
        type: "error",
        text: "The selected file must be 5 MB or smaller.",
      });
      return;
    }

    setNotice(null);
    setFile(selectedFile);
  }

  function handleDragEnter(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();

    event.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }

  function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);

    const droppedFile = event.dataTransfer.files?.[0];

    if (droppedFile) {
      handleFileSelection(droppedFile);
    }
  }

  function resetForm() {
    setTitle("");
    setSlug("");
    setSlugEdited(false);
    setContent("");
    setFile(null);
    setIsDragging(false);

    setFileInputKey((currentKey) => currentKey + 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice(null);

    if (mode === "text" && (!title.trim() || !slug.trim())) {
      setNotice({
        type: "error",
        text: "Title and slug are required.",
      });

      return;
    }

    if (mode === "text" && !content.trim()) {
      setNotice({
        type: "error",
        text: "Enter the knowledge text to ingest.",
      });

      return;
    }

    if (mode === "file" && !file) {
      setNotice({
        type: "error",
        text: "Choose a document to upload.",
      });

      return;
    }

    if (mode === "file" && file.size > 5 * 1024 * 1024) {
      setNotice({
        type: "error",
        text: "The selected file must be 5 MB or smaller.",
      });

      return;
    }

    if (
      mode === "file" &&
      !file.name.toLowerCase().endsWith(".txt") &&
      !file.name.toLowerCase().endsWith(".md")
    ) {
      setNotice({
        type: "error",
        text: "Only TXT and Markdown files are currently supported.",
      });

      return;
    }

    setLoading(true);

    try {
      const result =
        mode === "text"
          ? await ingestText({
              title: title.trim(),
              slug: slug.trim(),
              content: content.trim(),
            })
          : await ingestFile({
              title: title.trim(),
              file,
            });

      setNotice({
        type: "success",
        text:
          result?.message && result?.slug
            ? `${result.message}. Citation slug: ${result.slug}`
            : result?.message ||
              `“${result?.title || title}” was successfully ingested.`,
      });

      resetForm();
      await loadPages();
    } catch (requestError) {
      setNotice({
        type: "error",
        text:
          requestError.message ||
          "Ingestion failed. Confirm that the Spring Boot ingestion endpoint is available.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-layout">
      <section className="panel admin-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Knowledge administration</span>

            <h1>Ingest Knowledge</h1>

            <p>Add business knowledge using text entry or document upload.</p>
          </div>
        </div>

        <div className="mode-switch" role="tablist" aria-label="Ingestion type">
          <button
            type="button"
            className={mode === "text" ? "active" : ""}
            onClick={() => setMode("text")}
          >
            Manual text
          </button>

          <button
            type="button"
            className={mode === "file" ? "active" : ""}
            onClick={() => setMode("file")}
          >
            File upload
          </button>
        </div>

        <form className="ingestion-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Document title{" "}
              {mode === "file" && (
                <span className="label-note">(optional)</span>
              )}
              <input
                value={title}
                onChange={handleTitleChange}
                placeholder={
                  mode === "file"
                    ? "Optional — uses the file name when blank"
                    : "Enter a descriptive document title"
                }
              />
            </label>

            {mode === "text" ? (
              <label>
                Page slug
                <input
                  value={slug}
                  onChange={(event) => {
                    setSlugEdited(true);
                    setSlug(slugify(event.target.value));
                  }}
                  placeholder="generated-from-document-title"
                />
                <small>Unique lowercase identifier used in citations.</small>
              </label>
            ) : (
              <div className="field-guidance">
                <strong>Automatic citation slug</strong>

                <small>
                  The backend creates the page slug from the title or file name.
                </small>
              </div>
            )}
          </div>

          {mode === "text" ? (
            <label>
              Knowledge content
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows="14"
                placeholder="Paste policy text, notes, procedures, or other business knowledge here…"
              />
              <small>{content.length.toLocaleString()} characters</small>
            </label>
          ) : (
            <label
              className={`upload-zone ${
                file ? "has-file" : ""
              } ${isDragging ? "is-dragging" : ""}`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleFileDrop}
            >
              <input
                key={fileInputKey}
                className="file-input"
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                onChange={(event) =>
                  handleFileSelection(event.target.files?.[0])
                }
              />

              <span className="upload-icon" aria-hidden="true">
                ⇧
              </span>

              <strong>
                {isDragging
                  ? "Drop the document here"
                  : file
                    ? file.name
                    : "Choose a document or drag and drop"}
              </strong>

              <span>
                {file
                  ? `${(file.size / 1024).toFixed(1)} KB selected`
                  : "TXT or Markdown, up to 5 MB"}
              </span>

              {!file && !isDragging && (
                <span className="upload-browse-hint">
                  Click anywhere in this area to browse
                </span>
              )}
            </label>
          )}

          {notice && (
            <div className={`alert ${notice.type}`}>{notice.text}</div>
          )}

          <div className="form-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={resetForm}
              disabled={loading}
            >
              Reset
            </button>

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner />
                  Ingesting…
                </>
              ) : mode === "file" ? (
                "Upload and ingest"
              ) : (
                "Ingest text"
              )}
            </button>
          </div>
        </form>
      </section>

      <aside
        className={`panel guidance-panel ${
          workflowExpanded ? "workflow-expanded" : "workflow-collapsed"
        }`}
      >
        <div className="inventory-section">
          <div className="knowledge-list-heading">
            <div>
              <span className="eyebrow">Knowledge inventory</span>

              <h2>Previously Ingested</h2>

              <p>Includes manual text entries and uploaded documents.</p>
            </div>

            <button
              className="refresh-button"
              type="button"
              onClick={loadPages}
              disabled={pagesLoading}
              aria-label="Refresh ingested knowledge"
            >
              {pagesLoading ? <Spinner /> : "↻"}
            </button>
          </div>

          <div className="knowledge-count">
            <strong>{pages.length}</strong>

            <span>
              {pages.length === 1 ? "knowledge page" : "knowledge pages"}
            </span>
          </div>

          {pagesNotice && (
            <div className={`alert ${pagesNotice.type} inventory-notice`}>
              {pagesNotice.text}
            </div>
          )}

          {pagesError ? (
            <div className="alert error inventory-alert">
              {pagesError}

              <button type="button" onClick={loadPages}>
                Try again
              </button>
            </div>
          ) : pagesLoading && pages.length === 0 ? (
            <div className="inventory-loading">
              <Spinner />
              Loading knowledge…
            </div>
          ) : pages.length === 0 ? (
            <div className="inventory-empty">
              No knowledge has been ingested yet.
            </div>
          ) : (
            <ul className="knowledge-list">
              {pages.map((page) => (
                <li key={page.slug}>
                  <div className="knowledge-page-icon" aria-hidden="true">
                    ▤
                  </div>

                  <div className="knowledge-page-details">
                    <div className="knowledge-page-title">
                      <strong>{page.title || page.slug}</strong>

                      <span className="type-badge">{page.type || "page"}</span>
                    </div>

                    <code>{page.slug}</code>

                    <small>Updated {formatUpdatedAt(page.updatedAt)}</small>

                    <div className="knowledge-page-actions">
                      <button
                        type="button"
                        onClick={() => handleDownload(page)}
                        disabled={pageAction?.slug === page.slug}
                      >
                        {pageAction?.slug === page.slug &&
                        pageAction.type === "download" ? (
                          <>
                            <Spinner />
                            Downloading…
                          </>
                        ) : (
                          "Download"
                        )}
                      </button>

                      <button
                        className="delete-action"
                        type="button"
                        onClick={() => handleDelete(page)}
                        disabled={pageAction?.slug === page.slug}
                      >
                        {pageAction?.slug === page.slug &&
                        pageAction.type === "delete" ? (
                          <>
                            <Spinner />
                            Deleting…
                          </>
                        ) : (
                          "Delete"
                        )}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="workflow-section">
          <div className="workflow-divider" />

          <button
            className="workflow-toggle"
            type="button"
            aria-expanded={workflowExpanded}
            onClick={() => setWorkflowExpanded((current) => !current)}
          >
            <div>
              <span className="eyebrow">MVP workflow</span>

              <h2>What happens next?</h2>
            </div>

            <span
              className={`workflow-chevron ${
                workflowExpanded ? "expanded" : ""
              }`}
              aria-hidden="true"
            >
              ▼
            </span>
          </button>

          {workflowExpanded && (
            <div className="workflow-content">
              <ol className="workflow-list">
                <li>
                  <span>1</span>

                  <div>
                    <strong>Submit content</strong>

                    <p>
                      Text or a supported file is sent to the Spring Boot API.
                    </p>
                  </div>
                </li>

                <li>
                  <span>2</span>

                  <div>
                    <strong>Prepare knowledge</strong>

                    <p>
                      The backend converts content into Markdown and assigns
                      metadata.
                    </p>
                  </div>
                </li>

                <li>
                  <span>3</span>

                  <div>
                    <strong>Index with gBrain</strong>

                    <p>
                      gBrain stores, chunks, and embeds the submitted knowledge.
                    </p>
                  </div>
                </li>

                <li>
                  <span>4</span>

                  <div>
                    <strong>Ask grounded questions</strong>

                    <p>
                      The Chat tab can retrieve and cite the newly ingested
                      page.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="scope-note">
                <strong>POC scope</strong>

                <p>
                  Authentication, roles, caching, and advanced administration
                  are intentionally deferred.
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </main>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <KnowledgeIcon />

          <div>
            <strong>KnowledgeBridge</strong>
            <span>AI-powered business knowledge</span>
          </div>
        </div>

        <nav className="main-tabs" aria-label="Primary navigation">
          <button
            className={activeTab === "chat" ? "active" : ""}
            type="button"
            onClick={() => setActiveTab("chat")}
          >
            Q&amp;A Workspace
          </button>

          <button
            className={activeTab === "admin" ? "active" : ""}
            type="button"
            onClick={() => setActiveTab("admin")}
          >
            Admin Ingestion
          </button>
        </nav>

        <div className="status-pill">
          <span /> POC
        </div>
      </header>

      {/*
        Both components remain mounted. The hidden
        attribute only changes which one is visible,
        so chat history persists while changing tabs.
      */}
      <div hidden={activeTab !== "chat"}>
        <ChatTab />
      </div>

      <div hidden={activeTab !== "admin"}>
        <AdminTab />
      </div>
    </div>
  );
}
