import React from "react";

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path
        d="M4 5.5h16a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H9l-4 3.5V16H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 15V4m0 0 3.5 3.5M12 4 8.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const menuItems = [
  {
    id: "chat",
    label: "Ask AI",
    Icon: ChatIcon
  },
  {
    id: "admin",
    label: "Knowledge Ingestion",
    Icon: UploadIcon
  },
  {
    id: "cost",
    label: "Usage & Cost",
    Icon: ChartIcon
  }
];

function Sidebar({
  activePage,
  onPageChange,
  collapsed,
  onToggle
}) {
  return (
    <aside
      className={`kb-sidebar ${
        collapsed ? "kb-sidebar--collapsed" : ""
      }`}
    >
      <div className="kb-sidebar__header">
        <div className="kb-sidebar__logo">KB</div>

        {!collapsed && (
          <div className="kb-sidebar__brand">
            <strong>KnowledgeBridge</strong>
            <span>AI Knowledge Platform</span>
          </div>
        )}

        <button
          type="button"
          className="kb-sidebar__toggle"
          onClick={onToggle}
          aria-label={collapsed ? "Expand menu" : "Collapse menu"}
          title={collapsed ? "Expand menu" : "Collapse menu"}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      <nav className="kb-sidebar__navigation">
        {menuItems.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`kb-sidebar__item ${
              activePage === item.id
                ? "kb-sidebar__item--active"
                : ""
            }`}
            onClick={() => onPageChange(item.id)}
            title={collapsed ? item.label : undefined}
          >
            <span className="kb-sidebar__icon">
              <item.Icon />
            </span>

            {!collapsed && (
              <span className="kb-sidebar__label">
                {item.label}
              </span>
            )}
          </button>
        ))}
      </nav>

      {!collapsed && (
        <div className="kb-sidebar__footer">
          <span className="kb-status-dot" aria-hidden="true" />
          Workspace connected
        </div>
      )}
    </aside>
  );
}

export default Sidebar;