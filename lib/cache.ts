import { createClient } from "@/lib/supabase/client";
import type {
  Property,
  EmailTemplate,
  EmailLog,
  CampaignProgress,
  DashboardStats,
  WeeklyStats,
} from "@/lib/types";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  userId: string;
}

interface CacheStore {
  properties: CacheEntry<Property[]> | null;
  emailTemplates: CacheEntry<EmailTemplate[]> | null;
  emailLogs: CacheEntry<EmailLog[]> | null;
  campaignProgress: CacheEntry<CampaignProgress | null> | null;
  dashboardStats: CacheEntry<DashboardStats> | null;
}

class DataCache {
  private cache: CacheStore = {
    properties: null,
    emailTemplates: null,
    emailLogs: null,
    campaignProgress: null,
    dashboardStats: null,
  };

  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private supabase = createClient();
  private currentUserId: string | null = null;
  private fetchingProperties = false;
  private fetchingEmailTemplates = false;
  private fetchingEmailLogs = false;
  private fetchingCampaignProgress = false;
  private fetchingDashboardStats = false;

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
      // Check if we have a session first
      const {
        data: { session },
        error: sessionError,
      } = await this.supabase.auth.getSession();

      if (sessionError || !session) {
        this.currentUserId = null;
        return null;
      }

      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser();

      if (error || !user) {
        this.currentUserId = null;
        return null;
      }

