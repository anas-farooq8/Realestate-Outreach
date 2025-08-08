"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dataCache } from "@/lib/cache";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  isRootUser: boolean;
  isLoading: boolean;
  isAuthInitialized: boolean;
  checkRootUser: () => Promise<boolean>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isRootUser, setIsRootUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  const [rootUserCache, setRootUserCache] = useState<{
    userId: string;
    isRoot: boolean;
    timestamp: number;
  } | null>(null);

  const supabase = createClient();

  // Cache root user check for 5 minutes (same as dataCache)
  const CACHE_DURATION = 5 * 60 * 1000;

  const checkRootUser = async (): Promise<boolean> => {
    // Use dataCache to get current user ID (leverages its caching)
    const userId = await dataCache.getCurrentUserId();
    if (!userId) {
      setIsRootUser(false);
      return false;
    }

    // Check our local cache first
    if (
      rootUserCache &&
      rootUserCache.userId === userId &&
      Date.now() - rootUserCache.timestamp < CACHE_DURATION
    ) {
      setIsRootUser(rootUserCache.isRoot);
      return rootUserCache.isRoot;
    }

    try {
      const response = await fetch("/api/check-root-user");
      const data = await response.json();
      const isRoot = data.isRootUser;

      // Update cache
      setRootUserCache({
        userId,
        isRoot,
        timestamp: Date.now(),
      });

      setIsRootUser(isRoot);
      return isRoot;
    } catch (error) {
      console.error("Failed to check root user status:", error);
      setIsRootUser(false);
      return false;
    }
  };

  const updateUserFromCache = async () => {
    try {
      const userId = await dataCache.getCurrentUserId();
      if (!userId) {
        setUser(null);
        return;
      }

      // If we already have the correct user, don't refetch
      if (user && user.id === userId) {
        return;
      }

      // Get full user details from Supabase - but only if we don't have the user yet
      // This avoids duplicate calls since dataCache.getCurrentUserId() already validates the session
      const {
        data: { user: currentUser },
        error,
      } = await supabase.auth.getUser();

      if (error || !currentUser || currentUser.id !== userId) {
        setUser(null);
        return;
      }

      setUser(currentUser);
    } catch (error) {
      console.error("Failed to update user from cache:", error);
      setUser(null);
    }
  };

  const refreshAuth = async () => {
    setIsLoading(true);
    try {
      await updateUserFromCache();
      await checkRootUser();
    } catch (error) {
      console.error("Failed to refresh auth:", error);
      setUser(null);
      setIsRootUser(false);
      setRootUserCache(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await updateUserFromCache();
        await checkRootUser();
        setIsAuthInitialized(true);
      } catch (error) {
        console.error("Auth initialization error:", error);
        setUser(null);
        setIsRootUser(false);
        setIsAuthInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Auth state listener - dataCache will handle the auth state changes
    // We just need to sync our local state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setIsRootUser(false);
        setRootUserCache(null);
        setIsAuthInitialized(true);
        setIsLoading(false);
        // dataCache.clearAllSafe() is already called in the navbar's auth listener
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setIsLoading(false);
        setIsAuthInitialized(true);
        // Let dataCache handle the user caching, then sync our state
        await updateUserFromCache();
        await checkRootUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const contextValue: AuthContextType = {
    user,
    isRootUser,
    isLoading,
    isAuthInitialized,
    checkRootUser,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
