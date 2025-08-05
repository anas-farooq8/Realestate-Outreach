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
    if (!entry) {
      console.log("🔍 Cache entry does not exist");
      return true;
    }
    const isExpired = Date.now() - entry.timestamp > this.CACHE_DURATION;
    const ageInMinutes = Math.floor(
      (Date.now() - entry.timestamp) / (1000 * 60)
    );
    console.log(`🔍 Cache age: ${ageInMinutes} minutes, expired: ${isExpired}`);
    return isExpired;
  }

  private isSameUser(entry: CacheEntry<any> | null): boolean {
    if (!entry || !this.currentUserId) {
      console.log(
        `🔍 User check failed - entry: ${!!entry}, currentUserId: ${!!this
          .currentUserId}`
      );
      return false;
    }
    const isSame = entry.userId === this.currentUserId;
    console.log(
      `🔍 User check - cached userId: ${entry.userId}, current userId: ${this.currentUserId}, same: ${isSame}`
    );
    return isSame;
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
        console.log("✅ Returning cached properties data", {
          dataLength: entry.data.length,
          cacheAge: Math.floor((Date.now() - entry.timestamp) / (1000 * 60)),
          userId: entry.userId,
        });
        return entry.data;
      }

      // Prevent concurrent fetches
      if (this.fetchingProperties) {
        console.log("⏳ Properties fetch already in progress, waiting...");
        // Wait for current fetch to complete
        await new Promise((resolve) => setTimeout(resolve, 100));
        return this.getProperties(); // Recursive call to check cache again
      }

      this.fetchingProperties = true;
      console.log("🔄 Fetching fresh properties data from database...");

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
      console.log(
        `💾 Cached ${data?.length || 0} properties for user ${userId}`
      );
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
        console.log("✅ Returning cached email templates data", {
          dataLength: entry.data.length,
          cacheAge: Math.floor((Date.now() - entry.timestamp) / (1000 * 60)),
          userId: entry.userId,
        });
        return entry.data;
      }

      // Prevent concurrent fetches
      if (this.fetchingEmailTemplates) {
        console.log("⏳ Email templates fetch already in progress, waiting...");
        // Wait for current fetch to complete
        await new Promise((resolve) => setTimeout(resolve, 100));
        return this.getEmailTemplates(); // Recursive call to check cache again
      }

      this.fetchingEmailTemplates = true;
      console.log("🔄 Fetching fresh email templates data from database...");

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
      console.log(
        `💾 Cached ${data?.length || 0} email templates for user ${userId}`
      );
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
      console.log("🗑️ Invalidating properties cache");
      this.cache.properties = null;
    } catch (error) {
      console.error("Error invalidating properties cache:", error);
    }
  }

  invalidateEmailTemplates(): void {
    try {
      console.log("🗑️ Invalidating email templates cache");
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
      console.log("🧹 Cache cleared successfully - all data removed");
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }

  // Force refresh data
  async refreshProperties(): Promise<Property[]> {
    try {
      console.log("🔄 Force refreshing properties data...");
      this.invalidateProperties();
      return await this.getProperties();
    } catch (error) {
      console.error("Error refreshing properties:", error);
      return this.cache.properties?.data || [];
    }
  }

  async refreshEmailTemplates(): Promise<EmailTemplate[]> {
    try {
      console.log("🔄 Force refreshing email templates data...");
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
    console.log(`📊 Properties cache valid: ${isValid}`, {
      hasEntry: !!entry,
      dataLength: entry?.data?.length || 0,
      userId: entry?.userId,
      timestamp: entry?.timestamp
        ? new Date(entry.timestamp).toISOString()
        : null,
    });
    return isValid;
  }

  hasValidEmailTemplatesCache(): boolean {
    const entry = this.cache.emailTemplates;
    const isValid =
      entry !== null && !this.isExpired(entry) && this.isSameUser(entry);
    console.log(`📊 Email templates cache valid: ${isValid}`, {
      hasEntry: !!entry,
      dataLength: entry?.data?.length || 0,
      userId: entry?.userId,
      timestamp: entry?.timestamp
        ? new Date(entry.timestamp).toISOString()
        : null,
    });
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
