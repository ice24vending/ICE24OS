"use client";
import { useEffect } from "react";

/**
 * Registry of screens with unsaved changes (F6-08, F6-11). A form calls `useUnsavedChanges(dirty)`;
 * the context selector asks `hasUnsavedChanges()` before switching, and the shell's
 * `UnsavedChangesGuard` confirms before in-app navigation, the browser's back button, closing the
 * tab and the end of the session.
 */
const dirty = new Set<symbol>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function useUnsavedChanges(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return undefined;
    const key = Symbol("unsaved");
    dirty.add(key);
    notify();
    return () => {
      if (dirty.delete(key)) notify();
    };
  }, [isDirty]);
}

export const hasUnsavedChanges = (): boolean => dirty.size > 0;

/** The viewer chose to leave: nothing asks again while the page goes away. */
export function discardUnsavedChanges(): void {
  if (dirty.size === 0) return;
  dirty.clear();
  notify();
}

export function subscribeUnsavedChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
