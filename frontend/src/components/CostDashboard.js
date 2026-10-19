import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import { AG_GRID_MODULES, kbGridTheme } from "../gridTheme";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatCost(value) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 6,
    maximumFractionDigits: 8
  });
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

function CostDashboard({ active }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/gbrain/cost/summary`
      );

      if (!response.ok) {
        throw new Error(
          `Cost API returned HTTP ${response.status}`
        );
      }

      const data = await response.json();
      setDashboard(data);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to load cost-dashboard information."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) {
      loadDashboard();
    }
  }, [active, loadDashboard]);

  const modelColumnDefs = useMemo(
    () => [
      {
        headerName: "Model",
        field: "model",
        flex: 1.6,
        minWidth: 180,
        cellClass: "kb-model-name",
      },
      {
        headerName: "Requests",
        field: "requests",
        flex: 1,
        minWidth: 100,
        valueFormatter: (params) => formatNumber(params.value),
      },
      {
        headerName: "Input Tokens",
        field: "inputTokens",
        flex: 1,
        minWidth: 120,
        valueFormatter: (params) => formatNumber(params.value),
      },
      {
        headerName: "Output Tokens",
        field: "outputTokens",
        flex: 1,
        minWidth: 120,
        valueFormatter: (params) => formatNumber(params.value),
      },
      {
        headerName: "Total Tokens",
        field: "totalTokens",
        flex: 1,
        minWidth: 120,
        valueFormatter: (params) => formatNumber(params.value),
      },
      {
        headerName: "Estimated Cost",
        field: "estimatedCostUsd",
        flex: 1.2,
        minWidth: 150,
        valueFormatter: (params) => formatCost(params.value),
      },
    ],
    [],
  );

  const requestColumnDefs = useMemo(
    () => [
      {
        headerName: "Date",
        field: "timestamp",
        flex: 1.4,
        minWidth: 170,
        valueFormatter: (params) => formatDate(params.value),
      },
      {
        headerName: "Operation",
        field: "operation",
        flex: 1,
        minWidth: 110,
      },
      {
        headerName: "Model",
        field: "model",
        flex: 1.6,
        minWidth: 180,
        cellClass: "kb-model-name",
      },
      {
        headerName: "Input",
        field: "inputTokens",
        flex: 0.8,
        minWidth: 90,
        valueFormatter: (params) => formatNumber(params.value),
      },
      {
        headerName: "Output",
        field: "outputTokens",
        flex: 0.8,
        minWidth: 90,
        valueFormatter: (params) => formatNumber(params.value),
      },
      {
        headerName: "Cost",
        field: "estimatedCostUsd",
        flex: 1,
        minWidth: 110,
        valueFormatter: (params) => formatCost(params.value),
      },
    ],
    [],
  );

  const dashboardDefaultColDef = useMemo(
    () => ({ sortable: true, filter: true, resizable: true }),
    [],
  );

  if (!dashboard && loading) {
    return (
      <div className="kb-dashboard-message">
        Loading cost information...
      </div>
    );
  }

  if (!dashboard && error) {
    return (
      <div className="kb-dashboard-message kb-dashboard-message--error">
        <p>{error}</p>

        <button type="button" onClick={loadDashboard}>
          Try Again
        </button>
      </div>
    );
  }

  const data = dashboard || {
    totalRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
    modelBreakdown: {},
    recentRequests: []
  };

  const modelRows = Object.entries(data.modelBreakdown || {});

  return (
    <div className="kb-cost-dashboard">
      <div className="kb-cost-dashboard__heading">
        <div>
          <span className="kb-eyebrow">
            AI USAGE AND COST
          </span>

          <h1>Cost Dashboard</h1>

          <p>
            Monitor LLM requests, token consumption, and estimated
            OpenRouter cost.
          </p>
        </div>

        <button
          type="button"
          className="kb-refresh-button"
          onClick={loadDashboard}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="kb-inline-error">
          The previous information is shown, but refresh failed:
          {" "}
          {error}
        </div>
      )}

      <div className="kb-metric-grid">
        <MetricCard
          label="LLM Requests"
          value={formatNumber(data.totalRequests)}
          helper="Answer-generation requests"
        />

        <MetricCard
          label="Input Tokens"
          value={formatNumber(data.totalInputTokens)}
          helper="Tokens sent to the model"
        />

        <MetricCard
          label="Output Tokens"
          value={formatNumber(data.totalOutputTokens)}
          helper="Tokens generated by the model"
        />

        <MetricCard
          label="Total Tokens"
          value={formatNumber(data.totalTokens)}
          helper="Input and output combined"
        />

        <MetricCard
          label="Estimated Cost"
          value={formatCost(data.estimatedCostUsd)}
          helper="Based on configured pricing"
          highlighted
        />
      </div>

      <section className="kb-dashboard-panel">
        <div className="kb-dashboard-panel__header">
          <div>
            <h2>Usage by Model</h2>
            <p>Estimated usage grouped by the selected model.</p>
          </div>
        </div>

        {modelRows.length === 0 ? (
          <EmptyState message="No model usage has been recorded yet. Submit a question from the Q&A Workspace." />
        ) : (
          <div className="kb-ag-grid kb-ag-grid--compact">
            <AgGridProvider modules={AG_GRID_MODULES}>
              <AgGridReact
                theme={kbGridTheme}
                rowData={modelRows.map(([model, summary]) => ({
                  model,
                  ...summary,
                }))}
                columnDefs={modelColumnDefs}
                defaultColDef={dashboardDefaultColDef}
                getRowId={(params) => params.data.model}
                rowHeight={40}
                headerHeight={36}
                animateRows
                suppressCellFocus
              />
            </AgGridProvider>
          </div>
        )}
      </section>

      <section className="kb-dashboard-panel">
        <div className="kb-dashboard-panel__header">
          <div>
            <h2>Recent Requests</h2>
            <p>Most recent requests recorded by the Java API.</p>
          </div>
        </div>

        {!data.recentRequests?.length ? (
          <EmptyState message="No requests have been recorded during this application session." />
        ) : (
          <div className="kb-ag-grid">
            <AgGridProvider modules={AG_GRID_MODULES}>
              <AgGridReact
                theme={kbGridTheme}
                rowData={data.recentRequests}
                columnDefs={requestColumnDefs}
                defaultColDef={dashboardDefaultColDef}
                getRowId={(params) => String(params.data.id)}
                rowHeight={40}
                headerHeight={36}
                animateRows
                suppressCellFocus
              />
            </AgGridProvider>
          </div>
        )}
      </section>

      <p className="kb-cost-disclaimer">
        Cost values are estimates based on the pricing configured in
        the Spring Boot application. Current MVP data resets when the
        API restarts.
      </p>
    </div>
  );
}

function MetricCard({ label, value, helper, highlighted = false }) {
  return (
    <article
      className={`kb-metric-card ${
        highlighted ? "kb-metric-card--highlighted" : ""
      }`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

function EmptyState({ message }) {
  return (
    <div className="kb-dashboard-empty">
      {message}
    </div>
  );
}

export default CostDashboard;