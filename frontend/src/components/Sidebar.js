import React from "react";

const menuItems = [
  {
    id: "chat",
    label: "Q&A Workspace",
    icon: "?"
  },
  {
    id: "admin",
    label: "Admin Ingestion",
    icon: "+"
  },
  {
    id: "cost",
    label: "Cost Dashboard",
    icon: "$"
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
        <div className="kb-sidebar__logo">K</div>

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
              {item.icon}
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
          KnowledgeBridge MVP
        </div>
      )}
    </aside>
  );
}

export default Sidebar;