export interface Property {
  id: string
  community_name: string
  management_company?: string
  decision_maker_name?: string
  email?: string
  phone?: string
  street_address?: string
  city?: string
  county?: string
  state?: string
  zip_code?: string
  parent_address?: string
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

export interface ExtractedCommunity {
  id: string
  name: string
  editable?: boolean
}
