"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { darkThemeQuery, themeStorageKey } from "@/lib/theme";

const changeEvent = "portfolio-theme-change";

function readDarkTheme() {
  const theme = document.documentElement.dataset.theme;
  return theme ? theme === "dark" : window.matchMedia(darkThemeQuery).matches;
}

function subscribe(update: () => void) {
  const preference = window.matchMedia(darkThemeQuery);

  function onStorage(event: StorageEvent) {
    if (event.key !== themeStorageKey && event.key !== null) return;
    if (event.newValue === "dark" || event.newValue === "light") {
      document.documentElement.dataset.theme = event.newValue;
    } else {
      delete document.documentElement.dataset.theme;
    }
    update();
  }

  preference.addEventListener("change", update);
  window.addEventListener(changeEvent, update);
  window.addEventListener("storage", onStorage);
  return () => {
    preference.removeEventListener("change", update);
    window.removeEventListener(changeEvent, update);
    window.removeEventListener("storage", onStorage);
  };
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, readDarkTheme, () => false);

  function toggleTheme() {
    const theme = readDarkTheme() ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch {
      // Applying the preference still works when storage is disabled.
    }
    window.dispatchEvent(new Event(changeEvent));
  }

  return (
    <button
      type="button"
      aria-label="Dark theme"
      aria-pressed={dark}
      onClick={toggleTheme}
      className="inline-grid size-9 cursor-pointer place-items-center rounded-full border border-gray-300 text-gray-700 hover:border-current dark:border-gray-600 dark:text-gray-200"
    >
      <Sun className="size-4 dark:hidden" aria-hidden="true" />
      <Moon className="hidden size-4 dark:block" aria-hidden="true" />
    </button>
  );
}
