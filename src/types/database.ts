
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"client_id": string | null,"created_at": string,"entity": string,"entity_id": string | null,"id": number,"ip": unknown,"metadata": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"client_id"?: string | null,"created_at"?: string,"entity": string,"entity_id"?: string | null,"id"?: never,"ip"?: unknown,"metadata"?: NonNullable<Json>
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"client_id"?: string | null,"created_at"?: string,"entity"?: string,"entity_id"?: string | null,"id"?: never,"ip"?: unknown,"metadata"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"client_feature_overrides": {
                  Row: {
                    "client_id": string,"created_at": string,"created_by": string | null,"enabled": boolean,"feature_key": string,"limit_value": number | null,"reason": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"created_at"?: string,"created_by"?: string | null,"enabled": boolean,"feature_key": string,"limit_value"?: number | null,"reason"?: string | null
                  }
                  Update: {
                    "client_id"?: string,"created_at"?: string,"created_by"?: string | null,"enabled"?: boolean,"feature_key"?: string,"limit_value"?: number | null,"reason"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "client_feature_overrides_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "client_feature_overrides_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "client_feature_overrides_feature_key_fkey"
      columns: ["feature_key"]
isOneToOne: false
      referencedRelation: "features"
      referencedColumns: ["key"]
    }
                  ]
                },"client_intake": {
                  Row: {
                    "allergens": (string)[],"allergy_notes": string | null,"available_days": (number)[],"birth_date": string | null,"class_schedule": string | null,"client_id": string,"created_at": string,"equipment": string | null,"equipment_notes": string | null,"experience": string | null,"food_budget_cents": number | null,"food_budget_period": string,"goal": string | null,"injuries": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allergens"?: (string)[],"allergy_notes"?: string | null,"available_days"?: (number)[],"birth_date"?: string | null,"class_schedule"?: string | null,"client_id": string,"created_at"?: string,"equipment"?: string | null,"equipment_notes"?: string | null,"experience"?: string | null,"food_budget_cents"?: number | null,"food_budget_period"?: string,"goal"?: string | null,"injuries"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "allergens"?: (string)[],"allergy_notes"?: string | null,"available_days"?: (number)[],"birth_date"?: string | null,"class_schedule"?: string | null,"client_id"?: string,"created_at"?: string,"equipment"?: string | null,"equipment_notes"?: string | null,"experience"?: string | null,"food_budget_cents"?: number | null,"food_budget_period"?: string,"goal"?: string | null,"injuries"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "client_intake_client_id_fkey"
      columns: ["client_id"]
isOneToOne: true
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
                  ]
                },"client_notes": {
                  Row: {
                    "author_id": string | null,"body": string,"client_id": string,"created_at": string,"id": string,"pinned": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body": string,"client_id": string,"created_at"?: string,"id"?: string,"pinned"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"client_id"?: string,"created_at"?: string,"id"?: string,"pinned"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "client_notes_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "client_notes_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
                  ]
                },"clients": {
                  Row: {
                    "billing_interval": string,"billing_mode": string,"cancelled_at": string | null,"checkin_frequency_days": number | null,"checkin_weekday": number | null,"created_at": string,"guardian_status": string,"id": string,"is_minor": boolean,"last_activity_at": string | null,"modalities": (string)[],"onboarding_completed_at": string | null,"plan_id": string | null,"profile_id": string,"referral_code": string | null,"started_at": string | null,"status": string,"stripe_customer_id": string | null,"tags": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "billing_interval"?: string,"billing_mode"?: string,"cancelled_at"?: string | null,"checkin_frequency_days"?: number | null,"checkin_weekday"?: number | null,"created_at"?: string,"guardian_status"?: string,"id"?: string,"is_minor"?: boolean,"last_activity_at"?: string | null,"modalities"?: (string)[],"onboarding_completed_at"?: string | null,"plan_id"?: string | null,"profile_id": string,"referral_code"?: string | null,"started_at"?: string | null,"status"?: string,"stripe_customer_id"?: string | null,"tags"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "billing_interval"?: string,"billing_mode"?: string,"cancelled_at"?: string | null,"checkin_frequency_days"?: number | null,"checkin_weekday"?: number | null,"created_at"?: string,"guardian_status"?: string,"id"?: string,"is_minor"?: boolean,"last_activity_at"?: string | null,"modalities"?: (string)[],"onboarding_completed_at"?: string | null,"plan_id"?: string | null,"profile_id"?: string,"referral_code"?: string | null,"started_at"?: string | null,"status"?: string,"stripe_customer_id"?: string | null,"tags"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clients_plan_fk"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clients_plan_fk"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "public_plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clients_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"consents": {
                  Row: {
                    "created_at": string,"document_version": string,"granted": boolean,"id": string,"ip": unknown,"kind": string,"profile_id": string,"user_agent": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"document_version": string,"granted": boolean,"id"?: string,"ip"?: unknown,"kind": string,"profile_id": string,"user_agent"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"document_version"?: string,"granted"?: boolean,"id"?: string,"ip"?: unknown,"kind"?: string,"profile_id"?: string,"user_agent"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "consents_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"discount_redemptions": {
                  Row: {
                    "applied_at": string | null,"client_id": string,"created_at": string,"discount_id": string,"ends_on": string | null,"id": string,"reserved_until": string | null,"revoked_at": string | null,"snapshot": NonNullable<Json>,"status": string,"subscription_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "applied_at"?: string | null,"client_id": string,"created_at"?: string,"discount_id": string,"ends_on"?: string | null,"id"?: string,"reserved_until"?: string | null,"revoked_at"?: string | null,"snapshot"?: NonNullable<Json>,"status"?: string,"subscription_id"?: string | null
                  }
                  Update: {
                    "applied_at"?: string | null,"client_id"?: string,"created_at"?: string,"discount_id"?: string,"ends_on"?: string | null,"id"?: string,"reserved_until"?: string | null,"revoked_at"?: string | null,"snapshot"?: NonNullable<Json>,"status"?: string,"subscription_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "discount_redemptions_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "discount_redemptions_discount_id_fkey"
      columns: ["discount_id"]
isOneToOne: false
      referencedRelation: "discounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "discount_redemptions_subscription_id_fkey"
      columns: ["subscription_id"]
isOneToOne: false
      referencedRelation: "subscriptions"
      referencedColumns: ["id"]
    }
                  ]
                },"discounts": {
                  Row: {
                    "applies_to_intervals": (string)[] | null,"applies_to_plan_keys": (string)[] | null,"auto_apply": boolean,"code": string | null,"created_at": string,"description": string | null,"duration": string,"duration_months": number | null,"expires_at": string | null,"id": string,"is_active": boolean,"kind": string,"max_per_client": number,"max_redemptions": number | null,"name": string,"requires_verification": boolean,"revoke_on_cancel": boolean,"stackable": boolean,"starts_at": string | null,"stripe_coupon_id": string | null,"stripe_promotion_code_id": string | null,"tiers": Json | null,"type": string,"updated_at": string,"value": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "applies_to_intervals"?: (string)[] | null,"applies_to_plan_keys"?: (string)[] | null,"auto_apply"?: boolean,"code"?: string | null,"created_at"?: string,"description"?: string | null,"duration"?: string,"duration_months"?: number | null,"expires_at"?: string | null,"id"?: string,"is_active"?: boolean,"kind": string,"max_per_client"?: number,"max_redemptions"?: number | null,"name": string,"requires_verification"?: boolean,"revoke_on_cancel"?: boolean,"stackable"?: boolean,"starts_at"?: string | null,"stripe_coupon_id"?: string | null,"stripe_promotion_code_id"?: string | null,"tiers"?: Json | null,"type": string,"updated_at"?: string,"value"?: number | null
                  }
                  Update: {
                    "applies_to_intervals"?: (string)[] | null,"applies_to_plan_keys"?: (string)[] | null,"auto_apply"?: boolean,"code"?: string | null,"created_at"?: string,"description"?: string | null,"duration"?: string,"duration_months"?: number | null,"expires_at"?: string | null,"id"?: string,"is_active"?: boolean,"kind"?: string,"max_per_client"?: number,"max_redemptions"?: number | null,"name"?: string,"requires_verification"?: boolean,"revoke_on_cancel"?: boolean,"stackable"?: boolean,"starts_at"?: string | null,"stripe_coupon_id"?: string | null,"stripe_promotion_code_id"?: string | null,"tiers"?: Json | null,"type"?: string,"updated_at"?: string,"value"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"documents": {
                  Row: {
                    "client_id": string,"created_at": string,"id": string,"kind": string,"storage_path": string,"title": string,"uploaded_by": string | null,"visible_to_client": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"created_at"?: string,"id"?: string,"kind"?: string,"storage_path": string,"title": string,"uploaded_by"?: string | null,"visible_to_client"?: boolean
                  }
                  Update: {
                    "client_id"?: string,"created_at"?: string,"id"?: string,"kind"?: string,"storage_path"?: string,"title"?: string,"uploaded_by"?: string | null,"visible_to_client"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"features": {
                  Row: {
                    "description": string | null,"key": string,"kind": string,"name": string,"sort_order": number,"unit": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"key": string,"kind"?: string,"name": string,"sort_order"?: number,"unit"?: string | null
                  }
                  Update: {
                    "description"?: string | null,"key"?: string,"kind"?: string,"name"?: string,"sort_order"?: number,"unit"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"guardian_authorizations": {
                  Row: {
                    "client_id": string,"confirmed_at": string | null,"confirmed_ip": unknown,"created_at": string,"expires_at": string,"guardian_email": string,"guardian_name": string,"id": string,"sent_at": string | null,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"confirmed_at"?: string | null,"confirmed_ip"?: unknown,"created_at"?: string,"expires_at": string,"guardian_email": string,"guardian_name": string,"id"?: string,"sent_at"?: string | null,"token_hash": string
                  }
                  Update: {
                    "client_id"?: string,"confirmed_at"?: string | null,"confirmed_ip"?: unknown,"created_at"?: string,"expires_at"?: string,"guardian_email"?: string,"guardian_name"?: string,"id"?: string,"sent_at"?: string | null,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "guardian_authorizations_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
                  ]
                },"health_screenings": {
                  Row: {
                    "answers": NonNullable<Json>,"client_id": string,"created_at": string,"has_flags": boolean,"id": string,"reviewed_at": string | null,"reviewed_by": string | null,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answers": NonNullable<Json>,"client_id": string,"created_at"?: string,"has_flags"?: boolean,"id"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"version": string
                  }
                  Update: {
                    "answers"?: NonNullable<Json>,"client_id"?: string,"created_at"?: string,"has_flags"?: boolean,"id"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "health_screenings_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "health_screenings_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"invoices_manual": {
                  Row: {
                    "client_id": string,"created_at": string,"file_path": string | null,"id": string,"issued_on": string,"notes": string | null,"number": string,"payment_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"created_at"?: string,"file_path"?: string | null,"id"?: string,"issued_on": string,"notes"?: string | null,"number": string,"payment_id"?: string | null
                  }
                  Update: {
                    "client_id"?: string,"created_at"?: string,"file_path"?: string | null,"id"?: string,"issued_on"?: string,"notes"?: string | null,"number"?: string,"payment_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "invoices_manual_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_manual_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    }
                  ]
                },"leads": {
                  Row: {
                    "answers": NonNullable<Json>,"assigned_to": string | null,"client_id": string | null,"consent_version": string | null,"created_at": string,"email": string,"event_date": string | null,"event_name": string | null,"id": string,"kind": string,"message": string | null,"name": string,"pack_weeks": number | null,"phone": string | null,"quoted_price_cents": number | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answers"?: NonNullable<Json>,"assigned_to"?: string | null,"client_id"?: string | null,"consent_version"?: string | null,"created_at"?: string,"email": string,"event_date"?: string | null,"event_name"?: string | null,"id"?: string,"kind"?: string,"message"?: string | null,"name": string,"pack_weeks"?: number | null,"phone"?: string | null,"quoted_price_cents"?: number | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "answers"?: NonNullable<Json>,"assigned_to"?: string | null,"client_id"?: string | null,"consent_version"?: string | null,"created_at"?: string,"email"?: string,"event_date"?: string | null,"event_name"?: string | null,"id"?: string,"kind"?: string,"message"?: string | null,"name"?: string,"pack_weeks"?: number | null,"phone"?: string | null,"quoted_price_cents"?: number | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "leads_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leads_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
                  ]
                },"legal_documents": {
                  Row: {
                    "body_md": string,"created_at": string,"id": string,"is_draft": boolean,"kind": string,"published_at": string | null,"title": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body_md": string,"created_at"?: string,"id"?: string,"is_draft"?: boolean,"kind": string,"published_at"?: string | null,"title": string,"version": string
                  }
                  Update: {
                    "body_md"?: string,"created_at"?: string,"id"?: string,"is_draft"?: boolean,"kind"?: string,"published_at"?: string | null,"title"?: string,"version"?: string
                  }
                  Relationships: [
                    
                  ]
                },"message_templates": {
                  Row: {
                    "body": string,"channel": string,"description": string | null,"key": string,"subject": string | null,"updated_at": string,"updated_by": string | null,"variables": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"channel": string,"description"?: string | null,"key": string,"subject"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"variables"?: (string)[]
                  }
                  Update: {
                    "body"?: string,"channel"?: string,"description"?: string | null,"key"?: string,"subject"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"variables"?: (string)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "message_templates_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_outbox": {
                  Row: {
                    "attempts": number,"channel": string,"created_at": string,"digest": boolean,"error": string | null,"id": string,"notification_id": string | null,"payload": NonNullable<Json>,"profile_id": string,"scheduled_for": string,"sent_at": string | null,"status": string,"template_key": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"channel": string,"created_at"?: string,"digest"?: boolean,"error"?: string | null,"id"?: string,"notification_id"?: string | null,"payload"?: NonNullable<Json>,"profile_id": string,"scheduled_for"?: string,"sent_at"?: string | null,"status"?: string,"template_key"?: string | null
                  }
                  Update: {
                    "attempts"?: number,"channel"?: string,"created_at"?: string,"digest"?: boolean,"error"?: string | null,"id"?: string,"notification_id"?: string | null,"payload"?: NonNullable<Json>,"profile_id"?: string,"scheduled_for"?: string,"sent_at"?: string | null,"status"?: string,"template_key"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_outbox_notification_id_fkey"
      columns: ["notification_id"]
isOneToOne: false
      referencedRelation: "notifications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notification_outbox_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_preferences": {
                  Row: {
                    "channel": string,"digest": boolean,"enabled": boolean,"profile_id": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "channel": string,"digest"?: boolean,"enabled"?: boolean,"profile_id": string,"type": string
                  }
                  Update: {
                    "channel"?: string,"digest"?: boolean,"enabled"?: boolean,"profile_id"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_preferences_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"client_id": string | null,"created_at": string,"data": NonNullable<Json>,"id": string,"link": string | null,"profile_id": string,"read_at": string | null,"title": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"client_id"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"link"?: string | null,"profile_id": string,"read_at"?: string | null,"title": string,"type": string
                  }
                  Update: {
                    "body"?: string | null,"client_id"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"link"?: string | null,"profile_id"?: string,"read_at"?: string | null,"title"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"onboarding_calls": {
                  Row: {
                    "agreed_goals": string | null,"client_id": string,"created_at": string,"created_by": string | null,"held_at": string | null,"id": string,"initial_blocks": string | null,"metrics_to_track": string | null,"notes": string | null,"observations": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agreed_goals"?: string | null,"client_id": string,"created_at"?: string,"created_by"?: string | null,"held_at"?: string | null,"id"?: string,"initial_blocks"?: string | null,"metrics_to_track"?: string | null,"notes"?: string | null,"observations"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "agreed_goals"?: string | null,"client_id"?: string,"created_at"?: string,"created_by"?: string | null,"held_at"?: string | null,"id"?: string,"initial_blocks"?: string | null,"metrics_to_track"?: string | null,"notes"?: string | null,"observations"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "onboarding_calls_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "onboarding_calls_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount_cents": number,"client_id": string,"created_at": string,"currency": string,"description": string | null,"discount_cents": number,"id": string,"kind": string,"method": string,"notes": string | null,"paid_at": string | null,"period_end": string | null,"period_start": string | null,"recorded_by": string | null,"status": string,"stripe_checkout_session_id": string | null,"stripe_invoice_id": string | null,"stripe_payment_intent_id": string | null,"subscription_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"client_id": string,"created_at"?: string,"currency"?: string,"description"?: string | null,"discount_cents"?: number,"id"?: string,"kind"?: string,"method": string,"notes"?: string | null,"paid_at"?: string | null,"period_end"?: string | null,"period_start"?: string | null,"recorded_by"?: string | null,"status"?: string,"stripe_checkout_session_id"?: string | null,"stripe_invoice_id"?: string | null,"stripe_payment_intent_id"?: string | null,"subscription_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"client_id"?: string,"created_at"?: string,"currency"?: string,"description"?: string | null,"discount_cents"?: number,"id"?: string,"kind"?: string,"method"?: string,"notes"?: string | null,"paid_at"?: string | null,"period_end"?: string | null,"period_start"?: string | null,"recorded_by"?: string | null,"status"?: string,"stripe_checkout_session_id"?: string | null,"stripe_invoice_id"?: string | null,"stripe_payment_intent_id"?: string | null,"subscription_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_subscription_id_fkey"
      columns: ["subscription_id"]
isOneToOne: false
      referencedRelation: "subscriptions"
      referencedColumns: ["id"]
    }
                  ]
                },"plan_features": {
                  Row: {
                    "enabled": boolean,"feature_key": string,"label": string | null,"limit_value": number | null,"plan_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "enabled"?: boolean,"feature_key": string,"label"?: string | null,"limit_value"?: number | null,"plan_id": string
                  }
                  Update: {
                    "enabled"?: boolean,"feature_key"?: string,"label"?: string | null,"limit_value"?: number | null,"plan_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "plan_features_feature_key_fkey"
      columns: ["feature_key"]
isOneToOne: false
      referencedRelation: "features"
      referencedColumns: ["key"]
    },{
      foreignKeyName: "plan_features_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plan_features_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "public_plans"
      referencedColumns: ["id"]
    }
                  ]
                },"plan_prices": {
                  Row: {
                    "amount_cents": number,"created_at": string,"id": string,"interval": string,"plan_id": string,"stripe_price_id": string | null,"valid_from": string,"valid_to": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"created_at"?: string,"id"?: string,"interval": string,"plan_id": string,"stripe_price_id"?: string | null,"valid_from"?: string,"valid_to"?: string | null
                  }
                  Update: {
                    "amount_cents"?: number,"created_at"?: string,"id"?: string,"interval"?: string,"plan_id"?: string,"stripe_price_id"?: string | null,"valid_from"?: string,"valid_to"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "plan_prices_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plan_prices_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "public_plans"
      referencedColumns: ["id"]
    }
                  ]
                },"plans": {
                  Row: {
                    "annual_allowed": boolean,"badge": string | null,"created_at": string,"currency": string,"description": string | null,"highlights": (string)[],"id": string,"is_active": boolean,"is_public": boolean,"key": string,"name": string,"price_cents": number | null,"requires_application": boolean,"sort_order": number,"stripe_product_id": string | null,"tagline": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "annual_allowed"?: boolean,"badge"?: string | null,"created_at"?: string,"currency"?: string,"description"?: string | null,"highlights"?: (string)[],"id"?: string,"is_active"?: boolean,"is_public"?: boolean,"key": string,"name": string,"price_cents"?: number | null,"requires_application"?: boolean,"sort_order"?: number,"stripe_product_id"?: string | null,"tagline"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "annual_allowed"?: boolean,"badge"?: string | null,"created_at"?: string,"currency"?: string,"description"?: string | null,"highlights"?: (string)[],"id"?: string,"is_active"?: boolean,"is_public"?: boolean,"key"?: string,"name"?: string,"price_cents"?: number | null,"requires_application"?: boolean,"sort_order"?: number,"stripe_product_id"?: string | null,"tagline"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profile_changes": {
                  Row: {
                    "changed_by": string | null,"client_id": string,"created_at": string,"field": string,"id": number,"new_value": Json | null,"notified_at": string | null,"old_value": Json | null,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_by"?: string | null,"client_id": string,"created_at"?: string,"field": string,"id"?: never,"new_value"?: Json | null,"notified_at"?: string | null,"old_value"?: Json | null,"table_name": string
                  }
                  Update: {
                    "changed_by"?: string | null,"client_id"?: string,"created_at"?: string,"field"?: string,"id"?: never,"new_value"?: Json | null,"notified_at"?: string | null,"old_value"?: Json | null,"table_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_changes_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_changes_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"created_at": string,"deleted_at": string | null,"email": string,"full_name": string,"id": string,"phone": string | null,"role": string,"theme": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"email": string,"full_name"?: string,"id": string,"phone"?: string | null,"role"?: string,"theme"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "avatar_path"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"email"?: string,"full_name"?: string,"id"?: string,"phone"?: string | null,"role"?: string,"theme"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"last_used_at": string | null,"p256dh": string,"profile_id": string,"user_agent": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"last_used_at"?: string | null,"p256dh": string,"profile_id": string,"user_agent"?: string | null
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"last_used_at"?: string | null,"p256dh"?: string,"profile_id"?: string,"user_agent"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"referrals": {
                  Row: {
                    "code_used": string,"created_at": string,"id": string,"qualified_at": string | null,"referred_client_id": string,"referrer_client_id": string,"squad_id": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code_used": string,"created_at"?: string,"id"?: string,"qualified_at"?: string | null,"referred_client_id": string,"referrer_client_id": string,"squad_id"?: string | null,"status"?: string
                  }
                  Update: {
                    "code_used"?: string,"created_at"?: string,"id"?: string,"qualified_at"?: string | null,"referred_client_id"?: string,"referrer_client_id"?: string,"squad_id"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "referrals_referred_client_id_fkey"
      columns: ["referred_client_id"]
isOneToOne: true
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "referrals_referrer_client_id_fkey"
      columns: ["referrer_client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "referrals_squad_id_fkey"
      columns: ["squad_id"]
isOneToOne: false
      referencedRelation: "squads"
      referencedColumns: ["id"]
    }
                  ]
                },"session_credits": {
                  Row: {
                    "appointment_id": string | null,"client_id": string,"created_at": string,"created_by": string | null,"credit_type": string,"delta": number,"expires_at": string | null,"id": string,"notes": string | null,"payment_id": string | null,"period_start": string | null,"reason": string
                  }
                  ComputedFields: never
                  Insert: {
                    "appointment_id"?: string | null,"client_id": string,"created_at"?: string,"created_by"?: string | null,"credit_type": string,"delta": number,"expires_at"?: string | null,"id"?: string,"notes"?: string | null,"payment_id"?: string | null,"period_start"?: string | null,"reason": string
                  }
                  Update: {
                    "appointment_id"?: string | null,"client_id"?: string,"created_at"?: string,"created_by"?: string | null,"credit_type"?: string,"delta"?: number,"expires_at"?: string | null,"id"?: string,"notes"?: string | null,"payment_id"?: string | null,"period_start"?: string | null,"reason"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "session_credits_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_credits_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_credits_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "description": string | null,"is_public": boolean,"key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"is_public"?: boolean,"key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "description"?: string | null,"is_public"?: boolean,"key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"squad_members": {
                  Row: {
                    "client_id": string,"joined_at": string,"left_at": string | null,"squad_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"joined_at"?: string,"left_at"?: string | null,"squad_id": string
                  }
                  Update: {
                    "client_id"?: string,"joined_at"?: string,"left_at"?: string | null,"squad_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "squad_members_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "squad_members_squad_id_fkey"
      columns: ["squad_id"]
isOneToOne: false
      referencedRelation: "squads"
      referencedColumns: ["id"]
    }
                  ]
                },"squads": {
                  Row: {
                    "code": string,"created_at": string,"id": string,"owner_client_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"id"?: string,"owner_client_id"?: string | null
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"id"?: string,"owner_client_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "squads_owner_client_id_fkey"
      columns: ["owner_client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
                  ]
                },"staff_permissions": {
                  Row: {
                    "created_at": string,"profile_id": string,"scope": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"profile_id": string,"scope": string
                  }
                  Update: {
                    "created_at"?: string,"profile_id"?: string,"scope"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_permissions_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"stripe_events": {
                  Row: {
                    "error": string | null,"id": string,"payload": NonNullable<Json>,"processed_at": string | null,"received_at": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "error"?: string | null,"id": string,"payload": NonNullable<Json>,"processed_at"?: string | null,"received_at"?: string,"type": string
                  }
                  Update: {
                    "error"?: string | null,"id"?: string,"payload"?: NonNullable<Json>,"processed_at"?: string | null,"received_at"?: string,"type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"student_verifications": {
                  Row: {
                    "card_path": string,"client_id": string,"created_at": string,"id": string,"rejection_reason": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": string,"valid_until": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "card_path": string,"client_id": string,"created_at"?: string,"id"?: string,"rejection_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"valid_until"?: string | null
                  }
                  Update: {
                    "card_path"?: string,"client_id"?: string,"created_at"?: string,"id"?: string,"rejection_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"valid_until"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_verifications_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_verifications_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"subscriptions": {
                  Row: {
                    "amount_cents": number,"anchor_day": number | null,"billing_interval": string,"billing_mode": string,"cancel_at_period_end": boolean,"client_id": string,"created_at": string,"current_period_end": string | null,"current_period_start": string | null,"discount_breakdown": NonNullable<Json>,"ended_at": string | null,"grace_until": string | null,"id": string,"list_price_cents": number,"paused_until": string | null,"plan_id": string,"started_at": string | null,"status": string,"stripe_price_id": string | null,"stripe_subscription_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"anchor_day"?: number | null,"billing_interval"?: string,"billing_mode": string,"cancel_at_period_end"?: boolean,"client_id": string,"created_at"?: string,"current_period_end"?: string | null,"current_period_start"?: string | null,"discount_breakdown"?: NonNullable<Json>,"ended_at"?: string | null,"grace_until"?: string | null,"id"?: string,"list_price_cents": number,"paused_until"?: string | null,"plan_id": string,"started_at"?: string | null,"status"?: string,"stripe_price_id"?: string | null,"stripe_subscription_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"anchor_day"?: number | null,"billing_interval"?: string,"billing_mode"?: string,"cancel_at_period_end"?: boolean,"client_id"?: string,"created_at"?: string,"current_period_end"?: string | null,"current_period_start"?: string | null,"discount_breakdown"?: NonNullable<Json>,"ended_at"?: string | null,"grace_until"?: string | null,"id"?: string,"list_price_cents"?: number,"paused_until"?: string | null,"plan_id"?: string,"started_at"?: string | null,"status"?: string,"stripe_price_id"?: string | null,"stripe_subscription_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "public_plans"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "current_consents": {
                  Row: {
                    "created_at": string,"document_version": string,"granted": boolean,"kind": string,"profile_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "consents_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"public_plan_features": {
                  Row: {
                    "enabled": boolean,"feature_description": string | null,"feature_key": string,"feature_name": string,"kind": string,"label": string | null,"limit_value": number | null,"plan_id": string,"sort_order": number
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "plan_features_feature_key_fkey"
      columns: ["feature_key"]
isOneToOne: false
      referencedRelation: "features"
      referencedColumns: ["key"]
    },{
      foreignKeyName: "plan_features_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plan_features_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "public_plans"
      referencedColumns: ["id"]
    }
                  ]
                },"public_plans": {
                  Row: {
                    "annual_allowed": boolean,"badge": string | null,"currency": string,"description": string | null,"highlights": (string)[],"id": string,"key": string,"name": string,"price_cents": number | null,"requires_application": boolean,"sort_order": number,"tagline": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "annual_allowed"?: boolean | null,"badge"?: string | null,"currency"?: string | null,"description"?: string | null,"highlights"?: (string)[] | null,"id"?: string | null,"key"?: string | null,"name"?: string | null,"price_cents"?: never,"requires_application"?: boolean | null,"sort_order"?: number | null,"tagline"?: string | null
                         }
                        Update: {
                           "annual_allowed"?: boolean | null,"badge"?: string | null,"currency"?: string | null,"description"?: string | null,"highlights"?: (string)[] | null,"id"?: string | null,"key"?: string | null,"name"?: string | null,"price_cents"?: never,"requires_application"?: boolean | null,"sort_order"?: number | null,"tagline"?: string | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "client_credit_balance":
{ Args: { "p_client_id": string,"p_type": string }; Returns: number
                           },
"client_has_access":
{ Args: { "p_client_id": string }; Returns: boolean
                           },
"current_role_name":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"feature_for_client":
{ Args: { "p_client_id": string,"p_feature": string }; Returns: {
              "enabled": boolean,"limit_value": number
            }[]
                           },
"founder_slots_left":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"has_feature":
{ Args: { "p_client_id": string,"p_feature": string }; Returns: boolean
                           },
"has_scope":
{ Args: { "p_scope": string }; Returns: boolean
                           },
"is_owner":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"log_access":
{ Args: { "p_client_id": string,"p_entity": string,"p_entity_id": string,"p_metadata"?: Json }; Returns: undefined
                           },
"my_client_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"my_squad_size":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"notify":
{ Args: { "p_body"?: string,"p_client_id"?: string,"p_data"?: Json,"p_link"?: string,"p_profile_id": string,"p_template_key"?: string,"p_title": string,"p_type": string }; Returns: string
                           },
"notify_staff":
{ Args: { "p_body"?: string,"p_client_id"?: string,"p_data"?: Json,"p_link"?: string,"p_title": string,"p_type": string }; Returns: undefined
                           },
"storage_owner_segment":
{ Args: { "p_name": string }; Returns: string
                           },
"today_madrid":
{ Args: Record<PropertyKey, never>; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
