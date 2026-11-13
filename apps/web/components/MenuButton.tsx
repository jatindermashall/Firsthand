"use client";
import { useState } from "react";
import { Icon } from "./icons";
export function MenuButton({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="lg:hidden ml-auto w-11 h-11 rounded-xl border border-line bg-white flex items-center justify-center" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name={open ? "x" : "menu"} className="w-5 h-5" />
      </button>
      {open && <div className="lg:hidden basis-full border-t border-line pt-3 pb-1" onClick={() => setOpen(false)}>{children}</div>}
    </>
  );
}
