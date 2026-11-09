
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
            "affiliate_clicks": {
                  Row: {
                    "clicked_at": string,"client_id": string | null,"id": number,"link_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "clicked_at"?: string,"client_id"?: string | null,"id"?: never,"link_id": string
                  }
                  Update: {
                    "clicked_at"?: string,"client_id"?: string | null,"id"?: never,"link_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "affiliate_clicks_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "affiliate_clicks_link_id_fkey"
      columns: ["link_id"]
isOneToOne: false
      referencedRelation: "affiliate_links"
      referencedColumns: ["id"]
    }
                  ]
                },"affiliate_links": {
                  Row: {
                    "code": string | null,"created_at": string,"description": string | null,"id": string,"is_active": boolean,"label": string,"sort_order": number,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"label": string,"sort_order"?: number,"url": string
                  }
                  Update: {
                    "code"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"label"?: string,"sort_order"?: number,"url"?: string
                  }
                  Relationships: [
                    
                  ]
                },"appointment_types": {
                  Row: {
                    "available_from": string | null,"bookable_by_client": boolean,"buffer_min": number,"cancel_notice_h": number,"created_at": string,"credit_types": (string)[],"description": string | null,"duration_min": number,"feature_key": string | null,"is_active": boolean,"key": string,"location": string | null,"min_notice_h": number,"modality": string,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "available_from"?: string | null,"bookable_by_client"?: boolean,"buffer_min"?: number,"cancel_notice_h"?: number,"created_at"?: string,"credit_types"?: (string)[],"description"?: string | null,"duration_min": number,"feature_key"?: string | null,"is_active"?: boolean,"key": string,"location"?: string | null,"min_notice_h"?: number,"modality"?: string,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "available_from"?: string | null,"bookable_by_client"?: boolean,"buffer_min"?: number,"cancel_notice_h"?: number,"created_at"?: string,"credit_types"?: (string)[],"description"?: string | null,"duration_min"?: number,"feature_key"?: string | null,"is_active"?: boolean,"key"?: string,"location"?: string | null,"min_notice_h"?: number,"modality"?: string,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "appointment_types_feature_key_fkey"
      columns: ["feature_key"]
isOneToOne: false
      referencedRelation: "features"
      referencedColumns: ["key"]
    }
                  ]
                },"appointments": {
                  Row: {
                    "cancel_reason": string | null,"cancelled_at": string | null,"cancelled_by": string | null,"client_id": string,"client_notes": string | null,"created_at": string,"created_by": string | null,"credit_type": string | null,"ends_at": string,"goals": (string)[],"google_event_id": string | null,"id": string,"late_cancel": boolean,"location": string | null,"meet_url": string | null,"modality": string,"reminder_1h_at": string | null,"reminder_24h_at": string | null,"staff_notes": string | null,"starts_at": string,"status": string,"summary": string | null,"type_key": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"client_id": string,"client_notes"?: string | null,"created_at"?: string,"created_by"?: string | null,"credit_type"?: string | null,"ends_at": string,"goals"?: (string)[],"google_event_id"?: string | null,"id"?: string,"late_cancel"?: boolean,"location"?: string | null,"meet_url"?: string | null,"modality"?: string,"reminder_1h_at"?: string | null,"reminder_24h_at"?: string | null,"staff_notes"?: string | null,"starts_at": string,"status"?: string,"summary"?: string | null,"type_key": string,"updated_at"?: string
                  }
                  Update: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"client_id"?: string,"client_notes"?: string | null,"created_at"?: string,"created_by"?: string | null,"credit_type"?: string | null,"ends_at"?: string,"goals"?: (string)[],"google_event_id"?: string | null,"id"?: string,"late_cancel"?: boolean,"location"?: string | null,"meet_url"?: string | null,"modality"?: string,"reminder_1h_at"?: string | null,"reminder_24h_at"?: string | null,"staff_notes"?: string | null,"starts_at"?: string,"status"?: string,"summary"?: string | null,"type_key"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "appointments_cancelled_by_fkey"
      columns: ["cancelled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_type_key_fkey"
      columns: ["type_key"]
isOneToOne: false
      referencedRelation: "appointment_types"
      referencedColumns: ["key"]
    }
                  ]
                },"audit_log": {
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
                },"availability": {
                  Row: {
                    "created_at": string,"end_time": string,"id": string,"is_active": boolean,"start_time": string,"type_keys": (string)[],"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"end_time": string,"id"?: string,"is_active"?: boolean,"start_time": string,"type_keys"?: (string)[],"weekday": number
                  }
                  Update: {
                    "created_at"?: string,"end_time"?: string,"id"?: string,"is_active"?: boolean,"start_time"?: string,"type_keys"?: (string)[],"weekday"?: number
                  }
                  Relationships: [
                    
                  ]
                },"availability_exceptions": {
                  Row: {
                    "created_at": string,"created_by": string | null,"ends_at": string,"id": string,"kind": string,"reason": string | null,"starts_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"ends_at": string,"id"?: string,"kind"?: string,"reason"?: string | null,"starts_at": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"ends_at"?: string,"id"?: string,"kind"?: string,"reason"?: string | null,"starts_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "availability_exceptions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"badges": {
                  Row: {
                    "created_at": string,"description": string,"icon": string,"is_active": boolean,"key": string,"kind": string,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description": string,"icon"?: string,"is_active"?: boolean,"key": string,"kind": string,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"icon"?: string,"is_active"?: boolean,"key"?: string,"kind"?: string,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"banner_events": {
                  Row: {
                    "banner_key": string,"created_at": string,"event": string,"id": number,"referrer": string | null,"session_hash": string | null,"ubicacion": string | null,"utm_source": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "banner_key"?: string,"created_at"?: string,"event": string,"id"?: never,"referrer"?: string | null,"session_hash"?: string | null,"ubicacion"?: string | null,"utm_source"?: string | null
                  }
                  Update: {
                    "banner_key"?: string,"created_at"?: string,"event"?: string,"id"?: never,"referrer"?: string | null,"session_hash"?: string | null,"ubicacion"?: string | null,"utm_source"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"challenge_participants": {
                  Row: {
                    "challenge_id": string,"client_id": string,"completed_at": string | null,"joined_at": string,"progress": number
                  }
                  ComputedFields: never
                  Insert: {
                    "challenge_id": string,"client_id": string,"completed_at"?: string | null,"joined_at"?: string,"progress"?: number
                  }
                  Update: {
                    "challenge_id"?: string,"client_id"?: string,"completed_at"?: string | null,"joined_at"?: string,"progress"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "challenge_participants_challenge_id_fkey"
      columns: ["challenge_id"]
isOneToOne: false
      referencedRelation: "challenges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "challenge_participants_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
                  ]
                },"challenges": {
                  Row: {
                    "badge_key": string | null,"created_at": string,"created_by": string | null,"description": string | null,"ends_on": string,"id": string,"is_active": boolean,"plan_keys": (string)[],"rule": NonNullable<Json>,"starts_on": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "badge_key"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"ends_on": string,"id"?: string,"is_active"?: boolean,"plan_keys"?: (string)[],"rule": NonNullable<Json>,"starts_on": string,"title": string
                  }
                  Update: {
                    "badge_key"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"ends_on"?: string,"id"?: string,"is_active"?: boolean,"plan_keys"?: (string)[],"rule"?: NonNullable<Json>,"starts_on"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "challenges_badge_key_fkey"
      columns: ["badge_key"]
isOneToOne: false
      referencedRelation: "badges"
      referencedColumns: ["key"]
    },{
      foreignKeyName: "challenges_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"checkin_answers": {
                  Row: {
                    "checkin_id": string,"client_id": string,"question_key": string,"question_label": string,"value": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "checkin_id": string,"client_id": string,"question_key": string,"question_label": string,"value"?: Json | null
                  }
                  Update: {
                    "checkin_id"?: string,"client_id"?: string,"question_key"?: string,"question_label"?: string,"value"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "checkin_answers_checkin_id_fkey"
      columns: ["checkin_id"]
isOneToOne: false
      referencedRelation: "checkins"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checkin_answers_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
                  ]
                },"checkin_templates": {
                  Row: {
                    "created_at": string,"id": string,"include_metrics": boolean,"include_photos": boolean,"is_default": boolean,"name": string,"questions": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"include_metrics"?: boolean,"include_photos"?: boolean,"is_default"?: boolean,"name": string,"questions"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"include_metrics"?: boolean,"include_photos"?: boolean,"is_default"?: boolean,"name"?: string,"questions"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"checkins": {
                  Row: {
                    "client_id": string,"created_at": string,"due_on": string,"id": string,"reminded_at": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"staff_reply": string | null,"staff_voice_path": string | null,"status": string,"submitted_at": string | null,"template_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"created_at"?: string,"due_on": string,"id"?: string,"reminded_at"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"staff_reply"?: string | null,"staff_voice_path"?: string | null,"status"?: string,"submitted_at"?: string | null,"template_id"?: string | null
                  }
                  Update: {
                    "client_id"?: string,"created_at"?: string,"due_on"?: string,"id"?: string,"reminded_at"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"staff_reply"?: string | null,"staff_voice_path"?: string | null,"status"?: string,"submitted_at"?: string | null,"template_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "checkins_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checkins_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checkins_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "checkin_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"client_badges": {
                  Row: {
                    "awarded_at": string,"badge_key": string,"client_id": string,"seen_at": string | null,"source_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "awarded_at"?: string,"badge_key": string,"client_id": string,"seen_at"?: string | null,"source_id"?: string | null
                  }
                  Update: {
                    "awarded_at"?: string,"badge_key"?: string,"client_id"?: string,"seen_at"?: string | null,"source_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "client_badges_badge_key_fkey"
      columns: ["badge_key"]
isOneToOne: false
      referencedRelation: "badges"
      referencedColumns: ["key"]
    },{
      foreignKeyName: "client_badges_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
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
                },"client_metrics": {
                  Row: {
                    "activated_at": string,"client_id": string,"frequency": string,"is_active": boolean,"metric_id": string,"target_direction": string | null,"target_value": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activated_at"?: string,"client_id": string,"frequency"?: string,"is_active"?: boolean,"metric_id": string,"target_direction"?: string | null,"target_value"?: number | null
                  }
                  Update: {
                    "activated_at"?: string,"client_id"?: string,"frequency"?: string,"is_active"?: boolean,"metric_id"?: string,"target_direction"?: string | null,"target_value"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "client_metrics_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "client_metrics_metric_id_fkey"
      columns: ["metric_id"]
isOneToOne: false
      referencedRelation: "metric_definitions"
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
                },"client_streaks": {
                  Row: {
                    "best_checkin_streak": number,"best_training_weeks": number,"checkin_streak": number,"client_id": string,"training_weeks": number,"updated_at": string,"week_done": number,"week_planned": number
                  }
                  ComputedFields: never
                  Insert: {
                    "best_checkin_streak"?: number,"best_training_weeks"?: number,"checkin_streak"?: number,"client_id": string,"training_weeks"?: number,"updated_at"?: string,"week_done"?: number,"week_planned"?: number
                  }
                  Update: {
                    "best_checkin_streak"?: number,"best_training_weeks"?: number,"checkin_streak"?: number,"client_id"?: string,"training_weeks"?: number,"updated_at"?: string,"week_done"?: number,"week_planned"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "client_streaks_client_id_fkey"
      columns: ["client_id"]
isOneToOne: true
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
                },"conversation_reads": {
                  Row: {
                    "conversation_id": string,"last_read_at": string,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "conversation_id": string,"last_read_at"?: string,"profile_id": string
                  }
                  Update: {
                    "conversation_id"?: string,"last_read_at"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversation_reads_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversation_reads_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "client_id": string,"created_at": string,"id": string,"last_message_at": string | null,"last_message_preview": string | null,"last_sender_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"created_at"?: string,"id"?: string,"last_message_at"?: string | null,"last_message_preview"?: string | null,"last_sender_id"?: string | null
                  }
                  Update: {
                    "client_id"?: string,"created_at"?: string,"id"?: string,"last_message_at"?: string | null,"last_message_preview"?: string | null,"last_sender_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_client_id_fkey"
      columns: ["client_id"]
isOneToOne: true
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_last_sender_id_fkey"
      columns: ["last_sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"custom_field_values": {
                  Row: {
                    "client_id": string,"field_id": string,"updated_at": string,"value": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"field_id": string,"updated_at"?: string,"value"?: Json | null
                  }
                  Update: {
                    "client_id"?: string,"field_id"?: string,"updated_at"?: string,"value"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "custom_field_values_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "custom_field_values_field_id_fkey"
      columns: ["field_id"]
isOneToOne: false
      referencedRelation: "custom_fields"
      referencedColumns: ["id"]
    }
                  ]
                },"custom_fields": {
                  Row: {
                    "client_editable": boolean,"created_at": string,"id": string,"is_active": boolean,"key": string,"label": string,"options": (string)[],"sort_order": number,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_editable"?: boolean,"created_at"?: string,"id"?: string,"is_active"?: boolean,"key": string,"label": string,"options"?: (string)[],"sort_order"?: number,"type": string
                  }
                  Update: {
                    "client_editable"?: boolean,"created_at"?: string,"id"?: string,"is_active"?: boolean,"key"?: string,"label"?: string,"options"?: (string)[],"sort_order"?: number,"type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"day_notes": {
                  Row: {
                    "author_id": string,"body": string,"client_id": string,"created_at": string,"date": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"client_id": string,"created_at"?: string,"date": string,"id"?: string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"client_id"?: string,"created_at"?: string,"date"?: string,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "day_notes_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "day_notes_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
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
                },"exercise_relations": {
                  Row: {
                    "exercise_id": string,"kind": string,"related_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "exercise_id": string,"kind": string,"related_id": string
                  }
                  Update: {
                    "exercise_id"?: string,"kind"?: string,"related_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercise_relations_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "exercise_relations_related_id_fkey"
      columns: ["related_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    }
                  ]
                },"exercises": {
                  Row: {
                    "common_mistakes": string | null,"created_at": string,"created_by": string | null,"equipment": (string)[],"id": string,"instructions": string | null,"is_active": boolean,"modality": string,"muscle_groups": (string)[],"name": string,"tags": (string)[],"updated_at": string,"video_provider": string | null,"video_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "common_mistakes"?: string | null,"created_at"?: string,"created_by"?: string | null,"equipment"?: (string)[],"id"?: string,"instructions"?: string | null,"is_active"?: boolean,"modality"?: string,"muscle_groups"?: (string)[],"name": string,"tags"?: (string)[],"updated_at"?: string,"video_provider"?: string | null,"video_url"?: string | null
                  }
                  Update: {
                    "common_mistakes"?: string | null,"created_at"?: string,"created_by"?: string | null,"equipment"?: (string)[],"id"?: string,"instructions"?: string | null,"is_active"?: boolean,"modality"?: string,"muscle_groups"?: (string)[],"name"?: string,"tags"?: (string)[],"updated_at"?: string,"video_provider"?: string | null,"video_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercises_created_by_fkey"
      columns: ["created_by"]
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
                },"foods": {
                  Row: {
                    "allergens": (string)[],"brand": string | null,"carbs_g": number | null,"category": string | null,"created_at": string,"fat_g": number | null,"fiber_g": number | null,"id": string,"is_active": boolean,"kcal": number | null,"name": string,"off_barcode": string | null,"pack_size_g": number | null,"price_cents": number | null,"protein_g": number | null,"salt_g": number | null,"source": string,"sugar_g": number | null,"supermarket_section": string,"unit_grams": number | null,"unit_name": string | null,"updated_at": string,"verified": boolean,"verified_at": string | null,"verified_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "allergens"?: (string)[],"brand"?: string | null,"carbs_g"?: number | null,"category"?: string | null,"created_at"?: string,"fat_g"?: number | null,"fiber_g"?: number | null,"id"?: string,"is_active"?: boolean,"kcal"?: number | null,"name": string,"off_barcode"?: string | null,"pack_size_g"?: number | null,"price_cents"?: number | null,"protein_g"?: number | null,"salt_g"?: number | null,"source"?: string,"sugar_g"?: number | null,"supermarket_section"?: string,"unit_grams"?: number | null,"unit_name"?: string | null,"updated_at"?: string,"verified"?: boolean,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Update: {
                    "allergens"?: (string)[],"brand"?: string | null,"carbs_g"?: number | null,"category"?: string | null,"created_at"?: string,"fat_g"?: number | null,"fiber_g"?: number | null,"id"?: string,"is_active"?: boolean,"kcal"?: number | null,"name"?: string,"off_barcode"?: string | null,"pack_size_g"?: number | null,"price_cents"?: number | null,"protein_g"?: number | null,"salt_g"?: number | null,"source"?: string,"sugar_g"?: number | null,"supermarket_section"?: string,"unit_grams"?: number | null,"unit_name"?: string | null,"updated_at"?: string,"verified"?: boolean,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "foods_verified_by_fkey"
      columns: ["verified_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"google_connections": {
                  Row: {
                    "calendar_id": string,"connected_at": string,"google_email": string | null,"profile_id": string,"vault_secret_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "calendar_id"?: string,"connected_at"?: string,"google_email"?: string | null,"profile_id": string,"vault_secret_id"?: string | null
                  }
                  Update: {
                    "calendar_id"?: string,"connected_at"?: string,"google_email"?: string | null,"profile_id"?: string,"vault_secret_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "google_connections_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
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
                },"hyrox_events": {
                  Row: {
                    "city": string | null,"created_at": string,"event_date": string,"id": string,"is_active": boolean,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "city"?: string | null,"created_at"?: string,"event_date": string,"id"?: string,"is_active"?: boolean,"name": string
                  }
                  Update: {
                    "city"?: string | null,"created_at"?: string,"event_date"?: string,"id"?: string,"is_active"?: boolean,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"hyrox_mailing_recipients": {
                  Row: {
                    "error": string | null,"mailing_id": string,"sent_at": string | null,"status": string,"waitlist_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "error"?: string | null,"mailing_id": string,"sent_at"?: string | null,"status"?: string,"waitlist_id": string
                  }
                  Update: {
                    "error"?: string | null,"mailing_id"?: string,"sent_at"?: string | null,"status"?: string,"waitlist_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "hyrox_mailing_recipients_mailing_id_fkey"
      columns: ["mailing_id"]
isOneToOne: false
      referencedRelation: "hyrox_mailings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "hyrox_mailing_recipients_waitlist_id_fkey"
      columns: ["waitlist_id"]
isOneToOne: false
      referencedRelation: "waitlist_hyrox"
      referencedColumns: ["id"]
    }
                  ]
                },"hyrox_mailings": {
                  Row: {
                    "body": string,"created_at": string,"created_by": string | null,"filter": NonNullable<Json>,"id": string,"sent": number,"status": string,"subject": string,"total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"created_by"?: string | null,"filter"?: NonNullable<Json>,"id"?: string,"sent"?: number,"status"?: string,"subject": string,"total"?: number
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"created_by"?: string | null,"filter"?: NonNullable<Json>,"id"?: string,"sent"?: number,"status"?: string,"subject"?: string,"total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "hyrox_mailings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"hyrox_stations": {
                  Row: {
                    "default_distance_m": number | null,"default_reps": number | null,"key": string,"name": string,"sort_order": number,"weights": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "default_distance_m"?: number | null,"default_reps"?: number | null,"key": string,"name": string,"sort_order": number,"weights"?: NonNullable<Json>
                  }
                  Update: {
                    "default_distance_m"?: number | null,"default_reps"?: number | null,"key"?: string,"name"?: string,"sort_order"?: number,"weights"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"import_jobs": {
                  Row: {
                    "created_at": string,"created_by": string | null,"file_name": string | null,"id": string,"kind": string,"row_errors": NonNullable<Json>,"status": string,"summary": NonNullable<Json>,"target": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"file_name"?: string | null,"id"?: string,"kind": string,"row_errors"?: NonNullable<Json>,"status"?: string,"summary"?: NonNullable<Json>,"target"?: NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"file_name"?: string | null,"id"?: string,"kind"?: string,"row_errors"?: NonNullable<Json>,"status"?: string,"summary"?: NonNullable<Json>,"target"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_jobs_created_by_fkey"
      columns: ["created_by"]
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
                },"meal_change_requests": {
                  Row: {
                    "client_id": string,"created_at": string,"day_index": number | null,"id": string,"meal_id": string | null,"meal_plan_id": string | null,"reason": string,"resolved_at": string | null,"resolved_by": string | null,"response": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"created_at"?: string,"day_index"?: number | null,"id"?: string,"meal_id"?: string | null,"meal_plan_id"?: string | null,"reason": string,"resolved_at"?: string | null,"resolved_by"?: string | null,"response"?: string | null,"status"?: string
                  }
                  Update: {
                    "client_id"?: string,"created_at"?: string,"day_index"?: number | null,"id"?: string,"meal_id"?: string | null,"meal_plan_id"?: string | null,"reason"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null,"response"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meal_change_requests_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meal_change_requests_meal_id_fkey"
      columns: ["meal_id"]
isOneToOne: false
      referencedRelation: "meals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meal_change_requests_meal_plan_id_fkey"
      columns: ["meal_plan_id"]
isOneToOne: false
      referencedRelation: "meal_plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meal_change_requests_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"meal_items": {
                  Row: {
                    "client_id": string | null,"food_id": string,"id": string,"meal_id": string,"notes": string | null,"quantity_g": number | null,"quantity_units": number | null,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id"?: string | null,"food_id": string,"id"?: string,"meal_id": string,"notes"?: string | null,"quantity_g"?: number | null,"quantity_units"?: number | null,"sort_order"?: number
                  }
                  Update: {
                    "client_id"?: string | null,"food_id"?: string,"id"?: string,"meal_id"?: string,"notes"?: string | null,"quantity_g"?: number | null,"quantity_units"?: number | null,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "meal_items_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meal_items_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meal_items_meal_id_fkey"
      columns: ["meal_id"]
isOneToOne: false
      referencedRelation: "meals"
      referencedColumns: ["id"]
    }
                  ]
                },"meal_plan_days": {
                  Row: {
                    "client_id": string | null,"day_index": number,"id": string,"meal_plan_id": string,"notes": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id"?: string | null,"day_index": number,"id"?: string,"meal_plan_id": string,"notes"?: string | null
                  }
                  Update: {
                    "client_id"?: string | null,"day_index"?: number,"id"?: string,"meal_plan_id"?: string,"notes"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "meal_plan_days_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meal_plan_days_meal_plan_id_fkey"
      columns: ["meal_plan_id"]
isOneToOne: false
      referencedRelation: "meal_plans"
      referencedColumns: ["id"]
    }
                  ]
                },"meal_plans": {
                  Row: {
                    "client_id": string | null,"created_at": string,"id": string,"notes": string | null,"status": string,"template_id": string | null,"updated_at": string,"week_start": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id"?: string | null,"created_at"?: string,"id"?: string,"notes"?: string | null,"status"?: string,"template_id"?: string | null,"updated_at"?: string,"week_start"?: string | null
                  }
                  Update: {
                    "client_id"?: string | null,"created_at"?: string,"id"?: string,"notes"?: string | null,"status"?: string,"template_id"?: string | null,"updated_at"?: string,"week_start"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "meal_plans_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meal_plans_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "meal_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"meal_templates": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"id": string,"kcal_target": number | null,"name": string,"tags": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"kcal_target"?: number | null,"name": string,"tags"?: (string)[]
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"kcal_target"?: number | null,"name"?: string,"tags"?: (string)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "meal_templates_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"meals": {
                  Row: {
                    "client_id": string | null,"day_id": string,"id": string,"notes": string | null,"slot": string,"sort_order": number,"title": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id"?: string | null,"day_id": string,"id"?: string,"notes"?: string | null,"slot": string,"sort_order"?: number,"title"?: string | null
                  }
                  Update: {
                    "client_id"?: string | null,"day_id"?: string,"id"?: string,"notes"?: string | null,"slot"?: string,"sort_order"?: number,"title"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "meals_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meals_day_id_fkey"
      columns: ["day_id"]
isOneToOne: false
      referencedRelation: "meal_plan_days"
      referencedColumns: ["id"]
    }
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
                },"messages": {
                  Row: {
                    "attachment_path": string | null,"attachment_type": string | null,"body": string | null,"client_id": string,"conversation_id": string,"created_at": string,"deleted_at": string | null,"id": string,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attachment_path"?: string | null,"attachment_type"?: string | null,"body"?: string | null,"client_id": string,"conversation_id": string,"created_at"?: string,"deleted_at"?: string | null,"id"?: string,"sender_id": string
                  }
                  Update: {
                    "attachment_path"?: string | null,"attachment_type"?: string | null,"body"?: string | null,"client_id"?: string,"conversation_id"?: string,"created_at"?: string,"deleted_at"?: string | null,"id"?: string,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"metric_definitions": {
                  Row: {
                    "created_at": string,"higher_is_better": boolean | null,"id": string,"is_active": boolean,"is_system": boolean,"key": string,"name": string,"sort_order": number,"suggested_frequency": string,"type": string,"unit": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"higher_is_better"?: boolean | null,"id"?: string,"is_active"?: boolean,"is_system"?: boolean,"key": string,"name": string,"sort_order"?: number,"suggested_frequency"?: string,"type": string,"unit"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"higher_is_better"?: boolean | null,"id"?: string,"is_active"?: boolean,"is_system"?: boolean,"key"?: string,"name"?: string,"sort_order"?: number,"suggested_frequency"?: string,"type"?: string,"unit"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"metric_entries": {
                  Row: {
                    "checkin_id": string | null,"client_id": string,"created_at": string,"id": string,"metric_id": string,"recorded_on": string,"source": string,"value_num": number | null,"value_text": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "checkin_id"?: string | null,"client_id": string,"created_at"?: string,"id"?: string,"metric_id": string,"recorded_on": string,"source"?: string,"value_num"?: number | null,"value_text"?: string | null
                  }
                  Update: {
                    "checkin_id"?: string | null,"client_id"?: string,"created_at"?: string,"id"?: string,"metric_id"?: string,"recorded_on"?: string,"source"?: string,"value_num"?: number | null,"value_text"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "metric_entries_checkin_id_fkey"
      columns: ["checkin_id"]
isOneToOne: false
      referencedRelation: "checkins"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "metric_entries_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "metric_entries_metric_id_fkey"
      columns: ["metric_id"]
isOneToOne: false
      referencedRelation: "metric_definitions"
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
                },"personal_records": {
                  Row: {
                    "achieved_at": string,"client_id": string,"exercise_id": string | null,"id": string,"record_key": string,"record_type": string,"set_log_id": string | null,"unit": string,"value": number,"workout_log_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "achieved_at"?: string,"client_id": string,"exercise_id"?: string | null,"id"?: string,"record_key"?: string,"record_type": string,"set_log_id"?: string | null,"unit": string,"value": number,"workout_log_id"?: string | null
                  }
                  Update: {
                    "achieved_at"?: string,"client_id"?: string,"exercise_id"?: string | null,"id"?: string,"record_key"?: string,"record_type"?: string,"set_log_id"?: string | null,"unit"?: string,"value"?: number,"workout_log_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "personal_records_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "personal_records_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "personal_records_set_log_id_fkey"
      columns: ["set_log_id"]
isOneToOne: false
      referencedRelation: "set_logs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "personal_records_workout_log_id_fkey"
      columns: ["workout_log_id"]
isOneToOne: false
      referencedRelation: "workout_logs"
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
                },"progress_photos": {
                  Row: {
                    "checkin_id": string | null,"client_id": string,"created_at": string,"id": string,"pose": string,"storage_path": string,"taken_on": string
                  }
                  ComputedFields: never
                  Insert: {
                    "checkin_id"?: string | null,"client_id": string,"created_at"?: string,"id"?: string,"pose"?: string,"storage_path": string,"taken_on": string
                  }
                  Update: {
                    "checkin_id"?: string | null,"client_id"?: string,"created_at"?: string,"id"?: string,"pose"?: string,"storage_path"?: string,"taken_on"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "progress_photos_checkin_id_fkey"
      columns: ["checkin_id"]
isOneToOne: false
      referencedRelation: "checkins"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "progress_photos_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
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
      foreignKeyName: "session_credits_appointment_fk"
      columns: ["appointment_id"]
isOneToOne: false
      referencedRelation: "appointments"
      referencedColumns: ["id"]
    },{
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
                },"session_items": {
                  Row: {
                    "client_id": string | null,"exercise_id": string | null,"id": string,"name": string | null,"notes": string | null,"part_id": string,"prescription": NonNullable<Json>,"sort_order": number,"superset_group": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id"?: string | null,"exercise_id"?: string | null,"id"?: string,"name"?: string | null,"notes"?: string | null,"part_id": string,"prescription"?: NonNullable<Json>,"sort_order"?: number,"superset_group"?: string | null
                  }
                  Update: {
                    "client_id"?: string | null,"exercise_id"?: string | null,"id"?: string,"name"?: string | null,"notes"?: string | null,"part_id"?: string,"prescription"?: NonNullable<Json>,"sort_order"?: number,"superset_group"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "session_items_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_items_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_items_part_id_fkey"
      columns: ["part_id"]
isOneToOne: false
      referencedRelation: "session_parts"
      referencedColumns: ["id"]
    }
                  ]
                },"session_parts": {
                  Row: {
                    "client_id": string | null,"format": string,"id": string,"modality": string,"notes": string | null,"params": NonNullable<Json>,"session_id": string,"sort_order": number,"title": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id"?: string | null,"format"?: string,"id"?: string,"modality": string,"notes"?: string | null,"params"?: NonNullable<Json>,"session_id": string,"sort_order"?: number,"title"?: string | null
                  }
                  Update: {
                    "client_id"?: string | null,"format"?: string,"id"?: string,"modality"?: string,"notes"?: string | null,"params"?: NonNullable<Json>,"session_id"?: string,"sort_order"?: number,"title"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "session_parts_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_parts_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "workout_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"set_logs": {
                  Row: {
                    "client_id": string,"created_at": string,"distance_m": number | null,"duration_s": number | null,"exercise_id": string | null,"hr_avg": number | null,"id": string,"load_kg": number | null,"notes": string | null,"pace_s_per_km": number | null,"reps": number | null,"rpe": number | null,"session_item_id": string | null,"set_index": number,"station_key": string | null,"workout_log_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"created_at"?: string,"distance_m"?: number | null,"duration_s"?: number | null,"exercise_id"?: string | null,"hr_avg"?: number | null,"id": string,"load_kg"?: number | null,"notes"?: string | null,"pace_s_per_km"?: number | null,"reps"?: number | null,"rpe"?: number | null,"session_item_id"?: string | null,"set_index"?: number,"station_key"?: string | null,"workout_log_id": string
                  }
                  Update: {
                    "client_id"?: string,"created_at"?: string,"distance_m"?: number | null,"duration_s"?: number | null,"exercise_id"?: string | null,"hr_avg"?: number | null,"id"?: string,"load_kg"?: number | null,"notes"?: string | null,"pace_s_per_km"?: number | null,"reps"?: number | null,"rpe"?: number | null,"session_item_id"?: string | null,"set_index"?: number,"station_key"?: string | null,"workout_log_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "set_logs_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "set_logs_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "set_logs_session_item_id_fkey"
      columns: ["session_item_id"]
isOneToOne: false
      referencedRelation: "session_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "set_logs_station_key_fkey"
      columns: ["station_key"]
isOneToOne: false
      referencedRelation: "hyrox_stations"
      referencedColumns: ["key"]
    },{
      foreignKeyName: "set_logs_workout_log_id_fkey"
      columns: ["workout_log_id"]
isOneToOne: false
      referencedRelation: "workout_logs"
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
                },"shopping_list_items": {
                  Row: {
                    "checked": boolean,"client_id": string,"estimated_cents": number | null,"food_id": string | null,"id": string,"list_id": string,"name": string,"packs": number | null,"quantity_g": number | null,"section": string,"units": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "checked"?: boolean,"client_id": string,"estimated_cents"?: number | null,"food_id"?: string | null,"id"?: string,"list_id": string,"name": string,"packs"?: number | null,"quantity_g"?: number | null,"section": string,"units"?: number | null
                  }
                  Update: {
                    "checked"?: boolean,"client_id"?: string,"estimated_cents"?: number | null,"food_id"?: string | null,"id"?: string,"list_id"?: string,"name"?: string,"packs"?: number | null,"quantity_g"?: number | null,"section"?: string,"units"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "shopping_list_items_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shopping_list_items_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shopping_list_items_list_id_fkey"
      columns: ["list_id"]
isOneToOne: false
      referencedRelation: "shopping_lists"
      referencedColumns: ["id"]
    }
                  ]
                },"shopping_lists": {
                  Row: {
                    "client_id": string,"generated_at": string,"id": string,"meal_plan_id": string,"persons": number
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"generated_at"?: string,"id"?: string,"meal_plan_id": string,"persons"?: number
                  }
                  Update: {
                    "client_id"?: string,"generated_at"?: string,"id"?: string,"meal_plan_id"?: string,"persons"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "shopping_lists_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shopping_lists_meal_plan_id_fkey"
      columns: ["meal_plan_id"]
isOneToOne: true
      referencedRelation: "meal_plans"
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
                    "amount_cents": number,"anchor_day": number | null,"billing_interval": string,"billing_mode": string,"cancel_at_period_end": boolean,"checkout_session_id": string | null,"client_id": string,"created_at": string,"current_period_end": string | null,"current_period_start": string | null,"discount_breakdown": NonNullable<Json>,"ended_at": string | null,"grace_until": string | null,"id": string,"list_price_cents": number,"paused_until": string | null,"pending_discount_ids": (string)[],"plan_id": string,"started_at": string | null,"status": string,"stripe_price_id": string | null,"stripe_subscription_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"anchor_day"?: number | null,"billing_interval"?: string,"billing_mode": string,"cancel_at_period_end"?: boolean,"checkout_session_id"?: string | null,"client_id": string,"created_at"?: string,"current_period_end"?: string | null,"current_period_start"?: string | null,"discount_breakdown"?: NonNullable<Json>,"ended_at"?: string | null,"grace_until"?: string | null,"id"?: string,"list_price_cents": number,"paused_until"?: string | null,"pending_discount_ids"?: (string)[],"plan_id": string,"started_at"?: string | null,"status"?: string,"stripe_price_id"?: string | null,"stripe_subscription_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"anchor_day"?: number | null,"billing_interval"?: string,"billing_mode"?: string,"cancel_at_period_end"?: boolean,"checkout_session_id"?: string | null,"client_id"?: string,"created_at"?: string,"current_period_end"?: string | null,"current_period_start"?: string | null,"discount_breakdown"?: NonNullable<Json>,"ended_at"?: string | null,"grace_until"?: string | null,"id"?: string,"list_price_cents"?: number,"paused_until"?: string | null,"pending_discount_ids"?: (string)[],"plan_id"?: string,"started_at"?: string | null,"status"?: string,"stripe_price_id"?: string | null,"stripe_subscription_id"?: string | null,"updated_at"?: string
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
                },"waitlist_hyrox": {
                  Row: {
                    "consent_at": string | null,"consent_version": string | null,"created_at": string,"cuando": string | null,"email": string | null,"event_id": string | null,"id": string,"ip_hash": string | null,"nivel": string | null,"notes": string | null,"session_id": string,"source": string,"status": string,"ubicacion": string | null,"unsubscribe_token": string,"updated_at": string,"utm": NonNullable<Json>,"utm_source": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "consent_at"?: string | null,"consent_version"?: string | null,"created_at"?: string,"cuando"?: string | null,"email"?: string | null,"event_id"?: string | null,"id"?: string,"ip_hash"?: string | null,"nivel"?: string | null,"notes"?: string | null,"session_id": string,"source"?: string,"status"?: string,"ubicacion"?: string | null,"unsubscribe_token"?: string,"updated_at"?: string,"utm"?: NonNullable<Json>,"utm_source"?: never
                  }
                  Update: {
                    "consent_at"?: string | null,"consent_version"?: string | null,"created_at"?: string,"cuando"?: string | null,"email"?: string | null,"event_id"?: string | null,"id"?: string,"ip_hash"?: string | null,"nivel"?: string | null,"notes"?: string | null,"session_id"?: string,"source"?: string,"status"?: string,"ubicacion"?: string | null,"unsubscribe_token"?: string,"updated_at"?: string,"utm"?: NonNullable<Json>,"utm_source"?: never
                  }
                  Relationships: [
                    {
      foreignKeyName: "waitlist_hyrox_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "hyrox_events"
      referencedColumns: ["id"]
    }
                  ]
                },"workout_blocks": {
                  Row: {
                    "client_id": string | null,"created_at": string,"goal": string | null,"id": string,"name": string,"notes": string | null,"sort_order": number,"starts_on": string | null,"status": string,"template_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id"?: string | null,"created_at"?: string,"goal"?: string | null,"id"?: string,"name": string,"notes"?: string | null,"sort_order"?: number,"starts_on"?: string | null,"status"?: string,"template_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "client_id"?: string | null,"created_at"?: string,"goal"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"sort_order"?: number,"starts_on"?: string | null,"status"?: string,"template_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_blocks_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workout_blocks_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "workout_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"workout_logs": {
                  Row: {
                    "client_id": string,"coach_notified_at": string | null,"comment": string | null,"completed_at": string | null,"created_at": string,"feeling": number | null,"id": string,"session_id": string | null,"session_rpe": number | null,"started_at": string,"title": string | null,"total_time_s": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"coach_notified_at"?: string | null,"comment"?: string | null,"completed_at"?: string | null,"created_at"?: string,"feeling"?: number | null,"id": string,"session_id"?: string | null,"session_rpe"?: number | null,"started_at"?: string,"title"?: string | null,"total_time_s"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "client_id"?: string,"coach_notified_at"?: string | null,"comment"?: string | null,"completed_at"?: string | null,"created_at"?: string,"feeling"?: number | null,"id"?: string,"session_id"?: string | null,"session_rpe"?: number | null,"started_at"?: string,"title"?: string | null,"total_time_s"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_logs_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workout_logs_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "workout_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"workout_sessions": {
                  Row: {
                    "client_id": string | null,"created_at": string,"day_index": number | null,"id": string,"notes": string | null,"published": boolean,"sort_order": number,"title": string,"updated_at": string,"week_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id"?: string | null,"created_at"?: string,"day_index"?: number | null,"id"?: string,"notes"?: string | null,"published"?: boolean,"sort_order"?: number,"title": string,"updated_at"?: string,"week_id": string
                  }
                  Update: {
                    "client_id"?: string | null,"created_at"?: string,"day_index"?: number | null,"id"?: string,"notes"?: string | null,"published"?: boolean,"sort_order"?: number,"title"?: string,"updated_at"?: string,"week_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_sessions_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workout_sessions_week_id_fkey"
      columns: ["week_id"]
isOneToOne: false
      referencedRelation: "workout_weeks"
      referencedColumns: ["id"]
    }
                  ]
                },"workout_templates": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"id": string,"modalities": (string)[],"name": string,"tags": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"modalities"?: (string)[],"name": string,"tags"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"modalities"?: (string)[],"name"?: string,"tags"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_templates_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"workout_weeks": {
                  Row: {
                    "block_id": string,"client_id": string | null,"id": string,"is_deload": boolean,"notes": string | null,"week_index": number
                  }
                  ComputedFields: never
                  Insert: {
                    "block_id": string,"client_id"?: string | null,"id"?: string,"is_deload"?: boolean,"notes"?: string | null,"week_index": number
                  }
                  Update: {
                    "block_id"?: string,"client_id"?: string | null,"id"?: string,"is_deload"?: boolean,"notes"?: string | null,"week_index"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_weeks_block_id_fkey"
      columns: ["block_id"]
isOneToOne: false
      referencedRelation: "workout_blocks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workout_weeks_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
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
            "book_appointment":
{ Args: { "p_client_id"?: string,"p_notes"?: string,"p_starts_at": string,"p_type": string,"p_use_credit"?: boolean }; Returns: string
                           },
"busy_ranges":
{ Args: { "p_from": string,"p_to": string }; Returns: {
              "ends_at": string,"starts_at": string
            }[]
                           },
"cancel_appointment":
{ Args: { "p_id": string,"p_reason"?: string }; Returns: boolean
                           },
"challenge_leaderboard":
{ Args: { "p_challenge": string }; Returns: {
              "completed": boolean,"first_name": string,"is_me": boolean,"progress": number
            }[]
                           },
"chat_unread_count":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"client_credit_balance":
{ Args: { "p_client_id": string,"p_type": string }; Returns: number
                           },
"client_has_access":
{ Args: { "p_client_id": string }; Returns: boolean
                           },
"copy_block":
{ Args: { "p_block": string,"p_client": string,"p_name"?: string,"p_starts_on": string,"p_template": string }; Returns: string
                           },
"copy_meal_plan":
{ Args: { "p_client": string,"p_plan": string,"p_template": string,"p_week_start": string }; Returns: string
                           },
"copy_week":
{ Args: { "p_as_deload"?: boolean,"p_week": string }; Returns: string
                           },
"current_role_name":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"expire_discount_reservations":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"feature_for_client":
{ Args: { "p_client_id": string,"p_feature": string }; Returns: {
              "enabled": boolean,"limit_value": number
            }[]
                           },
"founder_slots_left":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"get_or_create_conversation":
{ Args: { "p_client_id": string }; Returns: string
                           },
"google_disconnect":
{ Args: { "p_profile": string }; Returns: undefined
                           },
"google_get_token":
{ Args: { "p_profile": string }; Returns: string
                           },
"google_store_token":
{ Args: { "p_email": string,"p_profile": string,"p_token": string }; Returns: undefined
                           },
"has_feature":
{ Args: { "p_client_id": string,"p_feature": string }; Returns: boolean
                           },
"has_scope":
{ Args: { "p_scope": string }; Returns: boolean
                           },
"hyrox_allowed_origins":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"hyrox_capture":
{ Args: { "p_consent"?: boolean,"p_cuando"?: string,"p_email"?: string,"p_ip_hash"?: string,"p_nivel"?: string,"p_session": string,"p_source"?: string,"p_ub"?: string,"p_utm"?: Json }; Returns: boolean
                           },
"hyrox_track":
{ Args: { "p_event": string,"p_referrer"?: string,"p_session"?: string,"p_ub"?: string,"p_utm_source"?: string }; Returns: undefined
                           },
"hyrox_unsubscribe":
{ Args: { "p_token": string }; Returns: boolean
                           },
"is_owner":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"join_challenge":
{ Args: { "p_challenge": string }; Returns: undefined
                           },
"leave_challenge":
{ Args: { "p_challenge": string }; Returns: undefined
                           },
"log_access":
{ Args: { "p_client_id": string,"p_entity": string,"p_entity_id": string,"p_metadata"?: Json }; Returns: undefined
                           },
"mark_conversation_read":
{ Args: { "p_conversation": string }; Returns: undefined
                           },
"my_client_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"my_squad_overview":
{ Args: Record<PropertyKey, never>; Returns: {
              "first_name": string,"is_me": boolean,"joined_at": string,"training_weeks": number,"week_done": number,"week_planned": number
            }[]
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
"reschedule_appointment":
{ Args: { "p_id": string,"p_starts_at": string }; Returns: undefined
                           },
"reserve_founder_slot":
{ Args: { "p_client_id": string,"p_minutes"?: number,"p_subscription_id": string }; Returns: string
                           },
"slot_is_open":
{ Args: { "p_end": string,"p_start": string,"p_type": string }; Returns: boolean
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
