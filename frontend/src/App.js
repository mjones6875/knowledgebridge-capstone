import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import Sidebar from "./components/Sidebar";
import CostDashboard from "./components/CostDashboard";
import Login from "./components/Login";
import { AG_GRID_MODULES, kbGridTheme } from "./gridTheme";
import {
  askQuestion,
  deletePage,
  getPage,
  ingestFile,
  ingestMedia,
  ingestText,
  listPages,
} from "./api/knowledgeBridgeApi";

const DOCUMENT_EXTENSIONS = [".txt", ".md"];

const MEDIA_EXTENSIONS = [".mp3", ".wav", ".m4a", ".mp4", ".mov", ".webm"];

const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
const MEDIA_MAX_BYTES = 50 * 1024 * 1024;

const AUTH_STORAGE_KEY = "kb_authenticated_user";
const THEME_STORAGE_KEY = "kb_theme";

function getInitialTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

const SUGGESTED_PROMPTS = [
  "What is the PTO rollover limit?",
  "How do I submit a reimbursement request?",
  "What is the remote work policy?",
];

const ADMIN_LEFT_WIDTH_KEY = "kb_admin_left_width";
const ADMIN_LEFT_WIDTH_MIN = 340;
const ADMIN_RIGHT_WIDTH_MIN = 360;

function getStoredAdminLeftWidth() {
  const stored = Number(localStorage.getItem(ADMIN_LEFT_WIDTH_KEY));
  return Number.isFinite(stored) && stored > 0 ? stored : null;
}

function hasSupportedExtension(fileName, extensions) {
  const normalizedName = fileName.toLowerCase();

  return extensions.some((extension) => normalizedName.endsWith(extension));
}

function isMedia(file) {
  return hasSupportedExtension(file.name, MEDIA_EXTENSIONS);
}

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
      KB
    </div>
  );
}

function getInitials(name) {
  const trimmed = (name || "").trim();

  return trimmed ? trimmed.slice(0, 2).toUpperCase() : "U";
}

function KnowledgeTypeCell({ value }) {
  return <span className="type-badge">{value || "page"}</span>;
}

