import { createClient } from "@/lib/supabase/client";
import type { Property, EmailTemplate } from "@/lib/types";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  userId: string;
}

interface CacheStore {
  properties: CacheEntry<Property[]> | null;
  emailTemplates: CacheEntry<EmailTemplate[]> | null;
}

class DataCache {
  private cache: CacheStore = {
    properties: null,
    emailTemplates: null,
  };

  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private supabase = createClient();
  private currentUserId: string | null = null;
  private fetchingProperties = false;
  private fetchingEmailTemplates = false;

  private isExpired(entry: CacheEntry<any> | null): boolean {
    if (!entry) return true;
    return Date.now() - entry.timestamp > this.CACHE_DURATION;
  }

  private isSameUser(entry: CacheEntry<any> | null): boolean {
    if (!entry || !this.currentUserId) return false;
    return entry.userId === this.currentUserId;
  }

  async getCurrentUserId(): Promise<string | null> {
    try {
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser();

      if (error) {
        console.error("Error getting user:", error);
        this.currentUserId = null;
        return null;
      }

      this.currentUserId = user?.id || null;
      return this.currentUserId;
    } catch (error) {
      console.error("Error in getCurrentUserId:", error);
      this.currentUserId = null;
      return null;
    }
  }

  private async isUserAuthenticated(): Promise<boolean> {
    const userId = await this.getCurrentUserId();
    return userId !== null;
  }

  async getProperties(): Promise<Property[]> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        console.warn(
          "User not authenticated, returning empty properties array"
        );
        return [];
      }

      const entry = this.cache.properties;

      // Check if cache exists and is valid
      if (entry && !this.isExpired(entry) && this.isSameUser(entry)) {
        return entry.data;
      }

      // Prevent concurrent fetches
      if (this.fetchingProperties) {
        // Wait for current fetch to complete
        await new Promise((resolve) => setTimeout(resolve, 100));
        return this.getProperties(); // Recursive call to check cache again
      }

      this.fetchingProperties = true;

      // Fetch fresh data
      const { data, error } = await this.supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching properties:", error);
        this.fetchingProperties = false;
        return entry?.data || []; // Return cached data if available
      }

      // Cache the result
      this.cache.properties = {
        data: data || [],
        timestamp: Date.now(),
        userId,
      };

      this.fetchingProperties = false;
      return data || [];
    } catch (error) {
      console.error("Error in getProperties:", error);
      this.fetchingProperties = false;
      // Return cached data if available, otherwise empty array
      return this.cache.properties?.data || [];
    }
  }

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        console.warn(
          "User not authenticated, returning empty email templates array"
        );
        return [];
      }

      const entry = this.cache.emailTemplates;

      // Check if cache exists and is valid
      if (entry && !this.isExpired(entry) && this.isSameUser(entry)) {
        return entry.data;
      }

      // Prevent concurrent fetches
      if (this.fetchingEmailTemplates) {
        // Wait for current fetch to complete
        await new Promise((resolve) => setTimeout(resolve, 100));
        return this.getEmailTemplates(); // Recursive call to check cache again
      }

      this.fetchingEmailTemplates = true;

      // Fetch fresh data
      const { data, error } = await this.supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching email templates:", error);
        this.fetchingEmailTemplates = false;
        return entry?.data || []; // Return cached data if available
      }

      // Cache the result
      this.cache.emailTemplates = {
        data: data || [],
        timestamp: Date.now(),
        userId,
      };

      this.fetchingEmailTemplates = false;
      return data || [];
    } catch (error) {
      console.error("Error in getEmailTemplates:", error);
      this.fetchingEmailTemplates = false;
      // Return cached data if available, otherwise empty array
      return this.cache.emailTemplates?.data || [];
    }
  }

  // Safe methods that check authentication first
  async safeGetProperties(): Promise<Property[]> {
    const isAuth = await this.isUserAuthenticated();
    if (!isAuth) {
      return [];
    }
    return this.getProperties();
  }

  async safeGetEmailTemplates(): Promise<EmailTemplate[]> {
    const isAuth = await this.isUserAuthenticated();
    if (!isAuth) {
      return [];
    }
    return this.getEmailTemplates();
  }

  // Invalidate cache when data is modified
  invalidateProperties(): void {
    try {
      this.cache.properties = null;
    } catch (error) {
      console.error("Error invalidating properties cache:", error);
    }
  }

  invalidateEmailTemplates(): void {
    try {
      this.cache.emailTemplates = null;
    } catch (error) {
      console.error("Error invalidating email templates cache:", error);
    }
  }

  // Clear all cache (e.g., on logout)
  clearAll(): void {
    try {
      this.cache = {
        properties: null,
        emailTemplates: null,
      };
      this.currentUserId = null;
      this.fetchingProperties = false;
      this.fetchingEmailTemplates = false;
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }

  // Force refresh data
  async refreshProperties(): Promise<Property[]> {
    try {
      this.invalidateProperties();
      return await this.getProperties();
    } catch (error) {
      console.error("Error refreshing properties:", error);
      return this.cache.properties?.data || [];
    }
  }

  async refreshEmailTemplates(): Promise<EmailTemplate[]> {
    try {
      this.invalidateEmailTemplates();
      return await this.getEmailTemplates();
    } catch (error) {
      console.error("Error refreshing email templates:", error);
      return this.cache.emailTemplates?.data || [];
    }
  }

  // Safe refresh methods
  async safeRefreshProperties(): Promise<Property[]> {
    const isAuth = await this.isUserAuthenticated();
    if (!isAuth) {
      return [];
    }
    return this.refreshProperties();
  }

  async safeRefreshEmailTemplates(): Promise<EmailTemplate[]> {
    const isAuth = await this.isUserAuthenticated();
    if (!isAuth) {
      return [];
    }
    return this.refreshEmailTemplates();
  }

  // Check if cache has data for current user
  hasValidPropertiesCache(): boolean {
    const entry = this.cache.properties;
    const isValid =
      entry !== null && !this.isExpired(entry) && this.isSameUser(entry);
    return isValid;
  }

  hasValidEmailTemplatesCache(): boolean {
    const entry = this.cache.emailTemplates;
    const isValid =
      entry !== null && !this.isExpired(entry) && this.isSameUser(entry);
    return isValid;
  }

  // Check if currently fetching data
  isFetchingProperties(): boolean {
    return this.fetchingProperties;
  }

  isFetchingEmailTemplates(): boolean {
    return this.fetchingEmailTemplates;
  }

  // Get cache status
  getCacheStatus() {
    return {
      properties: {
        cached: this.cache.properties !== null,
        valid: this.hasValidPropertiesCache(),
        fetching: this.fetchingProperties,
        timestamp: this.cache.properties?.timestamp || null,
        userId: this.cache.properties?.userId || null,
        dataLength: this.cache.properties?.data?.length || 0,
      },
      emailTemplates: {
        cached: this.cache.emailTemplates !== null,
        valid: this.hasValidEmailTemplatesCache(),
        fetching: this.fetchingEmailTemplates,
        timestamp: this.cache.emailTemplates?.timestamp || null,
        userId: this.cache.emailTemplates?.userId || null,
        dataLength: this.cache.emailTemplates?.data?.length || 0,
      },
      currentUserId: this.currentUserId,
    };
  }

  // Get cache age in minutes
  getCacheAge(type: "properties" | "emailTemplates"): number | null {
    const entry = this.cache[type];
    if (!entry) return null;
    return Math.floor((Date.now() - entry.timestamp) / (1000 * 60));
  }
}

// Export singleton instance
export const dataCache = new DataCache();