      this.currentUserId = user.id;
      return this.currentUserId;
    } catch (error) {
      // Silently handle auth errors during sign out
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
        // Silently return empty array when not authenticated
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

  async getEmailLogs(): Promise<EmailLog[]> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        console.warn(
          "User not authenticated, returning empty email logs array"
        );
        return [];
      }

      const entry = this.cache.emailLogs;

      // Check if cache exists and is valid
      if (entry && !this.isExpired(entry) && this.isSameUser(entry)) {
        return entry.data;
      }

      // Prevent concurrent fetches
      if (this.fetchingEmailLogs) {
        // Wait for current fetch to complete
        await new Promise((resolve) => setTimeout(resolve, 100));
        return this.getEmailLogs(); // Recursive call to check cache again
      }

      this.fetchingEmailLogs = true;

      // Fetch email logs with related data using joins
      const { data, error } = await this.supabase
        .from("email_logs")
        .select(
          `
          *,
          properties(
            id,
            property_address,
            decision_maker_name,
            decision_maker_email,
            state,
            city,
            county,
            zip_code
          ),
          email_templates(
            id,
            template_name,
            subject
          )
        `
        )
        .order("sent_at", { ascending: false });

      if (error) {
        console.error("Error fetching email logs:", error);
        this.fetchingEmailLogs = false;
        return entry?.data || [];
      }

      // Cache the result
      this.cache.emailLogs = {
        data: data || [],
        timestamp: Date.now(),
        userId,
      };

      this.fetchingEmailLogs = false;
      return data || [];
    } catch (error) {
      console.error("Error in getEmailLogs:", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      this.fetchingEmailLogs = false;
      // Return cached data if available, otherwise empty array
      return this.cache.emailLogs?.data || [];
    }
  }

  async getCampaignProgress(): Promise<CampaignProgress | null> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        console.warn(
          "User not authenticated, returning null campaign progress"
        );
        return null;
      }

      const entry = this.cache.campaignProgress;

      // Check if cache exists and is valid
      if (entry && !this.isExpired(entry) && this.isSameUser(entry)) {
        return entry.data;
      }

      // Prevent concurrent fetches
      if (this.fetchingCampaignProgress) {
        // Wait for current fetch to complete
        await new Promise((resolve) => setTimeout(resolve, 100));
        return this.getCampaignProgress(); // Recursive call to check cache again
      }

      this.fetchingCampaignProgress = true;

      // Fetch fresh data
      const { data, error } = await this.supabase
        .from("campaign_progress")
        .select("*")
        .order("id", { ascending: false })
        .limit(1); // Assuming we only need the latest progress

      if (error) {
        console.error("Error fetching campaign progress:", error);
        this.fetchingCampaignProgress = false;
        return entry?.data || null; // Return cached data if available
      }

      // Cache the result
      this.cache.campaignProgress = {
        data: data ? data[0] : null, // Extract the single object from the array
        timestamp: Date.now(),
        userId,
      };

      this.fetchingCampaignProgress = false;
      return data ? data[0] : null;
    } catch (error) {
      console.error("Error in getCampaignProgress:", error);
      this.fetchingCampaignProgress = false;
      // Return cached data if available, otherwise null
      return this.cache.campaignProgress?.data || null;
    }
  }

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return {
          totalProperties: 0,
          totalEmailsSent: 0,
          totalReplies: 0,
          replyRate: 0,
          currentWeek: 1,
          activeTemplates: 0,
          weeklyStats: [],
        };
      }

      const entry = this.cache.dashboardStats;

      if (entry && !this.isExpired(entry) && this.isSameUser(entry)) {
        return entry.data;
      }

      if (this.fetchingDashboardStats) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return this.getDashboardStats();
      }

      this.fetchingDashboardStats = true;

      // Try to use cached data first to avoid duplicate requests
      let properties: Property[] = [];
      let emailLogs: EmailLog[] = [];
      let campaignProgress: CampaignProgress | null = null;
      let emailTemplates: EmailTemplate[] = [];

      // Use cached data if available and valid
      const propertiesEntry = this.cache.properties;
      const emailLogsEntry = this.cache.emailLogs;
      const campaignProgressEntry = this.cache.campaignProgress;
      const emailTemplatesEntry = this.cache.emailTemplates;

      const needsProperties =
        !propertiesEntry ||
        this.isExpired(propertiesEntry) ||
        !this.isSameUser(propertiesEntry);
      const needsEmailLogs =
        !emailLogsEntry ||
        this.isExpired(emailLogsEntry) ||
        !this.isSameUser(emailLogsEntry);
      const needsCampaignProgress =
        !campaignProgressEntry ||
        this.isExpired(campaignProgressEntry) ||
        !this.isSameUser(campaignProgressEntry);
      const needsEmailTemplates =
        !emailTemplatesEntry ||
        this.isExpired(emailTemplatesEntry) ||
        !this.isSameUser(emailTemplatesEntry);

      // Use cached data when available
      if (!needsProperties) {
        properties = propertiesEntry.data;
      }
      if (!needsEmailLogs) {
        emailLogs = emailLogsEntry.data;
      }
      if (!needsCampaignProgress) {
        campaignProgress = campaignProgressEntry.data;
      }
      if (!needsEmailTemplates) {
        emailTemplates = emailTemplatesEntry.data;
      }

      // Fetch missing data only
      if (needsProperties) {
        // For stats, we only need count, so we can just get IDs
        const { data: propertiesData, error: propertiesError } =
          await this.supabase
            .from("properties")
            .select("id")
            .order("created_at", { ascending: false });

        if (!propertiesError && propertiesData) {
          // For stats calculation, we only need the count
          properties = propertiesData as any[]; // Use as any[] since we only need length
        }
      }

      if (needsEmailLogs) {
        const { data: emailLogsData, error: emailLogsError } =
          await this.supabase
            .from("email_logs")
            .select("id, campaign_week, replied, sent_at");

        if (!emailLogsError && emailLogsData) {
          // For stats calculation, we only need these fields
          emailLogs = emailLogsData as EmailLog[];
        }
      }

      if (needsCampaignProgress) {
        const { data: campaignProgressData, error: campaignProgressError } =
          await this.supabase
            .from("campaign_progress")
            .select("*")
            .order("id", { ascending: false })
            .limit(1);

        if (!campaignProgressError) {
          campaignProgress =
            campaignProgressData && campaignProgressData.length > 0
              ? campaignProgressData[0]
              : null;
          // Update cache for future use
          this.cache.campaignProgress = {
            data: campaignProgress,
            timestamp: Date.now(),
            userId,
          };
        }
      }

      if (needsEmailTemplates) {
        const { data: emailTemplatesData, error: emailTemplatesError } =
          await this.supabase
            .from("email_templates")
            .select("id, is_active")
            .eq("is_active", true);

        if (!emailTemplatesError && emailTemplatesData) {
          // For stats calculation, we only need these fields
          emailTemplates = emailTemplatesData as EmailTemplate[];
        }
      }

      // Calculate stats from the data (cached or fresh)
      const totalProperties = properties.length;
      const totalEmailsSent = emailLogs.length;
      const totalReplies = emailLogs.filter((log) => log.replied).length;
      const replyRate =
        totalEmailsSent > 0 ? (totalReplies / totalEmailsSent) * 100 : 0;
      const currentWeek = campaignProgress?.current_week || 1;
      const activeTemplates = emailTemplates.filter((t) => t.is_active).length;

      // Calculate weekly stats
      const weeklyStatsMap = new Map<
        number,
        { sent: number; replies: number }
      >();

      emailLogs.forEach((log) => {
        const week = log.campaign_week;
        if (!weeklyStatsMap.has(week)) {
          weeklyStatsMap.set(week, { sent: 0, replies: 0 });
        }
        const stats = weeklyStatsMap.get(week)!;
        stats.sent++;
        if (log.replied) {
          stats.replies++;
        }
      });

      const weeklyStats = Array.from(weeklyStatsMap.entries())
        .map(([week, stats]) => ({
          week,
          emailsSent: stats.sent,
          replies: stats.replies,
          replyRate: stats.sent > 0 ? (stats.replies / stats.sent) * 100 : 0,
          date: `Week ${week}`,
        }))
        .sort((a, b) => a.week - b.week);

      const dashboardStats: DashboardStats = {
        totalProperties,
        totalEmailsSent,
        totalReplies,
        replyRate,
        currentWeek,
        activeTemplates,
        weeklyStats,
      };

      this.cache.dashboardStats = {
        data: dashboardStats,
        timestamp: Date.now(),
        userId,
      };

      this.fetchingDashboardStats = false;
      return dashboardStats;
    } catch (error) {
      console.error("Error in getDashboardStats:", error);
      this.fetchingDashboardStats = false;
      return (
        this.cache.dashboardStats?.data || {
          totalProperties: 0,
          totalEmailsSent: 0,
          totalReplies: 0,
          replyRate: 0,
          currentWeek: 1,
          activeTemplates: 0,
          weeklyStats: [],
        }
      );
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

  async safeGetEmailLogs(): Promise<EmailLog[]> {
    const isAuth = await this.isUserAuthenticated();
    if (!isAuth) {
      return [];
    }
    return this.getEmailLogs();
  }

  async safeGetCampaignProgress(): Promise<CampaignProgress | null> {
    const isAuth = await this.isUserAuthenticated();
    if (!isAuth) {
      return null;
    }
    return this.getCampaignProgress();
  }

  async safeGetDashboardStats(): Promise<DashboardStats> {
    const isAuth = await this.isUserAuthenticated();
    if (!isAuth) {
      return {
        totalProperties: 0,
        totalEmailsSent: 0,
        totalReplies: 0,
        replyRate: 0,
        currentWeek: 1,
        activeTemplates: 0,
        weeklyStats: [],
      };
    }
    return this.getDashboardStats();
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

  invalidateEmailLogs(): void {
    try {
      this.cache.emailLogs = null;
    } catch (error) {
      console.error("Error invalidating email logs cache:", error);
    }
  }

  invalidateCampaignProgress(): void {
    try {
      this.cache.campaignProgress = null;
    } catch (error) {
      console.error("Error invalidating campaign progress cache:", error);
    }
  }

  invalidateDashboardStats(): void {
    try {
      this.cache.dashboardStats = null;
    } catch (error) {
      console.error("Error invalidating dashboard stats cache:", error);
    }
  }

  // Clear all cache (e.g., on logout)
  clearAll(): void {
    try {
      this.cache = {
        properties: null,
        emailTemplates: null,
        emailLogs: null,
        campaignProgress: null,
        dashboardStats: null,
      };
      this.currentUserId = null;
      this.fetchingProperties = false;
      this.fetchingEmailTemplates = false;
      this.fetchingEmailLogs = false;
      this.fetchingCampaignProgress = false;
      this.fetchingDashboardStats = false;
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

  async refreshEmailLogs(): Promise<EmailLog[]> {
    try {
      this.invalidateEmailLogs();
      return await this.getEmailLogs();
    } catch (error) {
      console.error("Error refreshing email logs:", error);
      return this.cache.emailLogs?.data || [];
    }
  }

  async refreshCampaignProgress(): Promise<CampaignProgress | null> {
    try {
      this.invalidateCampaignProgress();
      return await this.getCampaignProgress();
    } catch (error) {
      console.error("Error refreshing campaign progress:", error);
      return this.cache.campaignProgress?.data || null;
    }
  }

  async refreshDashboardStats(): Promise<DashboardStats> {
    try {
      this.invalidateDashboardStats();
      return await this.getDashboardStats();
    } catch (error) {
      console.error("Error refreshing dashboard stats:", error);
      return (
        this.cache.dashboardStats?.data || {
          totalProperties: 0,
          totalEmailsSent: 0,
          totalReplies: 0,
          replyRate: 0,
          currentWeek: 1,
          activeTemplates: 0,
          weeklyStats: [],
        }
      );
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

  async safeRefreshEmailLogs(): Promise<EmailLog[]> {
    const isAuth = await this.isUserAuthenticated();
    if (!isAuth) {
      return [];
    }
    return this.refreshEmailLogs();
  }

  async safeRefreshCampaignProgress(): Promise<CampaignProgress | null> {
    const isAuth = await this.isUserAuthenticated();
    if (!isAuth) {
      return null;
    }
    return this.refreshCampaignProgress();
  }

  async safeRefreshDashboardStats(): Promise<DashboardStats> {
    const isAuth = await this.isUserAuthenticated();
    if (!isAuth) {
      return {
        totalProperties: 0,
        totalEmailsSent: 0,
        totalReplies: 0,
        replyRate: 0,
        currentWeek: 1,
        activeTemplates: 0,
        weeklyStats: [],
      };
    }
    return this.refreshDashboardStats();
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

  hasValidEmailLogsCache(): boolean {
    const entry = this.cache.emailLogs;
    const isValid =
      entry !== null && !this.isExpired(entry) && this.isSameUser(entry);
    return isValid;
  }

  hasValidCampaignProgressCache(): boolean {
    const entry = this.cache.campaignProgress;
    const isValid =
      entry !== null && !this.isExpired(entry) && this.isSameUser(entry);
    return isValid;
  }

  hasValidDashboardStatsCache(): boolean {
    const entry = this.cache.dashboardStats;
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

  isFetchingEmailLogs(): boolean {
    return this.fetchingEmailLogs;
  }

  isFetchingCampaignProgress(): boolean {
    return this.fetchingCampaignProgress;
  }

  isFetchingDashboardStats(): boolean {
    return this.fetchingDashboardStats;
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
      emailLogs: {
        cached: this.cache.emailLogs !== null,
        valid: this.hasValidEmailLogsCache(),
        fetching: this.fetchingEmailLogs,
        timestamp: this.cache.emailLogs?.timestamp || null,
        userId: this.cache.emailLogs?.userId || null,
        dataLength: this.cache.emailLogs?.data?.length || 0,
      },
      campaignProgress: {
        cached: this.cache.campaignProgress !== null,
        valid: this.hasValidCampaignProgressCache(),
        fetching: this.fetchingCampaignProgress,
        timestamp: this.cache.campaignProgress?.timestamp || null,
        userId: this.cache.campaignProgress?.userId || null,
        dataLength: this.cache.campaignProgress?.data ? 1 : 0,
      },
      dashboardStats: {
        cached: this.cache.dashboardStats !== null,
        valid: this.hasValidDashboardStatsCache(),
        fetching: this.fetchingDashboardStats,
        timestamp: this.cache.dashboardStats?.timestamp || null,
        userId: this.cache.dashboardStats?.userId || null,
        dataLength: this.cache.dashboardStats?.data ? 1 : 0,
      },
      currentUserId: this.currentUserId,
    };
  }

  // Get cache age in minutes
  getCacheAge(
    type:
      | "properties"
      | "emailTemplates"
      | "emailLogs"
      | "campaignProgress"
      | "dashboardStats"
  ): number | null {
    const entry = this.cache[type];
    if (!entry) return null;
    return Math.floor((Date.now() - entry.timestamp) / (1000 * 60));
  }

  // Safe clear method that doesn't throw errors
  clearAllSafe(): void {
    try {
      this.clearAll();
    } catch (error) {
      // Silently handle clear errors during sign out
      this.cache = {
        properties: null,
        emailTemplates: null,
        emailLogs: null,
        campaignProgress: null,
        dashboardStats: null,
      };
      this.currentUserId = null;
    }
  }
}

export const dataCache = new DataCache();
