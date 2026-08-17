import { useEffect, useRef, useState, type ReactNode } from "react";

export type MenuItem =
  | { divider: true }
  | {
      label: string;
      shortcut?: string;
      onClick: () => void;
      disabled?: boolean;
      danger?: boolean;
      checked?: boolean;
    };

export function Menu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="menu" ref={ref}>
      <button
        className={`menu-trigger${open ? " is-open" : ""}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          {items.map((item, i) =>
            "divider" in item ? (
              <div key={i} className="menu-divider" />
            ) : (
              <button
                key={i}
                role="menuitem"
                className={`menu-item${item.danger ? " is-danger" : ""}`}
                disabled={item.disabled}
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
              >
                <span className="menu-item-label">{item.label}</span>
                {item.checked !== undefined && <span className="menu-item-check">{item.checked ? "✓" : ""}</span>}
                {item.shortcut && <span className="menu-item-shortcut">{item.shortcut}</span>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

export function IconButton({
  children,
  onClick,
  title,
  active,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      className={`icon-btn${active ? " is-active" : ""}`}
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
