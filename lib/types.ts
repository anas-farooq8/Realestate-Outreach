export interface Property {
  id: string
  property_address?: string
  street?: string
  zip_code?: string
  city?: string
  county?: string
  state?: string
  decision_maker_name?: string
  decision_maker_email: string
  decision_maker_phone?: string
  hoa_or_management_company?: string
  suspend_until: string
  opt_out_code: string
  created_at: string
  updated_at: string
}

export interface Upload {
  id: string
  filename: string
  parent_address: string
  extracted_names?: string[]
  status: "processing" | "completed" | "failed"
  total_properties: number
  processed_properties: number
  created_at: string
  updated_at: string
}

export interface EmailTemplate {
  id: number
  template_name: string
  subject?: string
  hook?: string
  body: string
  signature?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EmailLog {
  id: string
  property_id: string
  template_id: number
  campaign_week: number
  replied: boolean
  email_id: string
  thread_id: string
  sent_at: string
}

export interface CampaignProgress {
  id: number
  current_week: number
  last_sent_at: string
}

export interface ExtractedCommunity {
  id: string
  name: string
  editable?: boolean
}
