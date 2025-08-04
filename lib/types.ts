export interface Property {
  id: string
  property_address: string
  property_name: string
  city: string
  state: string
  county: string
  zip_code: string
  contact_name: string
  contact_email: string
  contact_phone: string
  contact_title: string
  company_name: string
  website: string
  linkedin_url: string
  status: "pending" | "processing" | "completed" | "failed"
  created_at: string
  updated_at: string
  user_id: string
  filename: string
  parent_address: string
}

export interface ExtractedCommunity {
  id: string
  name: string
  editable: boolean
}

export interface EmailTemplate {
  id: number
  template_name: string
  subject: string | null
  hook: string | null
  body: string
  signature: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  created_at: string
}

export interface ProcessingJob {
  id: string
  user_id: string
  filename: string
  parent_address: string
  property_names: string[]
  status: "pending" | "processing" | "completed" | "failed"
  total_properties: number
  processed_properties: number
  created_at: string
  updated_at: string
}
