-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id SERIAL PRIMARY KEY,
  template_name TEXT NOT NULL,
  subject TEXT,
  hook TEXT,
  body TEXT NOT NULL,
  signature TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('UTC'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('UTC'::text, now())
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON public.email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_at ON public.email_templates(created_at DESC);

-- Insert sample data
INSERT INTO public.email_templates (template_name, subject, hook, body, signature, is_active) VALUES
('Email #1', 'The Silent Reason 43% of Your Tenants Leave (Fix It for $0)', 'Your Pool/Gym Won''t Stop This Bleeding – But This Will', '63% of renters prioritize wellness amenities over pools. Yet 0% of your competitors offer on-site & in-home massages… until now. Total Body Mobile Massage''s turnkey massage service slashes turnover by keeping residents addicted to their "spa-like lifestyle" – at no cost to you. Reply ''RETENTION'' – Get our amenity service proposal to start vacancy-proofing your property ASAP.', E'Lyndon S.\nTotal Body Mobile Massage – Outreach Team\nContact Email: tbmmoutreach@gmail.com\nCompany Website: www.totalbodymobilemassage.com', true)
ON CONFLICT DO NOTHING;
