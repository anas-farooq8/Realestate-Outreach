export interface Property {
  id: number;
  property_address: string;
  street?: string;
  city?: string;
  county?: string;
  state?: string;
  zip_code?: string;
  decision_maker_name?: string;
  decision_maker_email: string;
  decision_maker_phone?: string;
  hoa_or_management_company?: string;
  suspend_until?: string;
  opt_out_code?: string;
  created_at: string;
  updated_at: string;
}

export interface ExtractedCommunity {
  id: string;
  name: string;
  editable: boolean;
}

export interface EmailTemplate {
  id: number;
  template_name: string;
  subject?: string;
  hook?: string;
  body: string;
  signature?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EnrichedPropertyData {
  street_address?: string;
  city?: string;
  county?: string;
  state?: string;
  zip_code?: string;
  decision_maker_name?: string;
  email?: string;
  phone?: string;
  management_company?: string;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface ProcessingJob {
  id: string;
  user_id: string;
  filename: string;
  parent_address: string;
  property_names: string[];
  status: "pending" | "processing" | "completed" | "failed";
  total_properties: number;
  processed_properties: number;
  created_at: string;
  updated_at: string;
}
