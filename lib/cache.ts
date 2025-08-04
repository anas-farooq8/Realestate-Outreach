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
      } = await this.supabase.auth.getUser();
      this.currentUserId = user?.id || null;
      return this.currentUserId;
    } catch {
      return null;
    }
  }
  async getProperties(): Promise<Property[]> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const entry = this.cache.properties;

    // Check if cache exists and is valid
    if (entry && !this.isExpired(entry) && this.isSameUser(entry)) {
      return entry.data;
    }

    // Fetch fresh data
    try {
      const { data, error } = await this.supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Cache the result
      this.cache.properties = {
        data: data || [],
        timestamp: Date.now(),
        userId,
      };

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const entry = this.cache.emailTemplates;

    // Check if cache exists and is valid
    if (entry && !this.isExpired(entry) && this.isSameUser(entry)) {
      return entry.data;
    }

    // Fetch fresh data
    try {
      const { data, error } = await this.supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Cache the result
      this.cache.emailTemplates = {
        data: data || [],
        timestamp: Date.now(),
        userId,
      };

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  // Invalidate cache when data is modified
  invalidateProperties(): void {
    this.cache.properties = null;
  }

  invalidateEmailTemplates(): void {
    this.cache.emailTemplates = null;
  }

  // Clear all cache (e.g., on logout)
  clearAll(): void {
    this.cache = {
      properties: null,
      emailTemplates: null,
    };
    this.currentUserId = null;
  }

  // Force refresh data
  async refreshProperties(): Promise<Property[]> {
    this.invalidateProperties();
    return this.getProperties();
  }

  async refreshEmailTemplates(): Promise<EmailTemplate[]> {
    this.invalidateEmailTemplates();
    return this.getEmailTemplates();
  }
}

// Export singleton instance
export const dataCache = new DataCache();
