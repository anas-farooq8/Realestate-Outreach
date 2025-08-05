export interface Property {
  id: string; // UUID - NOT NULL DEFAULT gen_random_uuid()
  property_address: string | null;
  zip_code: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  decision_maker_name: string | null;
  decision_maker_email: string | null;
  decision_maker_phone: string | null;
  suspend_until: string; // date - NOT NULL DEFAULT CURRENT_DATE
  created_at: string; // timestamp with time zone - NOT NULL DEFAULT timezone('UTC'::text, now())
  updated_at: string; // timestamp with time zone - NOT NULL DEFAULT timezone('UTC'::text, now())
  opt_out_code: string; // UUID - NOT NULL DEFAULT gen_random_uuid() UNIQUE
  hoa_or_management_company: string | null;
  street: string | null;
}

export interface ExtractedCommunity {
  id: string;
  name: string;
  editable: boolean;
}

export interface EmailTemplate {
  id: number; // integer - NOT NULL DEFAULT nextval('email_templates_id_seq'::regclass)
  template_name: string; // text - NOT NULL
  subject: string | null; // text
  hook: string | null; // text
  body: string; // text - NOT NULL
  signature: string | null; // text
  is_active: boolean; // boolean - NOT NULL DEFAULT true
  created_at: string; // timestamp with time zone - NOT NULL DEFAULT timezone('UTC'::text, now())
  updated_at: string; // timestamp with time zone - NOT NULL DEFAULT timezone('UTC'::text, now())
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
