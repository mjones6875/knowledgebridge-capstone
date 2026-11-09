import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import { AG_GRID_MODULES, kbGridTheme } from "../gridTheme";
import { getJiraIssue, naturalSearchJiraIssues } from "../api/knowledgeBridgeApi";

const ISSUE_TYPE_OPTIONS = ["Epic", "Story", "Task", "Bug", "Subtask"];
const STATUS_OPTIONS = ["All", "To Do", "In Progress", "Done"];
const DEFAULT_QUERY = "Show all issues";
const JIRA_BASE_URL = (
  process.env.REACT_APP_JIRA_BASE_URL || "https://mech2soft.atlassian.net"
).replace(/\/+$/, "");

function getJiraIssueUrl(issueKey) {
  return `${JIRA_BASE_URL}/browse/${encodeURIComponent(issueKey)}`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function StatusBadge({ status }) {
  const normalized = (status || "").toLowerCase();
  const variant = normalized === "done"
    ? "done"
    : normalized === "in progress"
      ? "in-progress"
      : "todo";

  return (
    <span className={`kb-jira-status kb-jira-status--${variant}`}>
      {status || "Unknown"}
    </span>
  );
}

// Lets the user pick any combination of issue types (e.g. Story + Epic +
// Bug) instead of only one at a time. An empty selection means "All".
function TypeFilter({ selectedTypes, onChange }) {
  function toggleType(type) {
    onChange(
      selectedTypes.includes(type)
        ? selectedTypes.filter((selected) => selected !== type)
        : [...selectedTypes, type],
    );
  }

  const label =
    selectedTypes.length === 0 ? "All" : selectedTypes.join(", ");

  return (
    <details className="kb-jira__type-filter">
      <summary title={label}>{label}</summary>

      <div className="kb-jira__type-filter-menu">
        <label className="kb-jira__type-filter-option">
          <input
            type="checkbox"
            checked={selectedTypes.length === 0}
            onChange={() => onChange([])}
          />
          All
        </label>

        {ISSUE_TYPE_OPTIONS.map((type) => (
          <label key={type} className="kb-jira__type-filter-option">
            <input
              type="checkbox"
              checked={selectedTypes.includes(type)}
              onChange={() => toggleType(type)}
            />
            {type}
          </label>
        ))}
      </div>
    </details>
  );
}

function JiraIssues({ active }) {
  const [searchText, setSearchText] = useState("");
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [status, setStatus] = useState("All");
  const [assignee, setAssignee] = useState("All");

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [selectedKey, setSelectedKey] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = searchText.trim() || DEFAULT_QUERY;
      const response = await naturalSearchJiraIssues(query);
      setIssues(response?.issues || []);
    } catch (requestError) {
      setError(
        requestError.message || "Unable to load Jira issues.",
      );
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, [searchText]);

  useEffect(() => {
    if (active && !hasLoadedOnce) {
      runSearch();
    }
  }, [active, hasLoadedOnce, runSearch]);

  function handleSearchSubmit(event) {
    event.preventDefault();
    runSearch();
  }

  const assigneeOptions = useMemo(() => {
    const unique = new Set();

    issues.forEach((issue) => {
      if (issue.assignee) {
        unique.add(issue.assignee);
      }
    });

    return ["All", ...Array.from(unique).sort(), "Unassigned"];
  }, [issues]);

  // Natural search handles the free-text query; the dropdowns refine the
  // returned results on the client.
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (selectedTypes.length > 0 && !selectedTypes.includes(issue.type)) {
        return false;
      }

      if (status !== "All" && issue.status !== status) {
        return false;
      }

      if (assignee !== "All") {
        if (assignee === "Unassigned") {
          if (issue.assignee) return false;
        } else if (issue.assignee !== assignee) {
          return false;
        }
      }

      return true;
    });
  }, [issues, selectedTypes, status, assignee]);

  const loadIssueDetail = useCallback(async (issueKey) => {
    setSelectedKey(issueKey);
    setSelectedIssue(null);
    setDetailError("");
    setDetailLoading(true);

    try {
      const issue = await getJiraIssue(issueKey);
      setSelectedIssue(issue);
    } catch (requestError) {
      setDetailError(
        requestError.message || `Unable to load issue ${issueKey}.`,
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const columnDefs = useMemo(
    () => [
      {
        headerName: "Key",
        field: "key",
        flex: 0.9,
        minWidth: 100,
        cellRenderer: (params) => (
          <a
            href={getJiraIssueUrl(params.value)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            {params.value}
          </a>
        ),
      },
      { headerName: "Type", field: "type", flex: 0.9, minWidth: 100 },
      { headerName: "Summary", field: "summary", flex: 2.4, minWidth: 220 },
      {
        headerName: "Status",
        field: "status",
        flex: 1.1,
        minWidth: 130,
        cellRenderer: (params) => <StatusBadge status={params.value} />,
      },
      { headerName: "Assignee", field: "assignee", flex: 1.1, minWidth: 140 },
      { headerName: "Priority", field: "priority", flex: 0.9, minWidth: 110 },
      {
        headerName: "Updated",
        field: "updated",
        flex: 1.2,
        minWidth: 150,
        valueFormatter: (params) => formatDate(params.value),
      },
    ],
    [],
  );

  const defaultColDef = useMemo(
    () => ({ sortable: true, filter: true, resizable: true }),
    [],
  );

  return (
    <div className="kb-jira">
      <div className="kb-jira__heading">
        <div>
          <span className="kb-eyebrow">JIRA WORK ITEMS</span>
          <h1>Jira Issues</h1>
          <p>Search and review Jira work items without writing JQL.</p>
        </div>

        <button
          type="button"
          className="kb-refresh-button"
          onClick={runSearch}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <form className="kb-jira__filters" onSubmit={handleSearchSubmit}>
        <label className="kb-jira__search">
          Search
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Show all bugs assigned to me"
          />
        </label>

        <label>
          Type
          <TypeFilter selectedTypes={selectedTypes} onChange={setSelectedTypes} />
        </label>

        <label>
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label>
          Assignee
          <select
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
          >
            {assigneeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="primary-button kb-jira__search-button">
          Search
        </button>
      </form>

      {error && (
        <div className="kb-inline-error">{error}</div>
      )}

      <div className="kb-jira__body">
        <section className="kb-dashboard-panel kb-jira__table-panel">
          {!loading && hasLoadedOnce && filteredIssues.length === 0 ? (
            <div className="kb-dashboard-empty">
              No issues matched the current search and filters.
            </div>
          ) : (
            <div className="kb-ag-grid kb-jira__grid">
              <AgGridProvider modules={AG_GRID_MODULES}>
                <AgGridReact
                  theme={kbGridTheme}
                  rowData={filteredIssues}
                  columnDefs={columnDefs}
                  defaultColDef={defaultColDef}
                  getRowId={(params) => params.data.key}
                  rowHeight={40}
                  headerHeight={36}
                  animateRows
                  suppressCellFocus
                  onRowClicked={(params) => loadIssueDetail(params.data.key)}
                  getRowClass={(params) =>
                    params.data.key === selectedKey
                      ? "kb-jira__row--selected"
                      : undefined
                  }
                />
              </AgGridProvider>
            </div>
          )}
        </section>

        <section className="kb-dashboard-panel kb-jira__detail-panel">
          <div className="kb-dashboard-panel__header">
            <div>
              <h2>Issue Details</h2>
              <p>Select an issue from the table to see its details.</p>
            </div>
          </div>

          {!selectedKey && (
            <div className="kb-dashboard-empty">
              No issue selected.
            </div>
          )}

          {selectedKey && detailLoading && (
            <div className="kb-dashboard-message">
              Loading {selectedKey}...
            </div>
          )}

          {selectedKey && !detailLoading && detailError && (
            <div className="kb-dashboard-message kb-dashboard-message--error">
              {detailError}
            </div>
          )}

          {selectedKey && !detailLoading && !detailError && selectedIssue && (
            <div className="kb-jira-detail">
              <div className="kb-jira-detail__title">
                <strong>
                  <a
                    href={getJiraIssueUrl(selectedIssue.key)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {selectedIssue.key}
                  </a>
                </strong>
                <StatusBadge status={selectedIssue.status} />
              </div>

              <h3>{selectedIssue.summary}</h3>

              <dl className="kb-jira-detail__meta">
                <div>
                  <dt>Type</dt>
                  <dd>{selectedIssue.type || "—"}</dd>
                </div>
                <div>
                  <dt>Assignee</dt>
                  <dd>{selectedIssue.assignee || "Unassigned"}</dd>
                </div>
                <div>
                  <dt>Priority</dt>
                  <dd>{selectedIssue.priority || "—"}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{formatDate(selectedIssue.updated)}</dd>
                </div>
              </dl>

              {selectedIssue.description && (
                <div className="kb-jira-detail__description">
                  <h4>Description</h4>
                  <p>{selectedIssue.description}</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default JiraIssues;
