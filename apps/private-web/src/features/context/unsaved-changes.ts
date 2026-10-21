"use client";
import { useEffect } from "react";

/**
 * Registry of screens with unsaved changes (F6-08). A form calls `useUnsavedChanges(dirty)`;
 * the context selector asks `hasUnsavedChanges()` before switching and confirms first.
 * shortcut: only the context selector consults it; F6-11 adds in-app navigation, beforeunload
 * and session expiry on top of this same registry.
 */
const dirty = new Set<symbol>();

export function useUnsavedChanges(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return undefined;
    const key = Symbol("unsaved");
    dirty.add(key);
    return () => {
      dirty.delete(key);
    };
  }, [isDirty]);
}

export const hasUnsavedChanges = (): boolean => dirty.size > 0;
