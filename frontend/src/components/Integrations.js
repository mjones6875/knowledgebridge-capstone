import React, { useCallback, useEffect, useState } from "react";
import {
  getIntegrationCapabilities,
  listIntegrations,
  testIntegrationConnection,
} from "../api/knowledgeBridgeApi";

function StatusPill({ status }) {
  const normalized = (status || "").toUpperCase();
  const variant =
    normalized === "CONNECTED"
      ? "connected"
      : normalized === "DISCONNECTED"
        ? "disconnected"
        : "unknown";

  const label =
    normalized === "CONNECTED"
      ? "Connected"
      : normalized === "DISCONNECTED"
        ? "Disconnected"
        : "Unknown";

  return (
    <span className={`kb-integration-status kb-integration-status--${variant}`}>
      {label}
    </span>
  );
}

// This page is admin-facing and intentionally separate from the Jira
// Issues page: it shows configured connections (gBrain, Atlassian Jira,
// the transcription service, OpenRouter), not business data. It is
// read-only for now and never displays tokens, emails, or credentials.
function Integrations({ active }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [testingId, setTestingId] = useState(null);

  const [capabilitiesFor, setCapabilitiesFor] = useState(null);
  const [capabilities, setCapabilities] = useState(null);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(false);
  const [capabilitiesError, setCapabilitiesError] = useState("");

  const loadConnections = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await listIntegrations();
      setConnections(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(
        requestError.message || "Unable to load integration status.",
      );
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, []);

  useEffect(() => {
    if (active && !hasLoadedOnce) {
      loadConnections();
    }
  }, [active, hasLoadedOnce, loadConnections]);

  async function handleTestConnection(id) {
    setTestingId(id);

    try {
      const updated = await testIntegrationConnection(id);
      setConnections((current) =>
        current.map((connection) =>
          connection.id === id ? updated : connection,
        ),
      );
    } catch (requestError) {
      setError(
        requestError.message || `Unable to test the ${id} connection.`,
      );
    } finally {
      setTestingId(null);
    }
  }

  async function handleViewCapabilities(connection) {
    setCapabilitiesFor(connection);
    setCapabilities(null);
    setCapabilitiesError("");
    setCapabilitiesLoading(true);

    try {
      const data = await getIntegrationCapabilities(connection.id);
      setCapabilities(data);
    } catch (requestError) {
      setCapabilitiesError(
        requestError.message ||
          `Unable to load capabilities for ${connection.name}.`,
      );
    } finally {
      setCapabilitiesLoading(false);
    }
  }

  return (
    <div className="kb-integrations">
      <div className="kb-integrations__heading">
        <div>
          <span className="kb-eyebrow">TECHNICAL CONFIGURATION</span>
          <h1>Integrations</h1>
          <p>
            Configured services behind KnowledgeBridge. Read-only in this
            release — no tokens, emails, or credentials are shown here.
          </p>
        </div>

        <button
          type="button"
          className="kb-refresh-button"
          onClick={loadConnections}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh status"}
        </button>
      </div>

      {error && <div className="kb-inline-error">{error}</div>}

      <div className="kb-integrations__body">
        <section className="kb-dashboard-panel kb-integrations__table-panel">
          {!loading && hasLoadedOnce && connections.length === 0 ? (
            <div className="kb-dashboard-empty">
              No connections are configured.
            </div>
          ) : (
            <table className="kb-integrations-table">
              <thead>
                <tr>
                  <th>Connection</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Purpose</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {connections.map((connection) => (
                  <tr key={connection.id}>
                    <td className="kb-integrations-table__name">
                      {connection.name}
                    </td>
                    <td>{connection.type}</td>
                    <td>
                      <StatusPill status={connection.status} />
                      {connection.detail && (
                        <div className="kb-integrations-table__detail">
                          {connection.detail}
                        </div>
                      )}
                    </td>
                    <td>{connection.purpose}</td>
                    <td className="kb-integrations-table__actions">
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => handleTestConnection(connection.id)}
                        disabled={testingId === connection.id}
                      >
                        {testingId === connection.id
                          ? "Testing..."
                          : "Test connection"}
                      </button>

                      <button
                        type="button"
                        className="text-button"
                        onClick={() => handleViewCapabilities(connection)}
                      >
                        View capabilities
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="kb-dashboard-panel kb-integrations__capabilities-panel">
          <div className="kb-dashboard-panel__header">
            <div>
              <h2>Supported Capabilities</h2>
              <p>
                {capabilitiesFor
                  ? capabilitiesFor.name
                  : "Choose a connection to view what it supports."}
              </p>
            </div>
          </div>

          {!capabilitiesFor && (
            <div className="kb-dashboard-empty">
              No connection selected.
            </div>
          )}

          {capabilitiesFor && capabilitiesLoading && (
            <div className="kb-dashboard-message">
              Loading capabilities...
            </div>
          )}

          {capabilitiesFor && !capabilitiesLoading && capabilitiesError && (
            <div className="kb-dashboard-message kb-dashboard-message--error">
              {capabilitiesError}
            </div>
          )}

          {capabilitiesFor &&
            !capabilitiesLoading &&
            !capabilitiesError &&
            capabilities && (
              <ul className="kb-integrations-capabilities">
                {(capabilities.capabilities || []).map((capability) => (
                  <li key={capability}>{capability}</li>
                ))}
              </ul>
            )}
        </section>
      </div>
    </div>
  );
}

export default Integrations;
