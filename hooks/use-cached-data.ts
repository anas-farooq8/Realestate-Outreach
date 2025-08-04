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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Prevent concurrent calls
    if (fetchingRef.current) return;

    try {
      fetchingRef.current = true;
      setLoading(true);
      setError(null);

      const properties = forceRefresh
        ? await dataCache.refreshProperties()
        : await dataCache.getProperties();

      setData(properties);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load properties"
      );
      setData([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  const invalidateCache = useCallback(() => {
    dataCache.invalidateProperties();
  }, []);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    if (autoFetch) {
      fetchData(refreshOnMount);
    }
  }, [autoFetch, refreshOnMount, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    refresh,
    invalidateCache,
  };
}

export function useCachedEmailTemplates(options: UseCachedDataOptions = {}) {
  const { autoFetch = true, refreshOnMount = false } = options;

  const [data, setData] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Prevent concurrent calls
    if (fetchingRef.current) return;

    try {
      fetchingRef.current = true;
      setLoading(true);
      setError(null);

      const templates = forceRefresh
        ? await dataCache.refreshEmailTemplates()
        : await dataCache.getEmailTemplates();

      setData(templates);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load email templates"
      );
      setData([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  const invalidateCache = useCallback(() => {
    dataCache.invalidateEmailTemplates();
  }, []);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    if (autoFetch) {
      fetchData(refreshOnMount);
    }
  }, [autoFetch, refreshOnMount, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    refresh,
    invalidateCache,
  };
}
