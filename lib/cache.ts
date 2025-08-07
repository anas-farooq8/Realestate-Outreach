import { createClient } from "@/lib/supabase/client";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
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

  // Service role client for storage operations (bypasses RLS)
  private storageClient = createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!
  );

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

  // Cache change listeners for React hooks
  private cacheChangeListeners: Array<() => void> = [];

  constructor() {
    console.log(`🚀 [CACHE INIT] Data cache system initialized`);
  }

  // Cache change notification methods
  addCacheChangeListener(listener: () => void): () => void {
    this.cacheChangeListeners.push(listener);
    // Return unsubscribe function
    return () => {
      const index = this.cacheChangeListeners.indexOf(listener);
      if (index > -1) {
        this.cacheChangeListeners.splice(index, 1);
      }
    };
  }

  private notifyCacheChange(): void {
    this.cacheChangeListeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error("Error in cache change listener:", error);
      }
    });
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
        console.log(`🟢 [CACHE HIT] Retrieved ${cacheKey} from cache`);
        return entry!.data;
      }

      // Prevent concurrent fetches
      const fetchingKey = `fetching${fetchingFlag}` as keyof this;
      if (this[fetchingKey] as boolean) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return this.fetchWithCache(cacheKey, fetchingFlag, fetcher, emptyValue);
      }

      (this[fetchingKey] as any) = true;
      console.log(`🔄 [DATABASE FETCH] Fetching ${cacheKey} from database`);

      try {
        const data = await fetcher();

        // Cache the result
        (this.cache[cacheKey] as any) = {
          data,
          timestamp: Date.now(),
          userId,
        };

        console.log(
          `✅ [DATABASE FETCH COMPLETE] ${cacheKey} cached successfully`
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
      return this.currentUserId;
    }

    // If already initializing, return a promise that resolves when initialization is complete
    if (this.initializingUser) {
      return new Promise((resolve) => {
        this.pendingInitRequests.push(resolve);
      });
    }

    this.initializingUser = true;
    console.log(`🔄 [USER ID FETCH] Fetching user ID from auth`);

    try {
      const userId = await this.getCurrentUserId();

      // Resolve all pending requests
      this.pendingInitRequests.forEach((resolve) => resolve(userId));
      this.pendingInitRequests = [];

      if (userId) {
        console.log(
          `✅ [USER ID FETCH COMPLETE] User authenticated successfully`
        );
      }
      return userId;
    } finally {
      this.initializingUser = false;
    }
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
          const { data: emailLogsData, error: emailLogsError } =
            await this.supabase
              .from("email_logs")
              .select("id, campaign_week, replied, sent_at, replied_at");

          if (!emailLogsError && emailLogsData) {
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
          }
        }

        if (needsEmailTemplates) {
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

  async getPdfProposals(): Promise<PDFProposal[]> {
    return this.fetchWithCache(
      "pdfProposals",
      "PdfProposals",
      () => this.fetchPdfProposalsFromStorage(),
      []
    );
  }

  private async fetchPdfProposalsFromStorage(): Promise<PDFProposal[]> {
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME;
    if (!bucketName) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_BUCKET_NAME environment variable is not set"
      );
    }

    const bucketBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_URL;

    console.log(`🔄 [DATABASE FETCH] Fetching PDF proposals from storage`);

    const { data: files, error } = await this.storageClient.storage
      .from(bucketName)
      .list("", {
        limit: 100,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      throw new Error(`Failed to fetch PDF proposals: ${error.message}`);
    }

    if (!files || files.length === 0) {
      return [];
    }

    // Filter for PDF files only
    const pdfFiles = files.filter(
      (file) =>
        file.name.toLowerCase().endsWith(".pdf") ||
        (file.metadata?.mimetype && file.metadata.mimetype.includes("pdf"))
    );

    // Map files to PDFProposal format
    const proposals = pdfFiles.map((file) => {
      const publicUrl = bucketBaseUrl
        ? `${bucketBaseUrl}/${encodeURIComponent(file.name)}`
        : undefined;

      return {
        name: file.name,
        size: file.metadata?.size || 0,
        created_at: file.created_at || new Date().toISOString(),
        updated_at: file.updated_at || new Date().toISOString(),
        last_accessed_at: file.last_accessed_at || new Date().toISOString(),
        publicUrl,
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
      };
    });

    return proposals;
  }

  // Campaign Progress PDF Selection methods
  async updateSelectedPdf(pdfUrl: string): Promise<void> {
    const userId = await this.ensureUserContext();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Use default PDF URL from schema if pdfUrl is empty/null
    const finalPdfUrl = pdfUrl && pdfUrl.trim();

    // First, get or create campaign progress record
    let campaignProgress = await this.getCampaignProgress();

    if (campaignProgress) {
      // Update existing record
      const { error } = await this.supabase
        .from("campaign_progress")
        .update({
          pdf_url: finalPdfUrl,
        })
        .eq("id", campaignProgress.id);

      if (error) {
        throw new Error(`Failed to update selected PDF: ${error.message}`);
      }

      // Update cache
      const updatedProgress = {
        ...campaignProgress,
        pdf_url: finalPdfUrl,
      };

      this.cache.campaignProgress = {
        data: updatedProgress,
        timestamp: Date.now(),
        userId: userId,
      };
      // Invalidate dashboard stats to trigger recalculation
      this.invalidateDashboardStats();
    }
  }

  // Get currently selected PDF URL
  async getSelectedPdfUrl(): Promise<string | null> {
    const campaignProgress = await this.getCampaignProgress();
    const pdfUrl = campaignProgress?.pdf_url || null;
    // Return null for empty string or default URLs
    return pdfUrl && pdfUrl.trim() ? pdfUrl : null;
  }

  // Helper function to sanitize filename for Supabase Storage
  private sanitizeFileName(filename: string): string {
    // Remove file extension temporarily
    const lastDotIndex = filename.lastIndexOf(".");
    const nameWithoutExt =
      lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
    const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : "";

    // Remove or replace invalid characters
    // Supabase Storage allows: letters, numbers, hyphens, underscores, periods, and forward slashes
    const sanitized = nameWithoutExt
      .replace(/[^\w\s\-_.]/g, "") // Remove emojis and special characters, keep spaces
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/_{2,}/g, "_") // Replace multiple underscores with single
      .replace(/^_+|_+$/g, "") // Remove leading/trailing underscores
      .trim();

    // Ensure we have a valid filename
    const finalName = sanitized || "untitled";

    return `${finalName}${extension}`;
  }

  // PDF Proposals management methods
  async uploadPdfProposal(
    file: File
  ): Promise<{ path: string; actualFileName: string }> {
    // Ensure user context is available (this will handle authentication)
    const userId = await this.ensureUserContext();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME;
    if (!bucketName) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_BUCKET_NAME environment variable is not set"
      );
    }

    // Sanitize the filename to remove emojis and invalid characters
    const fileName = this.sanitizeFileName(file.name);

    // First check if file already exists
    const { data: existingFiles, error: listError } =
      await this.storageClient.storage.from(bucketName).list("", {
        limit: 1000,
        offset: 0,
      });

    if (listError) {
      throw new Error(`Failed to check existing files: ${listError.message}`);
    }

    // Check if a file with the same name already exists
    const fileExists = existingFiles?.some((file) => file.name === fileName);
    if (fileExists) {
      throw new Error(
        `A file named "${fileName}" already exists. Please delete the existing file first or choose a different name.`
      );
    }

    const { data, error } = await this.storageClient.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload PDF: ${error.message}`);
    }

    // Get the actual file name from the upload response
    const actualFileName = data.path;

    // Add to cache instead of invalidating for better performance
    console.log(`➕ [CACHE ADD] Adding PDF to cache: ${actualFileName}`);
    this.addPdfProposalToCache(actualFileName, file.size);

    return { path: data.path, actualFileName };
  }

  async deletePdfProposal(fileName: string): Promise<void> {
    // Ensure user context is available (this will handle authentication)
    const userId = await this.ensureUserContext();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME;
    if (!bucketName) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_BUCKET_NAME environment variable is not set"
      );
    }

    // First check if the file exists
    const { data: fileList, error: listError } =
      await this.storageClient.storage.from(bucketName).list("", {
        limit: 1000,
        offset: 0,
      });

    if (listError) {
      throw new Error(`Failed to list files: ${listError.message}`);
    }

    // Find the exact file name (handles cases where Supabase renamed the file)
    const actualFile = fileList?.find(
      (file) =>
        file.name === fileName ||
        (file.name.startsWith(fileName.replace(".pdf", "")) &&
          file.name.endsWith(".pdf"))
    );

    if (!actualFile) {
      throw new Error(`File not found: ${fileName}`);
    }

    const actualFileName = actualFile.name;

    const { error } = await this.storageClient.storage
      .from(bucketName)
      .remove([actualFileName]);

    if (error) {
      throw new Error(`Failed to delete PDF: ${error.message}`);
    }

    // Remove from cache instead of invalidating for better performance
    console.log(`🗑️ [CACHE REMOVE] Removing PDF from cache: ${actualFileName}`);
    this.removePdfProposalFromCache(actualFileName);
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
    return publicUrl;
  }

  // Update cache directly instead of invalidating (more efficient)
  updateEmailTemplateInCache(updatedTemplate: EmailTemplate): void {
    try {
      const entry = this.cache.emailTemplates;
      if (entry && !this.isExpired(entry) && this.isSameUser(entry)) {
        console.log(
          `🔄 [CACHE UPDATE] Email template updated: ${updatedTemplate.id}`
        );
        const updatedData = entry.data.map((template) =>
          template.id === updatedTemplate.id ? updatedTemplate : template
        );
        this.cache.emailTemplates = {
          ...entry,
          data: updatedData,
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      console.error("Error updating email template in cache:", error);
    }
  }

  addEmailTemplateToCache(newTemplate: EmailTemplate): void {
    try {
      const entry = this.cache.emailTemplates;
      if (entry && !this.isExpired(entry) && this.isSameUser(entry)) {
        console.log(`➕ [CACHE ADD] Email template added: ${newTemplate.id}`);
        const updatedData = [newTemplate, ...entry.data];
        this.cache.emailTemplates = {
          ...entry,
          data: updatedData,
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      console.error("Error adding email template to cache:", error);
    }
  }

  removeEmailTemplateFromCache(templateId: number): void {
    try {
      const entry = this.cache.emailTemplates;
      if (entry && !this.isExpired(entry) && this.isSameUser(entry)) {
        console.log(`🗑️ [CACHE REMOVE] Email template removed: ${templateId}`);
        const updatedData = entry.data.filter(
          (template) => template.id !== templateId
        );
        this.cache.emailTemplates = {
          ...entry,
          data: updatedData,
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      console.error("Error removing email template from cache:", error);
    }
  }

  // Private invalidate methods used only internally by refresh methods
  private invalidateProperties(): void {
    this.cache.properties = null;
  }

  private invalidateEmailTemplates(): void {
    this.cache.emailTemplates = null;
  }

  private invalidateEmailLogs(): void {
    this.cache.emailLogs = null;
  }

  private invalidateCampaignProgress(): void {
    this.cache.campaignProgress = null;
  }

  public invalidateDashboardStats(): void {
    this.cache.dashboardStats = null;
  }

  private invalidatePdfProposals(): void {
    this.cache.pdfProposals = null;
  }

  // Clear all cache (e.g., on logout)
  clearAll(): void {
    console.log(`🧹 [CACHE CLEAR] All cache cleared`);
    this.cache = {
      properties: null,
      emailTemplates: null,
      emailLogs: null,
      campaignProgress: null,
      dashboardStats: null,
      pdfProposals: null,
    };
    this.currentUserId = null;
    this.userIdCacheTimestamp = 0;
    this.initializingUser = false;
    this.fetchingProperties = false;
    this.fetchingEmailTemplates = false;
    this.fetchingEmailLogs = false;
    this.fetchingCampaignProgress = false;
    this.fetchingDashboardStats = false;
    this.fetchingPdfProposals = false;
  }

  // Force refresh data (publicly accessible)
  async refreshProperties(): Promise<Property[]> {
    this.invalidateProperties();
    return await this.getProperties();
  }

  async refreshEmailTemplates(): Promise<EmailTemplate[]> {
    this.invalidateEmailTemplates();
    return await this.getEmailTemplates();
  }

  async refreshEmailLogs(): Promise<EmailLog[]> {
    this.invalidateEmailLogs();
    return await this.getEmailLogs();
  }

  async refreshCampaignProgress(): Promise<CampaignProgress | null> {
    this.invalidateCampaignProgress();
    return await this.getCampaignProgress();
  }

  async refreshDashboardStats(): Promise<DashboardStats> {
    this.invalidateDashboardStats();
    return await this.getDashboardStats();
  }

  async refreshPdfProposals(): Promise<PDFProposal[]> {
    console.log(`🔄 [DATABASE FETCH] Refreshing PDF proposals from storage`);
    // Clear fetching flag to ensure fresh fetch
    this.fetchingPdfProposals = false;
    // Invalidate cache completely
    this.invalidatePdfProposals();
    // Force fresh fetch from storage and update cache
    const result = await this.getPdfProposals();
    // Notify React hooks about cache change
    this.notifyCacheChange();
    return result;
  }

  // Cache validation methods (used by hooks)
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
      this.userIdCacheTimestamp = 0;
      this.initializingUser = false;
      this.fetchingProperties = false;
      this.fetchingEmailTemplates = false;
      this.fetchingEmailLogs = false;
      this.fetchingCampaignProgress = false;
      this.fetchingDashboardStats = false;
      this.fetchingPdfProposals = false;
    }
  }

  // PDF Cache management methods for better performance
  addPdfProposalToCache(fileName: string, fileSize: number): void {
    console.log(
      `➕ [PDF CACHE ADD] Adding PDF to cache: ${fileName}, size: ${fileSize} bytes`
    );

    try {
      const entry = this.cache.pdfProposals;
      if (entry && !this.isExpired(entry) && this.isSameUser(entry)) {
        console.log(
          `🔄 [PDF CACHE ADD] Valid cache found, adding PDF proposal`
        );

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

        const updatedData = [newProposal, ...entry.data];
        this.cache.pdfProposals = {
          ...entry,
          data: updatedData,
          timestamp: Date.now(),
        };

        // Notify React hooks about cache change
        this.notifyCacheChange();
      }
    } catch (error) {
      console.error("Error adding PDF proposal to cache:", error);
    }
  }

  removePdfProposalFromCache(fileName: string): void {
    console.log(`🗑️ [CACHE REMOVE] Removing PDF from cache: ${fileName}`);

    try {
      const entry = this.cache.pdfProposals;
      if (entry && !this.isExpired(entry) && this.isSameUser(entry)) {
        const updatedData = entry.data.filter(
          (proposal) => proposal.name !== fileName
        );

        this.cache.pdfProposals = {
          ...entry,
          data: updatedData,
          timestamp: Date.now(),
        };

        // Notify React hooks about cache change
        this.notifyCacheChange();
      }
    } catch (error) {
      console.error("Error removing PDF proposal from cache:", error);
    }
  }
}

export const dataCache = new DataCache();
