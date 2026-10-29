"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

/**
 * A floating thumbstick for touch screens. The whole lower-left corner is the touch zone and the stick
 * appears under the thumb wherever it lands, so nobody has to find a small fixed circle. It tracks one
 * pointer only; every other finger falls through to the camera and the action buttons.
 */
export function Stick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const zone = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const id = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const R = 52;
  /* the latest callback, so a parent re-render never resets the stick mid-move */
  const cb = useRef(onMove);
  cb.current = onMove;

  const end = () => {
    id.current = null;
    if (base.current) base.current.style.opacity = "";
    if (knob.current) knob.current.style.transform = "";
    cb.current(0, 0);
  };
  useEffect(() => () => cb.current(0, 0), []);

  const move = (e: ReactPointerEvent) => {
    let dx = (e.clientX - origin.current.x) / R;
    let dy = (e.clientY - origin.current.y) / R;
    const m = Math.hypot(dx, dy);
    if (m > 1) {
      dx /= m;
      dy /= m;
    }
    if (knob.current) knob.current.style.transform = `translate(${dx * R}px, ${dy * R}px)`;
    cb.current(dx, -dy);
  };

  return (
    <div
      ref={zone}
      className="stick-zone"
      onPointerDown={(e) => {
        if (id.current !== null) return;
        id.current = e.pointerId;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* capture is optional */
        }
        const r = zone.current!.getBoundingClientRect();
        origin.current = { x: e.clientX, y: e.clientY };
        if (base.current) {
          base.current.style.left = `${e.clientX - r.left}px`;
          base.current.style.top = `${e.clientY - r.top}px`;
          base.current.style.opacity = "1";
        }
        move(e);
      }}
      onPointerMove={(e) => {
        if (e.pointerId === id.current) move(e);
      }}
      onPointerUp={(e) => {
        if (e.pointerId === id.current) end();
      }}
      onPointerCancel={(e) => {
        if (e.pointerId === id.current) end();
      }}
      onLostPointerCapture={(e) => {
        if (e.pointerId === id.current) end();
      }}
      aria-hidden="true"
    >
      <div className="stick-base" ref={base}>
        <div className="stick-knob" ref={knob} />
      </div>
      <span className="stick-hint">Move</span>
    </div>
  );
}

/** A button that reports press and release, for actions that last as long as the finger stays down. */
export function HoldButton({
  className,
  label,
  onDown,
  onUp,
  children,
}: {
  className: string;
  label: string;
  onDown: () => void;
  onUp?: () => void;
  children: ReactNode;
}) {
  const held = useRef<number | null>(null);
  const release = () => {
    if (held.current === null) return;
    held.current = null;
    onUp?.();
  };
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onPointerDown={(e) => {
        held.current = e.pointerId;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* capture is optional */
        }
        onDown();
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          if (!e.repeat) onDown();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") onUp?.();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

/** A modal panel with focus moved into it on open and handed back on close. */
export function Dialog({
  title,
  labelId,
  onClose,
  children,
  className = "",
}: {
  title: string;
  labelId: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = box.current?.querySelector<HTMLElement>("[data-autofocus], button, a, select");
    first?.focus({ preventScroll: true });
    return () => {
      if (prev && document.contains(prev) && prev.tagName !== "BODY") prev.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div
      className="scrim"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={box}
        className={`dialog ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        onKeyDown={(e) => {
          if (e.key !== "Tab" || !box.current) return;
          /* keep Tab inside the dialog */
          const items = Array.from(box.current.querySelectorAll<HTMLElement>("button, a, select, input")).filter(
            (el) => !el.hasAttribute("disabled"),
          );
          if (!items.length) return;
          const first = items[0];
          const last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }}
      >
        <h2 id={labelId} className="dialog-title">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
