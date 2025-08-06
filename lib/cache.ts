import { createClient } from "@/lib/supabase/client";
import type {
  Property,
  EmailTemplate,
  EmailLog,
  CampaignProgress,
  DashboardStats,
  PDFProposal,
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
  pdfProposals: CacheEntry<PDFProposal[]> | null;
}

class DataCache {
  private cache: CacheStore = {
    properties: null,
    emailTemplates: null,
    emailLogs: null,
    campaignProgress: null,
    dashboardStats: null,
    pdfProposals: null,
  };

  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private supabase = createClient();
  private currentUserId: string | null = null;
  private userIdCacheTimestamp: number = 0;
  private readonly USER_ID_CACHE_DURATION = 60 * 1000; // Cache user ID for 1 minute

  // Batch initialization system
  private initializingUser = false;
  private lastLoggedCacheHit = 0;
  private readonly LOG_THROTTLE = 5000; // Only log cache hits every 5 seconds
  private pendingInitRequests: Array<(userId: string | null) => void> = [];

  // Fetching flags
  private fetchingProperties = false;
  private fetchingEmailTemplates = false;
  private fetchingEmailLogs = false;
  private fetchingCampaignProgress = false;
  private fetchingDashboardStats = false;
  private fetchingPdfProposals = false;

  constructor() {
    console.log(
      `🚀 [CACHE INIT] Data cache system initialized (duration: ${
        this.CACHE_DURATION / 1000
      }s)`
    );
  }

  private isExpired(entry: CacheEntry<any> | null): boolean {
    if (!entry) return true;
    return Date.now() - entry.timestamp > this.CACHE_DURATION;
  }

  private isSameUser(entry: CacheEntry<any> | null): boolean {
    if (!entry || !this.currentUserId) return false;
    return entry.userId === this.currentUserId;
  }

  // Unified cache validation helper to reduce redundant code
  private isValidCache<T>(entry: CacheEntry<T> | null): boolean {
    return entry !== null && !this.isExpired(entry) && this.isSameUser(entry);
  }

