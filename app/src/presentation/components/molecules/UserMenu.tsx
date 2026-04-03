"use client";

import { useState, useRef, useEffect } from "react";
import { Link } from "@/lib/i18n/navigation";
import { Avatar } from "../atoms/Avatar";

export interface UserMenuItem {
  href: string;
  label: string;
}

export interface UserMenuProps {
  user: {
    fullName: string;
    pronouns?: string | null;
    avatarUrl?: string | null;
  };
  menuItems: UserMenuItem[];
  signOutSlot: React.ReactNode;
}

export function UserMenu({ user, menuItems, signOutSlot }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-full transition-opacity hover:opacity-80"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar src={user.avatarUrl} alt={user.fullName} size="sm" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          <div className="px-3 py-2">
            <div className="text-sm font-medium text-gray-900">
              {user.fullName}
            </div>
            {user.pronouns && (
              <div className="text-xs text-gray-500">{user.pronouns}</div>
            )}
          </div>
          <hr className="my-1 border-gray-200" />
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
          <hr className="my-1 border-gray-200" />
          <div className="px-1 py-1" role="menuitem">
            {signOutSlot}
          </div>
        </div>
      )}
    </div>
  );
}
