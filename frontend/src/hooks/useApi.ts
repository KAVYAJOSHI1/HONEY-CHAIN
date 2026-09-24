"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

interface Options {
  /** Poll interval in ms. Polling pauses while the tab is hidden. */
  interval?: number;
}

/** Fetch JSON from the API with loading/error state, optional polling and manual refresh. */
export function useApi<T>(path: string | null, { interval }: Options = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(path !== null);
  const pathRef = useRef(path);
  pathRef.current = path;

  const refresh = useCallback(async () => {
    const current = pathRef.current;
    if (!current) return;
    try {
      const result = await api.get<T>(current);
      if (pathRef.current === current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (pathRef.current === current) setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      if (pathRef.current === current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(path !== null);
    setData(null);
    setError(null);
    refresh();
  }, [path, refresh]);

  useEffect(() => {
    if (!interval || !path) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, interval);
    return () => clearInterval(id);
  }, [interval, path, refresh]);

  return { data, error, loading, refresh, setData };
}