  // Generic data fetcher to reduce redundant code patterns
  private async fetchWithCache<T>(
    cacheKey: keyof CacheStore,
    fetchingFlag: string,
    fetcher: () => Promise<T>,
    emptyValue: T
  ): Promise<T> {
    try {
      const userId = await this.ensureUserContext(); // Use shared user context
      if (!userId) {
        return emptyValue;
      }

      const entry = this.cache[cacheKey] as CacheEntry<T> | null;

      // Check if cache exists and is valid
      if (this.isValidCache(entry)) {
        console.log(
          `🟢 [CACHE HIT] Retrieved ${cacheKey} from cache (age: ${Math.floor(
            (Date.now() - entry!.timestamp) / 1000
          )}s)`
        );
        return entry!.data;
      }

      // Prevent concurrent fetches
      const fetchingKey = `fetching${fetchingFlag}` as keyof this;
      if (this[fetchingKey] as boolean) {
        console.log(
          `⏳ [CACHE WAIT] Waiting for concurrent ${cacheKey} fetch to complete`
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
        return this.fetchWithCache(cacheKey, fetchingFlag, fetcher, emptyValue);
      }

      (this[fetchingKey] as any) = true;
      console.log(`🔄 [DATABASE FETCH] Fetching ${cacheKey} from database...`);

      try {
        const data = await fetcher();

        // Cache the result
        (this.cache[cacheKey] as any) = {
          data,
          timestamp: Date.now(),
          userId,
        };

        console.log(
          `✅ [DATABASE FETCH COMPLETE] ${cacheKey} fetched and cached successfully`
        );
        return data;
      } finally {
        (this[fetchingKey] as any) = false;
      }
    } catch (error) {
      console.error(`Error in fetch${fetchingFlag}:`, error);
      const entry = this.cache[cacheKey] as CacheEntry<T> | null;
      return entry?.data || emptyValue;
    }
  }

  async getCurrentUserId(): Promise<string | null> {
    try {
      // Return cached user ID if still valid
      const now = Date.now();
      if (
        this.currentUserId &&
        now - this.userIdCacheTimestamp < this.USER_ID_CACHE_DURATION
      ) {
        return this.currentUserId;
      }

      // Check if we have a session first
      const {
        data: { session },
        error: sessionError,
      } = await this.supabase.auth.getSession();

      if (sessionError || !session) {
        this.currentUserId = null;
        this.userIdCacheTimestamp = 0;
        return null;
      }

      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser();

      if (error || !user) {
        this.currentUserId = null;
        this.userIdCacheTimestamp = 0;
        return null;
      }

      this.currentUserId = user.id;
      this.userIdCacheTimestamp = now;
      return this.currentUserId;
    } catch (error) {
      // Silently handle auth errors during sign out
      this.currentUserId = null;
      this.userIdCacheTimestamp = 0;
      return null;
    }
  }

  private async ensureUserContext(): Promise<string | null> {
    const now = Date.now();

    if (
      this.currentUserId &&
      now - this.userIdCacheTimestamp < this.USER_ID_CACHE_DURATION
    ) {
      // Throttle cache hit logging to reduce noise
      if (now - this.lastLoggedCacheHit > this.LOG_THROTTLE) {
        console.log(
          `🟢 [USER ID CACHE HIT] Using cached user ID (age: ${Math.floor(
            (now - this.userIdCacheTimestamp) / 1000
          )}s) - ${this.pendingInitRequests.length} pending requests`
        );
        this.lastLoggedCacheHit = now;
      }
      return this.currentUserId;
    }

    // If already initializing, return a promise that resolves when initialization is complete
    if (this.initializingUser) {
      return new Promise((resolve) => {
        this.pendingInitRequests.push(resolve);
      });
    }

    this.initializingUser = true;
    console.log(
      `🔄 [USER ID FETCH] Fetching user ID from auth... (${this.pendingInitRequests.length} requests waiting)`
    );

    try {
      const userId = await this.getCurrentUserId();

      // Resolve all pending requests
      this.pendingInitRequests.forEach((resolve) => resolve(userId));
      this.pendingInitRequests = [];

      if (userId) {
        console.log(
          `✅ [USER ID FETCH COMPLETE] User ID fetched and cached successfully`
        );
      } else {
        console.log(`❌ [USER ID FETCH FAILED] No authenticated user found`);
      }
      return userId;
    } finally {
      this.initializingUser = false;
    }
  }

  private async isUserAuthenticated(): Promise<boolean> {
    const userId = await this.getCurrentUserId();
    return userId !== null;
  }

  async getProperties(): Promise<Property[]> {
    return this.fetchWithCache(
      "properties",
      "Properties",
      async () => {
        const { data, error } = await this.supabase
          .from("properties")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          throw new Error(error.message);
        }

        return data || [];
      },
      []
    );
  }

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return this.fetchWithCache(
      "emailTemplates",
      "EmailTemplates",
      async () => {
        const { data, error } = await this.supabase
          .from("email_templates")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching email templates:", error);
          throw new Error(error.message);
        }

        return data || [];
      },
      []
    );
  }

  async getEmailLogs(): Promise<EmailLog[]> {
    return this.fetchWithCache(
      "emailLogs",
      "EmailLogs",
      async () => {
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
              template_name
            )
          `
          )
          .order("sent_at", { ascending: false });

        if (error) {
          console.error("Error fetching email logs:", error);
          throw new Error(error.message);
        }

        return data || [];
      },
      []
    );
  }

  async getCampaignProgress(): Promise<CampaignProgress | null> {
    return this.fetchWithCache(
      "campaignProgress",
      "CampaignProgress",
      async () => {
        const { data, error } = await this.supabase
          .from("campaign_progress")
          .select("*")
          .order("id", { ascending: false })
          .limit(1);

        if (error) {
          console.error("Error fetching campaign progress:", error);
          throw new Error(error.message);
        }

        return data ? data[0] : null;
      },
      null
    );
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return this.fetchWithCache(
      "dashboardStats",
      "DashboardStats",
      async () => {
        // Try to use cached data first to avoid duplicate requests
        // Get cached user ID once (already cached from fetchWithCache call)
        let properties: Property[] = [];
        let emailLogs: EmailLog[] = [];
        let campaignProgress: CampaignProgress | null = null;
        let emailTemplates: EmailTemplate[] = [];

        // Use cached data if available and valid
        const propertiesEntry = this.cache.properties;
        const emailLogsEntry = this.cache.emailLogs;
        const campaignProgressEntry = this.cache.campaignProgress;
        const emailTemplatesEntry = this.cache.emailTemplates;

        const needsProperties = !this.isValidCache(propertiesEntry);
        const needsEmailLogs = !this.isValidCache(emailLogsEntry);
        const needsCampaignProgress = !this.isValidCache(campaignProgressEntry);
        const needsEmailTemplates = !this.isValidCache(emailTemplatesEntry);

        console.log(
          `📊 [DASHBOARD STATS] Cache status - Properties: ${
            needsProperties ? "🔄 fetch" : "🟢 cached"
          }, EmailLogs: ${
            needsEmailLogs ? "🔄 fetch" : "🟢 cached"
          }, CampaignProgress: ${
            needsCampaignProgress ? "🔄 fetch" : "🟢 cached"
          }, EmailTemplates: ${needsEmailTemplates ? "🔄 fetch" : "🟢 cached"}`
        );

        // Use cached data when available
        if (!needsProperties) {
          properties = propertiesEntry!.data;
        }
        if (!needsEmailLogs) {
          emailLogs = emailLogsEntry!.data;
        }
        if (!needsCampaignProgress) {
          campaignProgress = campaignProgressEntry!.data;
        }
        if (!needsEmailTemplates) {
          emailTemplates = emailTemplatesEntry!.data;
        }

        // Fetch missing data only (optimized queries for stats)
        if (needsProperties) {
          console.log(
            `🔄 [DASHBOARD STATS] Fetching properties count from database...`
          );
          const { data: propertiesData, error: propertiesError } =
            await this.supabase
              .from("properties")
              .select("id")
              .order("created_at", { ascending: false });

          if (!propertiesError && propertiesData) {
            properties = propertiesData as any[]; // Only need count
          }
        }

        if (needsEmailLogs) {
          console.log(
            `🔄 [DASHBOARD STATS] Fetching email logs from database...`
          );
          const { data: emailLogsData, error: emailLogsError } =
            await this.supabase
              .from("email_logs")
              .select("id, campaign_week, replied, sent_at, replied_at");

          if (!emailLogsError && emailLogsData) {
            emailLogs = emailLogsData as EmailLog[];
          }
        }

        if (needsCampaignProgress) {
          console.log(
            `🔄 [DASHBOARD STATS] Fetching campaign progress from database...`
          );
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
          }
        }

        if (needsEmailTemplates) {
          console.log(
            `🔄 [DASHBOARD STATS] Fetching email templates from database...`
          );
          const { data: emailTemplatesData, error: emailTemplatesError } =
            await this.supabase.from("email_templates").select("id, is_active");

          if (!emailTemplatesError && emailTemplatesData) {
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
        const activeTemplates = emailTemplates.filter(
          (t) => t.is_active
        ).length;

        console.log(
          `📊 [DASHBOARD STATS COMPLETE] Calculated stats - Properties: ${totalProperties}, Emails: ${totalEmailsSent}, Replies: ${totalReplies}, Active Templates: ${activeTemplates}`
        );

        return {
          totalProperties,
          totalEmailsSent,
          totalReplies,
          replyRate,
          currentWeek,
          activeTemplates,
        };
      },
      {
        totalProperties: 0,
        totalEmailsSent: 0,
        totalReplies: 0,
        replyRate: 0,
        currentWeek: 1,
        activeTemplates: 0,
      }
    );
  }

  // Generic safe method to reduce code duplication
  private async safeMethod<T>(
    method: () => Promise<T>,
    emptyValue: T
  ): Promise<T> {
    const isAuth = await this.isUserAuthenticated();
    if (!isAuth) {
      return emptyValue;
    }
    return method();
  }

  // Safe methods that check authentication first
  async safeGetProperties(): Promise<Property[]> {
    return this.safeMethod(() => this.getProperties(), []);
  }

  async safeGetEmailTemplates(): Promise<EmailTemplate[]> {
    return this.safeMethod(() => this.getEmailTemplates(), []);
  }

  async safeGetEmailLogs(): Promise<EmailLog[]> {
    return this.safeMethod(() => this.getEmailLogs(), []);
  }

  async safeGetCampaignProgress(): Promise<CampaignProgress | null> {
    return this.safeMethod(() => this.getCampaignProgress(), null);
  }

  async safeGetDashboardStats(): Promise<DashboardStats> {
    return this.safeMethod(() => this.getDashboardStats(), {
      totalProperties: 0,
      totalEmailsSent: 0,
      totalReplies: 0,
      replyRate: 0,
      currentWeek: 1,
      activeTemplates: 0,
    });
  }

  async getPdfProposals(): Promise<PDFProposal[]> {
    return this.fetchWithCache(
      "pdfProposals",
      "PDFProposals",
      async () => {
        const bucketName = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME;
        if (!bucketName) {
          throw new Error(
            "NEXT_PUBLIC_SUPABASE_BUCKET_NAME environment variable is not set"
          );
        }
        console.log(
          `🔄 [PDF PROPOSALS] Fetching from Supabase storage bucket: ${bucketName}`
        );

        const { data: files, error } = await this.supabase.storage
          .from(bucketName)
          .list("", {
            limit: 100,
            offset: 0,
            sortBy: { column: "created_at", order: "desc" },
          });

        if (error) {
          console.error(`❌ [PDF PROPOSALS] Storage error:`, error);
          throw new Error(`Failed to fetch PDF proposals: ${error.message}`);
        }

        if (!files) {
          console.log(`📁 [PDF PROPOSALS] No files found in bucket`);
          return [];
        }

        // Filter for PDF files only
        const pdfFiles = files.filter(
          (file) =>
            file.name.toLowerCase().endsWith(".pdf") ||
            (file.metadata?.mimetype && file.metadata.mimetype.includes("pdf"))
        );

        console.log(`📁 [PDF PROPOSALS] Found ${pdfFiles.length} PDF files`);

        // Generate public URLs for each PDF using the public bucket URL
        const bucketBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_URL;

        return pdfFiles.map((file) => ({
          name: file.name,
          size: file.metadata?.size || 0,
          created_at: file.created_at,
          updated_at: file.updated_at,
          last_accessed_at: file.last_accessed_at,
          publicUrl: bucketBaseUrl
            ? `${bucketBaseUrl}/${encodeURIComponent(file.name)}`
            : undefined,
          metadata: file.metadata
            ? {
                eTag: file.metadata.eTag || "",
                mimetype: file.metadata.mimetype || "application/pdf",
                cacheControl: file.metadata.cacheControl || "",
                lastModified: file.metadata.lastModified || "",
                contentLength:
                  file.metadata.contentLength || file.metadata.size || 0,
                httpStatusCode: file.metadata.httpStatusCode || 200,
              }
            : null,
        }));
      },
      []
    );
  }

  async safeGetPdfProposals(): Promise<PDFProposal[]> {
    return this.safeMethod(() => this.getPdfProposals(), []);
  }

  // PDF Proposals management methods
  async uploadPdfProposal(file: File): Promise<string> {
    const isAuth = await this.isUserAuthenticated();
    if (!isAuth) {
      throw new Error("User not authenticated");
    }

    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME;
    if (!bucketName) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_BUCKET_NAME environment variable is not set"
      );
    }
    console.log(
      `⬆️ [PDF UPLOAD] Uploading file: ${file.name} (${file.size} bytes) to bucket: ${bucketName}`
    );

    const fileName = `${Date.now()}_${file.name}`;

    const { data, error } = await this.supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error(`❌ [PDF UPLOAD] Upload error:`, error);
      throw new Error(`Failed to upload PDF: ${error.message}`);
    }

    console.log(`✅ [PDF UPLOAD] Successfully uploaded: ${fileName}`);

    // Add to cache instead of invalidating for better performance
    this.addPdfProposalToCache(fileName, file.size);

    return data.path;
  }

  async deletePdfProposal(fileName: string): Promise<void> {
    const isAuth = await this.isUserAuthenticated();
    if (!isAuth) {
      throw new Error("User not authenticated");
    }

    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME;
    if (!bucketName) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_BUCKET_NAME environment variable is not set"
      );
    }
    console.log(
      `🗑️ [PDF DELETE] Deleting file: ${fileName} from bucket: ${bucketName}`
    );

    const { error } = await this.supabase.storage
      .from(bucketName)
      .remove([fileName]);

    if (error) {
      console.error(`❌ [PDF DELETE] Delete error:`, error);
      throw new Error(`Failed to delete PDF: ${error.message}`);
    }

    console.log(`✅ [PDF DELETE] Successfully deleted: ${fileName}`);

    // Remove from cache instead of invalidating for better performance
    this.removePdfProposalFromCache(fileName);
  }

  // View PDF method - returns the public URL for viewing
  async viewPdfProposal(fileName: string): Promise<string> {
    const bucketBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_URL;

    if (!bucketBaseUrl) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_BUCKET_URL environment variable is not set"
      );
    }

    const publicUrl = `${bucketBaseUrl}/${encodeURIComponent(fileName)}`;
    console.log(`👁️ [PDF VIEW] Generated public URL: ${publicUrl}`);
    return publicUrl;
  }

  // Get PDF proposal URL from cache if available, otherwise generate it
  async getPdfProposalUrl(fileName: string): Promise<string> {
    try {
      // First try to get from cache
      const proposals = await this.safeGetPdfProposals();
      const proposal = proposals.find((p) => p.name === fileName);

      if (proposal && proposal.publicUrl) {
        console.log(`📋 [PDF URL] Retrieved cached URL for: ${fileName}`);
        return proposal.publicUrl;
      }

      // If not in cache, generate URL
      console.log(`🔄 [PDF URL] Generating URL for: ${fileName}`);
      return this.viewPdfProposal(fileName);
    } catch (error) {
      console.error(`❌ [PDF URL] Error getting URL for ${fileName}:`, error);
      // Return fallback URL
      return this.viewPdfProposal(fileName);
    }
  }

  // Remove the getPdfProposalUrl method since we're using public URLs now

  // Update cache directly instead of invalidating (more efficient)
  updateEmailTemplateInCache(updatedTemplate: EmailTemplate): void {
    try {
      const entry = this.cache.emailTemplates;
      if (entry && !this.isExpired(entry) && this.isSameUser(entry)) {
        console.log(
          `🔄 [CACHE UPDATE] Email template updated in cache (ID: ${updatedTemplate.id})`
        );
        const updatedData = entry.data.map((template) =>
          template.id === updatedTemplate.id ? updatedTemplate : template
        );
        this.cache.emailTemplates = {
          ...entry,
          data: updatedData,
          timestamp: Date.now(), // Update timestamp
        };
      } else {
        console.log(
          `⚠️ [CACHE UPDATE] Email template cache invalid, update skipped (ID: ${updatedTemplate.id})`
        );
      }
    } catch (error) {
      console.error("Error updating email template in cache:", error);
    }
  }

  addEmailTemplateToCache(newTemplate: EmailTemplate): void {
    try {
      const entry = this.cache.emailTemplates;
      if (entry && !this.isExpired(entry) && this.isSameUser(entry)) {
        console.log(
          `➕ [CACHE ADD] Email template added to cache (ID: ${newTemplate.id})`
        );
        const updatedData = [newTemplate, ...entry.data];
        this.cache.emailTemplates = {
          ...entry,
          data: updatedData,
          timestamp: Date.now(), // Update timestamp
        };
      } else {
        console.log(
          `⚠️ [CACHE ADD] Email template cache invalid, add skipped (ID: ${newTemplate.id})`
        );
      }
    } catch (error) {
      console.error("Error adding email template to cache:", error);
    }
  }

  removeEmailTemplateFromCache(templateId: number): void {
    try {
      const entry = this.cache.emailTemplates;
      if (entry && !this.isExpired(entry) && this.isSameUser(entry)) {
        console.log(
          `🗑️ [CACHE REMOVE] Email template removed from cache (ID: ${templateId})`
        );
        const updatedData = entry.data.filter(
          (template) => template.id !== templateId
        );
        this.cache.emailTemplates = {
          ...entry,
          data: updatedData,
          timestamp: Date.now(), // Update timestamp
        };
      } else {
        console.log(
          `⚠️ [CACHE REMOVE] Email template cache invalid, remove skipped (ID: ${templateId})`
        );
      }
    } catch (error) {
      console.error("Error removing email template from cache:", error);
    }
  }

  // Invalidate cache when data is modified
  invalidateProperties(): void {
    try {
      console.log(`🗑️ [CACHE INVALIDATE] Properties cache invalidated`);
      this.cache.properties = null;
    } catch (error) {
      console.error("Error invalidating properties cache:", error);
    }
  }

  invalidateEmailTemplates(): void {
    try {
      console.log(`🗑️ [CACHE INVALIDATE] Email templates cache invalidated`);
      this.cache.emailTemplates = null;
    } catch (error) {
      console.error("Error invalidating email templates cache:", error);
    }
  }

  invalidateEmailLogs(): void {
    try {
      console.log(`🗑️ [CACHE INVALIDATE] Email logs cache invalidated`);
      this.cache.emailLogs = null;
    } catch (error) {
      console.error("Error invalidating email logs cache:", error);
    }
  }

  invalidateCampaignProgress(): void {
    try {
      console.log(`🗑️ [CACHE INVALIDATE] Campaign progress cache invalidated`);
      this.cache.campaignProgress = null;
    } catch (error) {
      console.error("Error invalidating campaign progress cache:", error);
    }
  }

  invalidateDashboardStats(): void {
    try {
      console.log(`🗑️ [CACHE INVALIDATE] Dashboard stats cache invalidated`);
      this.cache.dashboardStats = null;
    } catch (error) {
      console.error("Error invalidating dashboard stats cache:", error);
    }
  }

  invalidatePdfProposals(): void {
    try {
      console.log(`🗑️ [CACHE INVALIDATE] PDF proposals cache invalidated`);
      this.cache.pdfProposals = null;
    } catch (error) {
      console.error("Error invalidating PDF proposals cache:", error);
    }
  }

  // Clear all cache (e.g., on logout)
  clearAll(): void {
    try {
      console.log(`🧹 [CACHE CLEAR] All cache cleared (logout/user change)`);
      this.cache = {
        properties: null,
        emailTemplates: null,
        emailLogs: null,
        campaignProgress: null,
        dashboardStats: null,
        pdfProposals: null,
      };
      this.currentUserId = null;
      this.userIdCacheTimestamp = 0; // Clear user ID cache timestamp
      this.initializingUser = false; // Clear initialization flag
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
        }
      );
    }
  }

  async refreshPdfProposals(): Promise<PDFProposal[]> {
    try {
      this.invalidatePdfProposals();
      return await this.getPdfProposals();
    } catch (error) {
      console.error("Error refreshing PDF proposals:", error);
      return this.cache.pdfProposals?.data || [];
    }
  }

  // Safe refresh methods - using generic safe method
  async safeRefreshProperties(): Promise<Property[]> {
    return this.safeMethod(() => this.refreshProperties(), []);
  }

  async safeRefreshEmailTemplates(): Promise<EmailTemplate[]> {
    return this.safeMethod(() => this.refreshEmailTemplates(), []);
  }

  async safeRefreshEmailLogs(): Promise<EmailLog[]> {
    return this.safeMethod(() => this.refreshEmailLogs(), []);
  }

  async safeRefreshCampaignProgress(): Promise<CampaignProgress | null> {
    return this.safeMethod(() => this.refreshCampaignProgress(), null);
  }

  async safeRefreshDashboardStats(): Promise<DashboardStats> {
    return this.safeMethod(() => this.refreshDashboardStats(), {
      totalProperties: 0,
      totalEmailsSent: 0,
      totalReplies: 0,
      replyRate: 0,
      currentWeek: 1,
      activeTemplates: 0,
    });
  }

  async safeRefreshPdfProposals(): Promise<PDFProposal[]> {
    return this.safeMethod(() => this.refreshPdfProposals(), []);
  }

  // Check if cache has data for current user - unified implementation
  hasValidPropertiesCache(): boolean {
    return this.isValidCache(this.cache.properties);
  }

  hasValidEmailTemplatesCache(): boolean {
    return this.isValidCache(this.cache.emailTemplates);
  }

  hasValidEmailLogsCache(): boolean {
    return this.isValidCache(this.cache.emailLogs);
  }

  hasValidCampaignProgressCache(): boolean {
    return this.isValidCache(this.cache.campaignProgress);
  }

  hasValidDashboardStatsCache(): boolean {
    return this.isValidCache(this.cache.dashboardStats);
  }

  hasValidPdfProposalsCache(): boolean {
    return this.isValidCache(this.cache.pdfProposals);
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

  isFetchingPdfProposals(): boolean {
    return this.fetchingPdfProposals;
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
      pdfProposals: {
        cached: this.cache.pdfProposals !== null,
        valid: this.hasValidPdfProposalsCache(),
        fetching: this.fetchingPdfProposals,
        timestamp: this.cache.pdfProposals?.timestamp || null,
        userId: this.cache.pdfProposals?.userId || null,
        dataLength: this.cache.pdfProposals?.data?.length || 0,
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
      | "pdfProposals"
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
        pdfProposals: null,
      };
      this.currentUserId = null;
      this.userIdCacheTimestamp = 0; // Clear user ID cache timestamp
      this.initializingUser = false; // Clear initialization flag
    }
  }

  // PDF Cache management methods for better performance
  addPdfProposalToCache(fileName: string, fileSize: number): void {
    try {
      const entry = this.cache.pdfProposals;
      if (entry && !this.isExpired(entry) && this.isSameUser(entry)) {
        const bucketBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_URL;

        const newProposal: PDFProposal = {
          name: fileName,
          size: fileSize,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
          publicUrl: bucketBaseUrl
            ? `${bucketBaseUrl}/${encodeURIComponent(fileName)}`
            : undefined,
          metadata: {
            eTag: "",
            mimetype: "application/pdf",
            cacheControl: "3600",
            lastModified: new Date().toISOString(),
            contentLength: fileSize,
            httpStatusCode: 200,
          },
        };

        console.log(`➕ [CACHE ADD] PDF proposal added to cache: ${fileName}`);
        const updatedData = [newProposal, ...entry.data];
        this.cache.pdfProposals = {
          ...entry,
          data: updatedData,
          timestamp: Date.now(),
        };
      } else {
        console.log(
          `⚠️ [CACHE ADD] PDF proposal cache invalid, add skipped: ${fileName}`
        );
      }
    } catch (error) {
      console.error("Error adding PDF proposal to cache:", error);
    }
  }

  removePdfProposalFromCache(fileName: string): void {
    try {
      const entry = this.cache.pdfProposals;
      if (entry && !this.isExpired(entry) && this.isSameUser(entry)) {
        console.log(
          `🗑️ [CACHE REMOVE] PDF proposal removed from cache: ${fileName}`
        );
        const updatedData = entry.data.filter(
          (proposal) => proposal.name !== fileName
        );
        this.cache.pdfProposals = {
          ...entry,
          data: updatedData,
          timestamp: Date.now(),
        };
      } else {
        console.log(
          `⚠️ [CACHE REMOVE] PDF proposal cache invalid, remove skipped: ${fileName}`
        );
      }
    } catch (error) {
      console.error("Error removing PDF proposal from cache:", error);
    }
  }
}

export const dataCache = new DataCache();
