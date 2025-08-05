"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { dataCache } from "@/lib/cache";
import type { Property, EmailTemplate } from "@/lib/types";

interface UseCachedDataOptions {
  autoFetch?: boolean;
  refreshOnMount?: boolean;
}

export function useCachedProperties(options: UseCachedDataOptions = {}) {
  const { autoFetch = true, refreshOnMount = false } = options;

  const [data, setData] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      if (fetchingRef.current) return;

      try {
        fetchingRef.current = true;
        setError(null);

        const hasValidCache = dataCache.hasValidPropertiesCache();

        // Show loading for:
        // 1. Initial load (always show loading on first visit)
        // 2. Force refresh (user clicked refresh)
        // 3. No valid cache and no data
        if (
          initialLoad ||
          forceRefresh ||
          (!hasValidCache && data.length === 0)
        ) {
          setLoading(true);
        }

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), 15000)
        );

        const dataPromise = forceRefresh
          ? dataCache.refreshProperties()
          : dataCache.getProperties();

        const properties = await Promise.race([dataPromise, timeoutPromise]);

        if (mountedRef.current) {
          const propertiesArray = properties as Property[];
          setData(propertiesArray);
          setInitialLoad(false);
        }
      } catch (err) {
        if (!mountedRef.current) return;

        const errorMessage =
          err instanceof Error ? err.message : "Failed to load properties";

        // Don't show errors for auth-related issues during sign out
        if (
          errorMessage.includes("Auth session missing") ||
          errorMessage.includes("session not found") ||
          errorMessage.includes("No session")
        ) {
          setData([]);
          setError(null);
        } else {
          setError(errorMessage);
          if (data.length === 0) {
            setData([]);
          }
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setInitialLoad(false);
        }
        fetchingRef.current = false;
      }
    },
    [data.length, initialLoad]
  );

  const refresh = useCallback(async () => {
    return fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    mountedRef.current = true;

    if (autoFetch) {
      fetchData(refreshOnMount);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [autoFetch, refreshOnMount, fetchData]);

  return {
    data,
    loading,
    error,
    initialLoad,
    refetch: fetchData,
    refresh,
    hasData: data.length > 0,
  };
}

export function useCachedEmailTemplates(options: UseCachedDataOptions = {}) {
  const { autoFetch = true, refreshOnMount = false } = options;

  const [data, setData] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      if (fetchingRef.current) return;

      try {
        fetchingRef.current = true;
        setError(null);

        const hasValidCache = dataCache.hasValidEmailTemplatesCache();

        // Show loading for:
        // 1. Initial load (always show loading on first visit)
        // 2. Force refresh (user clicked refresh)
        // 3. No valid cache and no data
        if (
          initialLoad ||
          forceRefresh ||
          (!hasValidCache && data.length === 0)
        ) {
          setLoading(true);
        }

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), 15000)
        );

        const dataPromise = forceRefresh
          ? dataCache.refreshEmailTemplates()
          : dataCache.getEmailTemplates();

        const templates = await Promise.race([dataPromise, timeoutPromise]);

        if (mountedRef.current) {
          const templatesArray = templates as EmailTemplate[];
          setData(templatesArray);
          setInitialLoad(false);
        }
      } catch (err) {
        if (!mountedRef.current) return;

        const errorMessage =
          err instanceof Error ? err.message : "Failed to load email templates";

        // Don't show errors for auth-related issues during sign out
        if (
          errorMessage.includes("Auth session missing") ||
          errorMessage.includes("session not found") ||
          errorMessage.includes("No session")
        ) {
          setData([]);
          setError(null);
        } else {
          setError(errorMessage);
          if (data.length === 0) {
            setData([]);
          }
        }
        setInitialLoad(false);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
        fetchingRef.current = false;
      }
    },
    [data.length, initialLoad]
  );

  const refresh = useCallback(async () => {
    return fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    mountedRef.current = true;

    if (autoFetch) {
      fetchData(refreshOnMount);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [autoFetch, refreshOnMount, fetchData]);

  return {
    data,
    loading,
    error,
    initialLoad,
    refetch: fetchData,
    refresh,
    hasData: data.length > 0,
  };
}