function KnowledgeActionsCell({ data, context }) {
  const { pageAction, onDownload, onDelete } = context;
  const isBusy = pageAction?.slug === data.slug;

  return (
    <div className="knowledge-page-actions">
      <button type="button" onClick={() => onDownload(data)} disabled={isBusy}>
        {isBusy && pageAction.type === "download" ? (
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
        onClick={() => onDelete(data)}
        disabled={isBusy}
      >
        {isBusy && pageAction.type === "delete" ? (
          <>
            <Spinner />
            Deleting…
          </>
        ) : (
          "Delete"
        )}
      </button>
    </div>
  );
}

function ThemeToggle({ theme, onToggle, className = "" }) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={onToggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="4.5" />
          <path
            d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path
            d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="modal-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="confirm-dialog-title">{title}</h3>

        {description && <p>{description}</p>}

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className={`primary-button ${danger ? "modal-danger-button" : ""}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
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

function TypingIndicator() {
  return (
    <span className="typing-dots" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function ChatTab() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [sourcePanelOpen, setSourcePanelOpen] = useState(false);
  const [sourcePage, setSourcePage] = useState(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  const textareaRef = useRef(null);
  const conversationRef = useRef(null);

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

  // Keep the newest message in view, mirroring the auto-scroll feel of AI chat tools.
  useEffect(() => {
    const node = conversationRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, loading]);

  // Grow the textarea with the content instead of scrolling inside a fixed box.
  // useLayoutEffect measures synchronously before paint, avoiding a flash of
  // a too-short box (CSS min-height is also a floor as a second safeguard).
  useLayoutEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
  }, [question]);

  async function sendQuestion(rawQuestion) {
    const trimmedQuestion = rawQuestion.trim();

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

  function handleSubmit(event) {
    event.preventDefault();
    sendQuestion(question);
  }

  function handleInputKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendQuestion(question);
    }
  }

  function handleCopy(message) {
    if (!navigator.clipboard) return;

    navigator.clipboard.writeText(message.text).then(() => {
      setCopiedMessageId(message.id);

      window.setTimeout(() => {
        setCopiedMessageId((current) => (current === message.id ? null : current));
      }, 1500);
    });
  }

  function clearConversation() {
    setMessages([]);
    setSelectedCitation(null);
    setSourcePanelOpen(false);
    setSourcePage(null);
    setSourceError("");
    setError("");
  }

  function openSource(citation) {
    setSelectedCitation(citation);
    setSourcePanelOpen(true);
  }

  return (
    <main
      className={`workspace-grid ${
        sourcePanelOpen ? "" : "workspace-grid--source-collapsed"
      }`}
    >
      <section className="panel chat-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">✦ AI knowledge assistant</span>

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
                New chat
              </button>
            )}
          </div>
        </div>

        <div className="conversation" aria-live="polite" ref={conversationRef}>
          {messages.length === 0 && !loading ? (
            <div className="chat-empty">
              <EmptyState
                icon="✦"
                title="Ask about your knowledge base"
                description="Try one of the prompts below, or type your own question."
              />

              <div className="suggested-prompts">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    type="button"
                    className="suggested-chip"
                    key={prompt}
                    onClick={() => sendQuestion(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div className={`message-row ${message.role}`} key={message.id}>
                <div className="message-avatar" aria-hidden="true">
                  {message.role === "assistant" ? "✦" : "Y"}
                </div>

                <article className={`message ${message.role}`}>
                  <div className="message-label">
                    <span>
                      {message.role === "assistant" ? "KNOWLEDGEBRIDGE" : "YOU"}
                    </span>

                    {message.role === "assistant" && (
                      <button
                        type="button"
                        className="copy-button"
                        onClick={() => handleCopy(message)}
                      >
                        {copiedMessageId === message.id ? "Copied" : "Copy"}
                      </button>
                    )}
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
                            onClick={() => openSource(citation)}
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
              </div>
            ))
          )}

          {loading && (
            <div className="message-row assistant">
              <div className="message-avatar" aria-hidden="true">
                ✦
              </div>

              <article className="message assistant loading-message">
                <TypingIndicator />
                Searching the knowledge base and preparing an answer…
              </article>
            </div>
          )}
        </div>

        {error && <div className="alert error">{error}</div>}

        <form className="question-form" onSubmit={handleSubmit}>
          <label htmlFor="question">Ask a question</label>

          <div className="question-row question-row--textarea">
            <textarea
              id="question"
              ref={textareaRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Ask a question about the uploaded knowledge…"
              rows={1}
            />

            <button
              className="primary-button"
              type="submit"
              disabled={!question.trim() || loading}
            >
              {loading ? <Spinner /> : "Send"}
            </button>
          </div>

          <small className="question-hint">
            Enter to send &middot; Shift+Enter for a new line
          </small>
        </form>
      </section>

      {sourcePanelOpen && (
        <aside className="panel source-panel">
          <div className="panel-heading compact">
            <div>
              <span className="eyebrow">Document viewer</span>

              <h2>Source Preview</h2>

              <p>Review the sources used to generate the answer.</p>
            </div>

            <button
              type="button"
              className="text-button"
              onClick={() => setSourcePanelOpen(false)}
            >
              Close
            </button>
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
      )}
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
  const [uploadProgress, setUploadProgress] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(null);
  const [notice, setNotice] = useState(null);

  const [pages, setPages] = useState([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [pagesError, setPagesError] = useState("");
  const [pagesNotice, setPagesNotice] = useState(null);
  const [pageAction, setPageAction] = useState(null);
  const [pendingDeletePage, setPendingDeletePage] = useState(null);
  const [knowledgeSearch, setKnowledgeSearch] = useState("");

  const [workflowExpanded, setWorkflowExpanded] = useState(false);

  const [leftPanelWidth, setLeftPanelWidth] = useState(getStoredAdminLeftWidth);
  const [isResizingPanels, setIsResizingPanels] = useState(false);

  const adminLayoutRef = useRef(null);
  const leftPanelWidthRef = useRef(leftPanelWidth);
  const resizeFrameRef = useRef(null);

  useEffect(() => {
    leftPanelWidthRef.current = leftPanelWidth;
  }, [leftPanelWidth]);

  const handleResizerPointerDown = useCallback((event) => {
    event.preventDefault();

    const container = adminLayoutRef.current;
    if (!container) return;

    setIsResizingPanels(true);
    document.body.classList.add("is-resizing-panels");

    function handlePointerMove(moveEvent) {
      if (resizeFrameRef.current) return;

      resizeFrameRef.current = requestAnimationFrame(() => {
        resizeFrameRef.current = null;

        const rect = container.getBoundingClientRect();
        const maxWidth = Math.max(
          rect.width - ADMIN_RIGHT_WIDTH_MIN - 24,
          ADMIN_LEFT_WIDTH_MIN,
        );

        const nextWidth = Math.min(
          Math.max(moveEvent.clientX - rect.left, ADMIN_LEFT_WIDTH_MIN),
          maxWidth,
        );

        setLeftPanelWidth(nextWidth);
      });
    }

    function handlePointerUp() {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.body.classList.remove("is-resizing-panels");
      setIsResizingPanels(false);

      if (leftPanelWidthRef.current) {
        localStorage.setItem(
          ADMIN_LEFT_WIDTH_KEY,
          String(leftPanelWidthRef.current),
        );
      }
    }

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  }, []);

  function handleResizerKeyDown(event) {
    const step = 24;

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();

      const container = adminLayoutRef.current;
      const currentWidth =
        leftPanelWidthRef.current ?? container?.clientWidth * 0.55 ?? 500;

      const delta = event.key === "ArrowLeft" ? -step : step;
      const nextWidth = Math.max(currentWidth + delta, ADMIN_LEFT_WIDTH_MIN);

      setLeftPanelWidth(nextWidth);
      localStorage.setItem(ADMIN_LEFT_WIDTH_KEY, String(nextWidth));
    } else if (event.key === "Home") {
      event.preventDefault();
      setLeftPanelWidth(null);
      localStorage.removeItem(ADMIN_LEFT_WIDTH_KEY);
    }
  }

  function resetPanelWidth() {
    setLeftPanelWidth(null);
    localStorage.removeItem(ADMIN_LEFT_WIDTH_KEY);
  }

  const processingIntervalRef = useRef(null);

  // The server doesn't report real transcription progress, so this creeps
  // toward 96% and never claims completion until the request actually resolves.
  function startSimulatedProcessing() {
    stopSimulatedProcessing();
    setProcessingProgress(0);

    processingIntervalRef.current = window.setInterval(() => {
      setProcessingProgress((current) => {
        const next = (current ?? 0) + (96 - (current ?? 0)) * 0.08;
        return next;
      });
    }, 400);
  }

  function stopSimulatedProcessing() {
    if (processingIntervalRef.current) {
      window.clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
  }

  const knowledgeGridRef = useRef(null);

  const knowledgeColumnDefs = useMemo(
    () => [
      {
        headerName: "Title",
        colId: "title",
        flex: 2,
        minWidth: 160,
        valueGetter: (params) => params.data.title || params.data.slug,
      },
      {
        headerName: "Slug",
        field: "slug",
        flex: 1.4,
        minWidth: 140,
      },
      {
        headerName: "Type",
        field: "type",
        flex: 0.8,
        minWidth: 100,
        cellRenderer: KnowledgeTypeCell,
      },
      {
        headerName: "Updated",
        field: "updatedAt",
        flex: 1.3,
        minWidth: 160,
        valueFormatter: (params) => formatUpdatedAt(params.value),
      },
      {
        headerName: "Actions",
        colId: "actions",
        flex: 1.1,
        minWidth: 150,
        sortable: false,
        filter: false,
        cellRenderer: KnowledgeActionsCell,
      },
    ],
    [],
  );

  const knowledgeDefaultColDef = useMemo(
    () => ({ sortable: true, filter: true, resizable: true }),
    [],
  );

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

  const handleDownload = useCallback(async (page) => {
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
  }, []);

  const handleDelete = useCallback((page) => {
    setPendingDeletePage(page);
  }, []);

  const cancelDelete = useCallback(() => {
    setPendingDeletePage(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    const page = pendingDeletePage;

    if (!page) return;

    setPendingDeletePage(null);
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
  }, [pendingDeletePage, loadPages]);

  const knowledgeGridContext = useMemo(
    () => ({ pageAction, onDownload: handleDownload, onDelete: handleDelete }),
    [pageAction, handleDownload, handleDelete],
  );

  useEffect(() => {
    knowledgeGridRef.current?.api?.refreshCells({
      columns: ["actions"],
      force: true,
    });
  }, [pageAction]);

  function handleTitleChange(event) {
    const nextTitle = event.target.value;

    setTitle(nextTitle);

    if (!slugEdited) {
      setSlug(slugify(nextTitle));
    }
  }

  function handleFileSelection(selectedFile) {
    if (!selectedFile) {
      return;
    }

    const documentSelected = hasSupportedExtension(
      selectedFile.name,
      DOCUMENT_EXTENSIONS,
    );

    const mediaSelected = isMedia(selectedFile);

    if (!documentSelected && !mediaSelected) {
      setFile(null);

      setNotice({
        type: "error",
        text:
          "Supported formats: TXT, Markdown, MP3, WAV, M4A, " +
          "MP4, MOV, and WebM.",
      });

      return;
    }

    const maximumBytes = mediaSelected ? MEDIA_MAX_BYTES : DOCUMENT_MAX_BYTES;

    const maximumLabel = mediaSelected ? "50 MB" : "5 MB";

    if (selectedFile.size > maximumBytes) {
      setFile(null);

      setNotice({
        type: "error",
        text:
          `The selected ${mediaSelected ? "media" : "document"} ` +
          `file must be ${maximumLabel} or smaller.`,
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
    stopSimulatedProcessing();
    setTitle("");
    setSlug("");
    setSlugEdited(false);
    setContent("");
    setFile(null);
    setIsDragging(false);
    setUploadProgress(null);
    setProcessingProgress(null);

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
        text: "Choose a document, audio file, or video to upload.",
      });

      return;
    }

    setLoading(true);
    setUploadProgress(mode === "file" ? 0 : null);
    setProcessingProgress(null);

    try {
      let result;

      if (mode === "text") {
        result = await ingestText({
          title: title.trim(),
          slug: slug.trim(),
          content: content.trim(),
        });
      } else if (isMedia(file)) {
        result = await ingestMedia(
          {
            title: title.trim(),
            file,
          },
          (percent) => {
            setUploadProgress(percent);

            if (percent >= 100) {
              startSimulatedProcessing();
            }
          },
        );
      } else {
        result = await ingestFile(
          {
            title: title.trim(),
            file,
          },
          setUploadProgress,
        );
      }

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
      stopSimulatedProcessing();
      setLoading(false);
      setUploadProgress(null);
      setProcessingProgress(null);
    }
  }

  return (
    <main
      className="admin-layout"
      ref={adminLayoutRef}
      style={
        leftPanelWidth
          ? { "--admin-left-width": `${leftPanelWidth}px` }
          : undefined
      }
    >
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
                accept=".txt,.md,.mp3,.wav,.m4a,.mp4,.mov,.webm,text/plain,text/markdown,audio/*,video/*"
                onChange={(event) =>
                  handleFileSelection(event.target.files?.[0])
                }
              />

              <span className="upload-icon" aria-hidden="true">
                ⇧
              </span>

              <strong>
                {isDragging
                  ? "Drop the file here"
                  : file
                    ? file.name
                    : "Choose a document, audio, or video file"}
              </strong>

              <span>
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB selected`
                  : "TXT/Markdown up to 5 MB · Audio/video up to 50 MB"}
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

          {loading && mode === "file" && uploadProgress !== null && (
            <div
              className="upload-progress"
              role="progressbar"
              aria-valuenow={Math.round(
                uploadProgress < 100
                  ? uploadProgress
                  : (processingProgress ?? 0),
              )}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="upload-progress-track">
                <div
                  className="upload-progress-bar"
                  style={{
                    width: `${
                      uploadProgress < 100
                        ? uploadProgress
                        : (processingProgress ?? 0)
                    }%`,
                  }}
                />
              </div>

              <span className="upload-progress-label">
                {uploadProgress < 100
                  ? `Uploading… ${uploadProgress}%`
                  : isMedia(file)
                    ? `Transcribing… ~${Math.round(processingProgress ?? 0)}%`
                    : "Finishing up…"}
              </span>
            </div>
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

                  {mode === "file" && uploadProgress !== null && uploadProgress < 100
                    ? `Uploading… ${uploadProgress}%`
                    : mode === "file" && file && isMedia(file)
                      ? `Transcribing… ~${Math.round(processingProgress ?? 0)}%`
                      : "Ingesting…"}
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

      <div
        className={`panel-resizer ${isResizingPanels ? "is-dragging" : ""}`}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize ingestion and inventory panels"
        tabIndex={0}
        onPointerDown={handleResizerPointerDown}
        onKeyDown={handleResizerKeyDown}
        onDoubleClick={resetPanelWidth}
        title="Drag to resize · Double-click to reset"
      />

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
            <div className="knowledge-grid-wrap">
              <input
                type="search"
                className="knowledge-search"
                value={knowledgeSearch}
                onChange={(event) => setKnowledgeSearch(event.target.value)}
                placeholder="Search title, slug, or type…"
                aria-label="Search ingested knowledge"
              />

              <div className="knowledge-ag-grid">
                <AgGridProvider modules={AG_GRID_MODULES}>
                  <AgGridReact
                    ref={knowledgeGridRef}
                    theme={kbGridTheme}
                    rowData={pages}
                    columnDefs={knowledgeColumnDefs}
                    defaultColDef={knowledgeDefaultColDef}
                    context={knowledgeGridContext}
                    quickFilterText={knowledgeSearch}
                    getRowId={(params) => params.data.slug}
                    rowHeight={44}
                    headerHeight={38}
                    animateRows
                    suppressCellFocus
                  />
                </AgGridProvider>
              </div>
            </div>
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

      <ConfirmDialog
        open={!!pendingDeletePage}
        title={`Delete "${pendingDeletePage?.title || pendingDeletePage?.slug || ""}"?`}
        description="It will be removed from search but can be restored within 72 hours."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </main>
  );
}

export default function App() {
  const [authUser, setAuthUser] = useState(
    () => sessionStorage.getItem(AUTH_STORAGE_KEY) || null,
  );
  const [theme, setTheme] = useState(getInitialTheme);
  const [activeTab, setActiveTab] = useState("chat");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  function handleLogin(username) {
    sessionStorage.setItem(AUTH_STORAGE_KEY, username);
    setAuthUser(username);
  }

  function handleLogout() {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthUser(null);
  }

  if (!authUser) {
    return (
      <>
        <ThemeToggle
          theme={theme}
          onToggle={toggleTheme}
          className="theme-toggle--fixed"
        />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  return (
    <div className="kb-app-shell">
      <Sidebar
        activePage={activeTab}
        onPageChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((currentValue) => !currentValue)}
      />

      <div className="kb-content-shell">
        <header className="app-header">
          <div className="brand">
            <KnowledgeIcon />

            <div>
              <strong>KnowledgeBridge</strong>
              <span>AI-powered business knowledge</span>
            </div>
          </div>

          <div className="header-actions">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />

            <div className="user-chip" title={`Signed in as ${authUser}`}>
              <span className="user-avatar" aria-hidden="true">
                {getInitials(authUser)}
              </span>

              <span className="user-name">{authUser}</span>
            </div>

            <button
              className="text-button kb-logout-button"
              type="button"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </div>
        </header>

        {/*
        All pages remain mounted. The hidden attribute controls
        visibility, so chat history and form data are preserved
        while switching between menu items.
      */}

        <main className="kb-main-content">
          <div hidden={activeTab !== "chat"}>
            <ChatTab />
          </div>

          <div hidden={activeTab !== "admin"}>
            <AdminTab />
          </div>

          <div hidden={activeTab !== "cost"}>
            <CostDashboard active={activeTab === "cost"} />
          </div>
        </main>
      </div>
    </div>
  );
}
