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

  console.log(
    `🚀 [Properties Hook] Initialized with autoFetch: ${autoFetch}, refreshOnMount: ${refreshOnMount}`
  );

  const [data, setData] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false); // Only show loading when actually fetching from DB
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      // Prevent concurrent calls
      if (fetchingRef.current) return;

      try {
        fetchingRef.current = true;
        setError(null);

        console.log(
          `🚀 [Properties Hook] fetchData called - forceRefresh: ${forceRefresh}`
        );

        // Check if we have valid cache first
        const hasValidCache = dataCache.hasValidPropertiesCache();
        console.log(`🚀 [Properties Hook] hasValidCache: ${hasValidCache}`);

        // Only show loading if we're forcing refresh or don't have valid cache
        if (forceRefresh || !hasValidCache) {
          console.log(`🚀 [Properties Hook] Setting loading to true`);
          setLoading(true);
        }

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), 15000)
        );

        const dataPromise = forceRefresh
          ? dataCache.refreshProperties()
          : dataCache.getProperties();

        console.log(
          `🚀 [Properties Hook] Calling ${
            forceRefresh ? "refreshProperties" : "getProperties"
          }`
        );
        const properties = await Promise.race([dataPromise, timeoutPromise]);

        if (mountedRef.current) {
          const propertiesArray = properties as Property[];
          console.log(
            `🚀 [Properties Hook] Received ${propertiesArray.length} properties`
          );
          setData(propertiesArray);
          setInitialLoad(false);
        }
      } catch (err) {
        console.error("🚀 [Properties Hook] Error loading properties:", err);
        if (mountedRef.current) {
          setError(
            err instanceof Error ? err.message : "Failed to load properties"
          );
          // Don't clear data on error, keep showing cached data if available
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
    [data.length]
  );

  const invalidateCache = useCallback(() => {
    dataCache.invalidateProperties();
  }, []);

  const refresh = useCallback(async () => {
    return fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    mountedRef.current = true;

    if (autoFetch) {
      console.log(
        `🚀 [Properties Hook] useEffect triggered - calling fetchData(${refreshOnMount})`
      );
      fetchData(refreshOnMount);
    } else {
      console.log(
        `🚀 [Properties Hook] useEffect triggered - autoFetch disabled, skipping`
      );
    }

    return () => {
      console.log(`🚀 [Properties Hook] Component unmounting`);
      mountedRef.current = false;
    };
  }, [autoFetch, refreshOnMount, fetchData]);

  return {
    data,
    loading, // This will only be true when actually fetching from DB
    error,
    initialLoad,
    refetch: fetchData,
    refresh,
    invalidateCache,
    hasData: data.length > 0,
  };
}

export function useCachedEmailTemplates(options: UseCachedDataOptions = {}) {
  const { autoFetch = true, refreshOnMount = false } = options;

  console.log(
    `📧 [Email Templates Hook] Initialized with autoFetch: ${autoFetch}, refreshOnMount: ${refreshOnMount}`
  );

  const [data, setData] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      // Prevent concurrent calls
      if (fetchingRef.current) return;

      try {
        fetchingRef.current = true;
        setError(null);

        console.log(
          `📧 [Email Templates Hook] fetchData called - forceRefresh: ${forceRefresh}`
        );

        // Check if we have valid cache first
        const hasValidCache = dataCache.hasValidEmailTemplatesCache();
        console.log(
          `📧 [Email Templates Hook] hasValidCache: ${hasValidCache}`
        );

        // Show loading if:
        // 1. It's initial load and no valid cache
        // 2. Force refresh (refresh button clicked)
        // 3. No data and no valid cache
        if (initialLoad && !hasValidCache) {
          console.log(
            `📧 [Email Templates Hook] Setting loading to true (initial load)`
          );
          setLoading(true);
        } else if (forceRefresh) {
          console.log(
            `📧 [Email Templates Hook] Setting loading to true (force refresh)`
          );
          setLoading(true);
        } else if (data.length === 0 && !hasValidCache) {
          console.log(
            `📧 [Email Templates Hook] Setting loading to true (no data + no cache)`
          );
          setLoading(true);
        }

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), 15000)
        );

        const dataPromise = forceRefresh
          ? dataCache.refreshEmailTemplates()
          : dataCache.getEmailTemplates();

        console.log(
          `📧 [Email Templates Hook] Calling ${
            forceRefresh ? "refreshEmailTemplates" : "getEmailTemplates"
          }`
        );
        const templates = await Promise.race([dataPromise, timeoutPromise]);

        if (mountedRef.current) {
          const templatesArray = templates as EmailTemplate[];
          console.log(
            `📧 [Email Templates Hook] Received ${templatesArray.length} templates`
          );
          setData(templatesArray);
          setInitialLoad(false);
        }
      } catch (err) {
        console.error(
          "📧 [Email Templates Hook] Error loading email templates:",
          err
        );
        if (mountedRef.current) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load email templates"
          );
          // Don't clear data on error, keep showing cached data if available
          if (data.length === 0) {
            setData([]);
          }
          setInitialLoad(false);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
        fetchingRef.current = false;
      }
    },
    [data.length, initialLoad]
  );

  const invalidateCache = useCallback(() => {
    dataCache.invalidateEmailTemplates();
  }, []);

  const refresh = useCallback(async () => {
    return fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    mountedRef.current = true;

    if (autoFetch) {
      console.log(
        `📧 [Email Templates Hook] useEffect triggered - calling fetchData(${refreshOnMount})`
      );
      fetchData(refreshOnMount);
    } else {
      console.log(
        `📧 [Email Templates Hook] useEffect triggered - autoFetch disabled, skipping`
      );
    }

    return () => {
      console.log(`📧 [Email Templates Hook] Component unmounting`);
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
    invalidateCache,
    hasData: data.length > 0,
  };
}
