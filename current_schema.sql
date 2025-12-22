--
-- PostgreSQL database dump
--

\restrict lALDnUeyk3Ruiw0PMbbpeaFfVMBNLfMUJ6vs6VuxP0oGxfwRrb49txCQDFFn9tY

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: call_status; Type: TYPE; Schema: public; Owner: messenger
--

CREATE TYPE public.call_status AS ENUM (
    'initiated',
    'calling',
    'ringing',
    'connected',
    'ended',
    'missed',
    'cancelled'
);


ALTER TYPE public.call_status OWNER TO messenger;

--
-- Name: call_type; Type: TYPE; Schema: public; Owner: messenger
--

CREATE TYPE public.call_type AS ENUM (
    'video',
    'audio'
);


ALTER TYPE public.call_type OWNER TO messenger;

--
-- Name: enum_auditLogs_severity; Type: TYPE; Schema: public; Owner: messenger
--

CREATE TYPE public."enum_auditLogs_severity" AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


ALTER TYPE public."enum_auditLogs_severity" OWNER TO messenger;

--
-- Name: enum_auditLogs_status; Type: TYPE; Schema: public; Owner: messenger
--

CREATE TYPE public."enum_auditLogs_status" AS ENUM (
    'success',
    'failure',
    'pending'
);


ALTER TYPE public."enum_auditLogs_status" OWNER TO messenger;

--
-- Name: enum_audit_log_severity; Type: TYPE; Schema: public; Owner: messenger
--

CREATE TYPE public.enum_audit_log_severity AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


ALTER TYPE public.enum_audit_log_severity OWNER TO messenger;

--
-- Name: enum_audit_log_status; Type: TYPE; Schema: public; Owner: messenger
--

CREATE TYPE public.enum_audit_log_status AS ENUM (
    'success',
    'failure',
    'pending'
);


ALTER TYPE public.enum_audit_log_status OWNER TO messenger;

--
-- Name: enum_users_approval_status; Type: TYPE; Schema: public; Owner: messenger
--

CREATE TYPE public.enum_users_approval_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.enum_users_approval_status OWNER TO messenger;

--
-- Name: enum_users_role; Type: TYPE; Schema: public; Owner: messenger
--

CREATE TYPE public.enum_users_role AS ENUM (
    'user',
    'admin',
    'moderator'
);


ALTER TYPE public.enum_users_role OWNER TO messenger;

--
-- Name: enum_users_status; Type: TYPE; Schema: public; Owner: messenger
--

CREATE TYPE public.enum_users_status AS ENUM (
    'online',
    'offline',
    'away',
    'busy'
);


ALTER TYPE public.enum_users_status OWNER TO messenger;

--
-- Name: file_type_enum; Type: TYPE; Schema: public; Owner: messenger
--

CREATE TYPE public.file_type_enum AS ENUM (
    'image',
    'document',
    'video',
    'audio'
);


ALTER TYPE public.file_type_enum OWNER TO messenger;

--
-- Name: group_message_status_enum; Type: TYPE; Schema: public; Owner: messenger
--

CREATE TYPE public.group_message_status_enum AS ENUM (
    'sent',
    'delivered',
    'read'
);


ALTER TYPE public.group_message_status_enum OWNER TO messenger;

--
-- Name: message_delete_type; Type: TYPE; Schema: public; Owner: messenger
--

CREATE TYPE public.message_delete_type AS ENUM (
    'soft',
    'hard'
);


ALTER TYPE public.message_delete_type OWNER TO messenger;

--
-- Name: message_status; Type: TYPE; Schema: public; Owner: messenger
--

CREATE TYPE public.message_status AS ENUM (
    'sent',
    'delivered',
    'read',
    'failed'
);


ALTER TYPE public.message_status OWNER TO messenger;

--
-- Name: message_type; Type: TYPE; Schema: public; Owner: messenger
--

CREATE TYPE public.message_type AS ENUM (
    'text',
    'image',
    'file',
    'system'
);


ALTER TYPE public.message_type OWNER TO messenger;

--
-- Name: notification_category; Type: TYPE; Schema: public; Owner: messenger
--

CREATE TYPE public.notification_category AS ENUM (
    'general',
    'message',
    'group',
    'call',
    'system',
    'admin'
);


ALTER TYPE public.notification_category OWNER TO messenger;

--
-- Name: notification_priority; Type: TYPE; Schema: public; Owner: messenger
--

CREATE TYPE public.notification_priority AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);


ALTER TYPE public.notification_priority OWNER TO messenger;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: messenger
--

CREATE TYPE public.user_role AS ENUM (
    'user',
    'admin',
    'moderator'
);


ALTER TYPE public.user_role OWNER TO messenger;

--
-- Name: cleanup_expired_messages(); Type: FUNCTION; Schema: public; Owner: messenger
--

CREATE FUNCTION public.cleanup_expired_messages() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE messages
    SET is_deleted = true
    WHERE expires_at IS NOT NULL
    AND expires_at < CURRENT_TIMESTAMP
    AND is_deleted = false;
END;
$$;


ALTER FUNCTION public.cleanup_expired_messages() OWNER TO messenger;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: messenger
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO messenger;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: messenger
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    created_by uuid NOT NULL,
    priority character varying(20) DEFAULT 'normal'::character varying,
    is_active boolean DEFAULT true,
    starts_at timestamp without time zone,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    link character varying(500),
    CONSTRAINT announcements_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'urgent'::character varying])::text[])))
);


ALTER TABLE public.announcements OWNER TO messenger;

--
-- Name: COLUMN announcements.message; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.announcements.message IS 'Announcement message content';


--
-- Name: COLUMN announcements.link; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.announcements.link IS 'Optional link for more information';


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: messenger
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    resource character varying(100),
    resource_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.audit_log OWNER TO messenger;

--
-- Name: calls; Type: TABLE; Schema: public; Owner: messenger
--

CREATE TABLE public.calls (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    caller_id uuid NOT NULL,
    recipient_id uuid,
    group_id uuid,
    call_type public.call_type NOT NULL,
    status public.call_status DEFAULT 'initiated'::public.call_status,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    duration_seconds integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT calls_recipient_or_group CHECK ((((recipient_id IS NOT NULL) AND (group_id IS NULL)) OR ((recipient_id IS NULL) AND (group_id IS NOT NULL))))
);


ALTER TABLE public.calls OWNER TO messenger;

--
-- Name: contacts; Type: TABLE; Schema: public; Owner: messenger
--

CREATE TABLE public.contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    contact_user_id uuid NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    blocked_at timestamp with time zone,
    nickname character varying(100),
    notes text,
    is_favorite boolean DEFAULT false,
    is_muted boolean DEFAULT false,
    last_contact_at timestamp with time zone,
    CONSTRAINT contacts_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'blocked'::character varying])::text[])))
);


ALTER TABLE public.contacts OWNER TO messenger;

--
-- Name: COLUMN contacts.contact_user_id; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.contacts.contact_user_id IS 'ID of the user being added as contact';


--
-- Name: COLUMN contacts.is_favorite; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.contacts.is_favorite IS 'Whether contact is marked as favorite';


--
-- Name: COLUMN contacts.is_muted; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.contacts.is_muted IS 'Whether notifications from this contact are muted';


--
-- Name: device_tokens; Type: TABLE; Schema: public; Owner: messenger
--

CREATE TABLE public.device_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token character varying(500) NOT NULL,
    device_type character varying(20),
    device_info jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone,
    device_name character varying(255),
    user_agent text,
    last_used_at timestamp without time zone,
    CONSTRAINT device_tokens_device_type_check CHECK (((device_type)::text = ANY ((ARRAY['ios'::character varying, 'android'::character varying, 'web'::character varying])::text[])))
);


ALTER TABLE public.device_tokens OWNER TO messenger;

--
-- Name: COLUMN device_tokens.device_name; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.device_tokens.device_name IS 'Device name or browser info';


--
-- Name: COLUMN device_tokens.user_agent; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.device_tokens.user_agent IS 'Full user agent string';


--
-- Name: COLUMN device_tokens.last_used_at; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.device_tokens.last_used_at IS 'Last time this token was used to send a notification';


--
-- Name: devices; Type: TABLE; Schema: public; Owner: messenger
--

CREATE TABLE public.devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    device_type character varying(20),
    device_name character varying(255),
    device_token character varying(500),
    is_active boolean DEFAULT true,
    last_seen_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT devices_device_type_check CHECK (((device_type)::text = ANY ((ARRAY['web'::character varying, 'ios'::character varying, 'android'::character varying])::text[])))
);


ALTER TABLE public.devices OWNER TO messenger;

--
-- Name: file_uploads; Type: TABLE; Schema: public; Owner: messenger
--

CREATE TABLE public.file_uploads (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    uploader_id uuid NOT NULL,
    filename character varying(255) NOT NULL,
    original_name character varying(255) NOT NULL,
    mime_type character varying(100) NOT NULL,
    file_size integer NOT NULL,
    file_path character varying(500) NOT NULL,
    virus_scan_status character varying(50) DEFAULT 'pending'::character varying,
    virus_scan_result jsonb,
    is_quarantined boolean DEFAULT false,
    uploaded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    message_id uuid,
    file_type public.file_type_enum,
    is_image boolean DEFAULT false,
    width integer,
    height integer,
    thumbnail_path character varying(500),
    download_count integer DEFAULT 0,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.file_uploads OWNER TO messenger;

--
-- Name: COLUMN file_uploads.message_id; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.file_uploads.message_id IS 'Message this file belongs to';


--
-- Name: COLUMN file_uploads.file_type; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.file_uploads.file_type IS 'Type of file for categorization';


--
-- Name: group_members; Type: TABLE; Schema: public; Owner: messenger
--

CREATE TABLE public.group_members (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.user_role DEFAULT 'user'::public.user_role,
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    left_at timestamp with time zone,
    is_active boolean DEFAULT true,
    invited_by uuid,
    permissions jsonb DEFAULT '{"canEditGroup": false, "canSendMessages": true, "canInviteMembers": false, "canRemoveMembers": false, "canDeleteMessages": false}'::jsonb,
    last_seen_at timestamp with time zone,
    is_muted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


ALTER TABLE public.group_members OWNER TO messenger;

--
-- Name: COLUMN group_members.is_active; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.group_members.is_active IS 'Whether member is currently active in group';


--
-- Name: COLUMN group_members.permissions; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.group_members.permissions IS 'Member permissions: canSendMessages, canInviteMembers, canRemoveMembers, canEditGroup, canDeleteMessages';


--
-- Name: group_message_status; Type: TABLE; Schema: public; Owner: messenger
--

CREATE TABLE public.group_message_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    is_read boolean DEFAULT false,
    read_at timestamp without time zone,
    is_delivered boolean DEFAULT false,
    delivered_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status public.group_message_status_enum DEFAULT 'sent'::public.group_message_status_enum
);


ALTER TABLE public.group_message_status OWNER TO messenger;

--
-- Name: COLUMN group_message_status.status; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.group_message_status.status IS 'Message status: sent, delivered, or read';


--
-- Name: groups; Type: TABLE; Schema: public; Owner: messenger
--

CREATE TABLE public.groups (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    avatar character varying(500),
    creator_id uuid NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    max_members integer DEFAULT 20,
    group_type character varying(20) DEFAULT 'private'::character varying,
    last_message_at timestamp with time zone,
    settings jsonb DEFAULT '{"allowFileSharing": true, "messageRetention": 30, "allowMemberInvite": true}'::jsonb,
    encryption_key text,
    deleted_at timestamp with time zone
);


ALTER TABLE public.groups OWNER TO messenger;

--
-- Name: COLUMN groups.settings; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.groups.settings IS 'Group settings: allowMemberInvite, allowFileSharing, messageRetention';


--
-- Name: COLUMN groups.encryption_key; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.groups.encryption_key IS 'Base64-encoded AES-256 encryption key for group messages';


--
-- Name: messages; Type: TABLE; Schema: public; Owner: messenger
--

CREATE TABLE public.messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    sender_id uuid NOT NULL,
    recipient_id uuid,
    group_id uuid,
    content text,
    message_type public.message_type DEFAULT 'text'::public.message_type,
    file_url character varying(500),
    file_name character varying(255),
    file_size integer,
    mime_type character varying(100),
    encryption_key character varying(255),
    is_deleted boolean DEFAULT false,
    edited_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone,
    encrypted_content text,
    encryption_metadata jsonb DEFAULT '{}'::jsonb,
    is_encrypted boolean DEFAULT false,
    encryption_algorithm character varying(50),
    status public.message_status DEFAULT 'sent'::public.message_status,
    delete_type public.message_delete_type,
    deleted_at timestamp with time zone,
    reply_to_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    reactions jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT messages_recipient_or_group CHECK ((((recipient_id IS NOT NULL) AND (group_id IS NULL)) OR ((recipient_id IS NULL) AND (group_id IS NOT NULL))))
);


ALTER TABLE public.messages OWNER TO messenger;

--
-- Name: COLUMN messages.encrypted_content; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.messages.encrypted_content IS 'E2E encrypted message content';


--
-- Name: COLUMN messages.is_encrypted; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.messages.is_encrypted IS 'Whether this message is end-to-end encrypted';


--
-- Name: COLUMN messages.status; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.messages.status IS 'Message delivery status';


--
-- Name: COLUMN messages.delete_type; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.messages.delete_type IS 'soft = deleted for sender only, hard = deleted for everyone';


--
-- Name: COLUMN messages.reactions; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.messages.reactions IS 'Message reactions: { "≡ƒæì": ["userId1"], "Γ¥ñ∩╕Å": ["userId2"] }';


--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: messenger
--

CREATE TABLE public.notification_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    message_notifications boolean DEFAULT true,
    group_notifications boolean DEFAULT true,
    call_notifications boolean DEFAULT true,
    email_enabled boolean DEFAULT true,
    push_enabled boolean DEFAULT true,
    sound_enabled boolean DEFAULT true,
    vibration_enabled boolean DEFAULT true,
    show_preview boolean DEFAULT true,
    muted_until timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    in_app_enabled boolean DEFAULT true,
    quiet_hours_start time without time zone,
    quiet_hours_end time without time zone,
    do_not_disturb boolean DEFAULT false,
    mention_notifications boolean DEFAULT true,
    admin_notifications boolean DEFAULT true,
    system_notifications boolean DEFAULT true
);


ALTER TABLE public.notification_settings OWNER TO messenger;

--
-- Name: COLUMN notification_settings.in_app_enabled; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.notification_settings.in_app_enabled IS 'Whether in-app notifications are enabled';


--
-- Name: COLUMN notification_settings.quiet_hours_start; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.notification_settings.quiet_hours_start IS 'Start time for quiet hours (HH:MM format)';


--
-- Name: COLUMN notification_settings.quiet_hours_end; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.notification_settings.quiet_hours_end IS 'End time for quiet hours (HH:MM format)';


--
-- Name: COLUMN notification_settings.do_not_disturb; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.notification_settings.do_not_disturb IS 'Global do not disturb mode';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: messenger
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255),
    content text NOT NULL,
    data jsonb,
    read boolean DEFAULT false,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone,
    priority public.notification_priority DEFAULT 'normal'::public.notification_priority,
    category public.notification_category DEFAULT 'general'::public.notification_category,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


ALTER TABLE public.notifications OWNER TO messenger;

--
-- Name: COLUMN notifications.priority; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.notifications.priority IS 'Priority level: low, normal, high, urgent';


--
-- Name: COLUMN notifications.category; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.notifications.category IS 'Category: general, message, group, call, system, admin';


--
-- Name: password_history; Type: TABLE; Schema: public; Owner: messenger
--

CREATE TABLE public.password_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.password_history OWNER TO messenger;

--
-- Name: reports; Type: TABLE; Schema: public; Owner: messenger
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_id uuid NOT NULL,
    reported_user_id uuid,
    reported_message_id uuid,
    report_type character varying(50) NOT NULL,
    reason text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    resolution text,
    reviewed_by uuid,
    reviewed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reported_file_id uuid,
    description text,
    evidence jsonb DEFAULT '{}'::jsonb,
    action_taken character varying(50),
    CONSTRAINT reports_reason_check CHECK ((reason = ANY (ARRAY['harassment'::text, 'spam'::text, 'inappropriate_content'::text, 'hate_speech'::text, 'violence'::text, 'impersonation'::text, 'malware'::text, 'other'::text]))),
    CONSTRAINT reports_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'investigating'::character varying, 'resolved'::character varying, 'dismissed'::character varying])::text[])))
);


ALTER TABLE public.reports OWNER TO messenger;

--
-- Name: COLUMN reports.description; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.reports.description IS 'Detailed description of the issue';


--
-- Name: COLUMN reports.evidence; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.reports.evidence IS 'Evidence attached to report (screenshots, links, etc.)';


--
-- Name: COLUMN reports.action_taken; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.reports.action_taken IS 'Action taken: no_action, warning_issued, content_removed, user_suspended, user_banned, other';


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: messenger
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value text,
    data_type character varying(20) DEFAULT 'string'::character varying,
    description text,
    is_public boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT system_settings_data_type_check CHECK (((data_type)::text = ANY ((ARRAY['string'::character varying, 'number'::character varying, 'boolean'::character varying, 'json'::character varying])::text[])))
);


ALTER TABLE public.system_settings OWNER TO messenger;

--
-- Name: TABLE system_settings; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON TABLE public.system_settings IS 'System-wide configuration settings';


--
-- Name: COLUMN system_settings.setting_key; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.system_settings.setting_key IS 'Unique key for the setting';


--
-- Name: COLUMN system_settings.is_public; Type: COMMENT; Schema: public; Owner: messenger
--

COMMENT ON COLUMN public.system_settings.is_public IS 'Whether this setting is publicly visible';


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: messenger
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    refresh_token character varying(500) NOT NULL,
    device_info jsonb,
    ip_address inet,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_sessions OWNER TO messenger;

--
-- Name: users; Type: TABLE; Schema: public; Owner: messenger
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    avatar character varying(500),
    bio text,
    phone character varying(20),
    status character varying(20) DEFAULT 'offline'::character varying,
    role public.user_role DEFAULT 'user'::public.user_role,
    approval_status character varying(20) DEFAULT 'approved'::character varying,
    approved_by uuid,
    approved_at timestamp with time zone,
    rejection_reason text,
    email_verified boolean DEFAULT false,
    email_verification_token character varying(255),
    password_reset_token character varying(255),
    password_reset_expires timestamp with time zone,
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    last_login_at timestamp with time zone,
    public_key text,
    read_receipts_enabled boolean DEFAULT true,
    terms_accepted_at timestamp with time zone,
    privacy_accepted_at timestamp with time zone,
    terms_version character varying(20) DEFAULT '1.0'::character varying,
    privacy_version character varying(20) DEFAULT '1.0'::character varying,
    two_factor_secret character varying(255),
    two_factor_enabled boolean DEFAULT false,
    two_factor_backup_codes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    CONSTRAINT proper_email_format CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))
);


ALTER TABLE public.users OWNER TO messenger;

--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: calls calls_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_user_id_contact_id_key; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_user_id_contact_id_key UNIQUE (user_id, contact_user_id);


--
-- Name: device_tokens device_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_pkey PRIMARY KEY (id);


--
-- Name: device_tokens device_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_token_key UNIQUE (token);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: file_uploads file_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.file_uploads
    ADD CONSTRAINT file_uploads_pkey PRIMARY KEY (id);


--
-- Name: group_members group_members_group_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_user_id_key UNIQUE (group_id, user_id);


--
-- Name: group_members group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_pkey PRIMARY KEY (id);


--
-- Name: group_message_status group_message_status_message_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.group_message_status
    ADD CONSTRAINT group_message_status_message_id_user_id_key UNIQUE (message_id, user_id);


--
-- Name: group_message_status group_message_status_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.group_message_status
    ADD CONSTRAINT group_message_status_pkey PRIMARY KEY (id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_key UNIQUE (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: password_history password_history_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.password_history
    ADD CONSTRAINT password_history_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_refresh_token_key; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_refresh_token_key UNIQUE (refresh_token);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_email_verification_token_key; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_verification_token_key UNIQUE (email_verification_token);


--
-- Name: users users_password_reset_token_key; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_password_reset_token_key UNIQUE (password_reset_token);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: audit_log_action; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX audit_log_action ON public.audit_log USING btree (action);


--
-- Name: audit_log_created_at; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX audit_log_created_at ON public.audit_log USING btree (created_at);


--
-- Name: audit_log_resource; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX audit_log_resource ON public.audit_log USING btree (resource);


--
-- Name: audit_log_user_id; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX audit_log_user_id ON public.audit_log USING btree (user_id);


--
-- Name: idx_announcements_author_id; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_announcements_author_id ON public.announcements USING btree (created_by);


--
-- Name: idx_announcements_created_at; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_announcements_created_at ON public.announcements USING btree (created_at DESC);


--
-- Name: idx_announcements_created_by; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_announcements_created_by ON public.announcements USING btree (created_by);


--
-- Name: idx_announcements_is_active; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_announcements_is_active ON public.announcements USING btree (is_active);


--
-- Name: idx_announcements_link; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_announcements_link ON public.announcements USING btree (link);


--
-- Name: idx_announcements_priority; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_announcements_priority ON public.announcements USING btree (priority);


--
-- Name: idx_audit_log_action; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_audit_log_action ON public.audit_log USING btree (action);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at);


--
-- Name: idx_audit_log_resource; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_audit_log_resource ON public.audit_log USING btree (resource);


--
-- Name: idx_audit_log_user; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_audit_log_user ON public.audit_log USING btree (user_id);


--
-- Name: idx_calls_caller; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_calls_caller ON public.calls USING btree (caller_id);


--
-- Name: idx_calls_created_at; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_calls_created_at ON public.calls USING btree (created_at);


--
-- Name: idx_calls_deleted_at; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_calls_deleted_at ON public.calls USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: idx_calls_group; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_calls_group ON public.calls USING btree (group_id);


--
-- Name: idx_calls_recipient; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_calls_recipient ON public.calls USING btree (recipient_id);


--
-- Name: idx_calls_status; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_calls_status ON public.calls USING btree (status);


--
-- Name: idx_contacts_contact_id; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_contacts_contact_id ON public.contacts USING btree (contact_user_id);


--
-- Name: idx_contacts_contact_user; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_contacts_contact_user ON public.contacts USING btree (contact_user_id);


--
-- Name: idx_contacts_favorite; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_contacts_favorite ON public.contacts USING btree (is_favorite);


--
-- Name: idx_contacts_last_contact; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_contacts_last_contact ON public.contacts USING btree (last_contact_at);


--
-- Name: idx_contacts_status; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_contacts_status ON public.contacts USING btree (status);


--
-- Name: idx_contacts_user; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_contacts_user ON public.contacts USING btree (user_id);


--
-- Name: idx_contacts_user_id; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_contacts_user_id ON public.contacts USING btree (user_id);


--
-- Name: idx_device_tokens_device_name; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_device_tokens_device_name ON public.device_tokens USING btree (device_name);


--
-- Name: idx_device_tokens_is_active; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_device_tokens_is_active ON public.device_tokens USING btree (is_active);


--
-- Name: idx_device_tokens_last_used; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_device_tokens_last_used ON public.device_tokens USING btree (last_used_at);


--
-- Name: idx_device_tokens_token; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_device_tokens_token ON public.device_tokens USING btree (token);


--
-- Name: idx_device_tokens_user_id; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_device_tokens_user_id ON public.device_tokens USING btree (user_id);


--
-- Name: idx_devices_device_token; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_devices_device_token ON public.devices USING btree (device_token);


--
-- Name: idx_devices_user_id; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_devices_user_id ON public.devices USING btree (user_id);


--
-- Name: idx_file_uploads_expires_at; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_file_uploads_expires_at ON public.file_uploads USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_file_uploads_file_type; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_file_uploads_file_type ON public.file_uploads USING btree (file_type);


--
-- Name: idx_file_uploads_message_id; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_file_uploads_message_id ON public.file_uploads USING btree (message_id);


--
-- Name: idx_file_uploads_scan_status; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_file_uploads_scan_status ON public.file_uploads USING btree (virus_scan_status);


--
-- Name: idx_file_uploads_user; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_file_uploads_user ON public.file_uploads USING btree (uploader_id);


--
-- Name: idx_group_members_group; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_group_members_group ON public.group_members USING btree (group_id);


--
-- Name: idx_group_members_invited_by; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_group_members_invited_by ON public.group_members USING btree (invited_by);


--
-- Name: idx_group_members_is_active; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_group_members_is_active ON public.group_members USING btree (is_active);


--
-- Name: idx_group_members_user; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_group_members_user ON public.group_members USING btree (user_id);


--
-- Name: idx_group_message_status_is_read; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_group_message_status_is_read ON public.group_message_status USING btree (is_read);


--
-- Name: idx_group_message_status_message_id; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_group_message_status_message_id ON public.group_message_status USING btree (message_id);


--
-- Name: idx_group_message_status_read; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_group_message_status_read ON public.group_message_status USING btree (is_read);


--
-- Name: idx_group_message_status_status; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_group_message_status_status ON public.group_message_status USING btree (status);


--
-- Name: idx_group_message_status_user_id; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_group_message_status_user_id ON public.group_message_status USING btree (user_id);


--
-- Name: idx_group_message_status_user_message; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_group_message_status_user_message ON public.group_message_status USING btree (user_id, message_id);


--
-- Name: idx_groups_active; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_groups_active ON public.groups USING btree (is_active);


--
-- Name: idx_groups_created_by; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_groups_created_by ON public.groups USING btree (creator_id);


--
-- Name: idx_groups_creator; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_groups_creator ON public.groups USING btree (creator_id);


--
-- Name: idx_groups_group_type; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_groups_group_type ON public.groups USING btree (group_type);


--
-- Name: idx_groups_last_message; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_groups_last_message ON public.groups USING btree (last_message_at);


--
-- Name: idx_messages_cleanup; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_messages_cleanup ON public.messages USING btree (expires_at) WHERE ((expires_at IS NOT NULL) AND (is_deleted = false));


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at);


--
-- Name: idx_messages_deleted_at; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_messages_deleted_at ON public.messages USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: idx_messages_expires_at; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_messages_expires_at ON public.messages USING btree (expires_at);


--
-- Name: idx_messages_group; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_messages_group ON public.messages USING btree (group_id);


--
-- Name: idx_messages_is_encrypted; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_messages_is_encrypted ON public.messages USING btree (is_encrypted);


--
-- Name: idx_messages_recipient; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_messages_recipient ON public.messages USING btree (recipient_id);


--
-- Name: idx_messages_recipient_created; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_messages_recipient_created ON public.messages USING btree (recipient_id, created_at DESC) WHERE (recipient_id IS NOT NULL);


--
-- Name: idx_messages_reply_to_id; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_messages_reply_to_id ON public.messages USING btree (reply_to_id);


--
-- Name: idx_messages_sender; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id);


--
-- Name: idx_messages_sender_created; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_messages_sender_created ON public.messages USING btree (sender_id, created_at DESC);


--
-- Name: idx_messages_status; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_messages_status ON public.messages USING btree (status);


--
-- Name: idx_notification_settings_dnd; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_notification_settings_dnd ON public.notification_settings USING btree (do_not_disturb);


--
-- Name: idx_notification_settings_in_app; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_notification_settings_in_app ON public.notification_settings USING btree (in_app_enabled);


--
-- Name: idx_notification_settings_user_id; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_notification_settings_user_id ON public.notification_settings USING btree (user_id);


--
-- Name: idx_notifications_category; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_notifications_category ON public.notifications USING btree (category);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (read);


--
-- Name: idx_notifications_priority; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_notifications_priority ON public.notifications USING btree (priority);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_password_history_created_at; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_password_history_created_at ON public.password_history USING btree (created_at DESC);


--
-- Name: idx_password_history_user_id; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_password_history_user_id ON public.password_history USING btree (user_id);


--
-- Name: idx_reports_created_at; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_reports_created_at ON public.reports USING btree (created_at DESC);


--
-- Name: idx_reports_reported_file_id; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_reports_reported_file_id ON public.reports USING btree (reported_file_id);


--
-- Name: idx_reports_reported_user_id; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_reports_reported_user_id ON public.reports USING btree (reported_user_id);


--
-- Name: idx_reports_reporter_id; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_reports_reporter_id ON public.reports USING btree (reporter_id);


--
-- Name: idx_reports_reviewed_at; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_reports_reviewed_at ON public.reports USING btree (reviewed_at);


--
-- Name: idx_reports_status; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_reports_status ON public.reports USING btree (status);


--
-- Name: idx_system_settings_is_public; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_system_settings_is_public ON public.system_settings USING btree (is_public);


--
-- Name: idx_system_settings_key; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_system_settings_key ON public.system_settings USING btree (setting_key);


--
-- Name: idx_system_settings_public; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_system_settings_public ON public.system_settings USING btree (is_public);


--
-- Name: idx_user_sessions_expires_at; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions USING btree (expires_at);


--
-- Name: idx_user_sessions_refresh_token; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_user_sessions_refresh_token ON public.user_sessions USING btree (refresh_token);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: messenger
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: groups update_groups_updated_at; Type: TRIGGER; Schema: public; Owner: messenger
--

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: messenger
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: announcements announcements_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_author_id_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: calls calls_caller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_caller_id_fkey FOREIGN KEY (caller_id) REFERENCES public.users(id);


--
-- Name: calls calls_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: calls calls_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: contacts contacts_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_contact_id_fkey FOREIGN KEY (contact_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: contacts contacts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: device_tokens device_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: devices devices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: file_uploads file_uploads_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.file_uploads
    ADD CONSTRAINT file_uploads_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id);


--
-- Name: file_uploads file_uploads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.file_uploads
    ADD CONSTRAINT file_uploads_user_id_fkey FOREIGN KEY (uploader_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: group_members group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_members group_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);


--
-- Name: group_members group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: group_message_status group_message_status_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.group_message_status
    ADD CONSTRAINT group_message_status_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: group_message_status group_message_status_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.group_message_status
    ADD CONSTRAINT group_message_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: groups groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_created_by_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id);


--
-- Name: messages messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_reply_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.messages(id);


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notification_settings notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: password_history password_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.password_history
    ADD CONSTRAINT password_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reports reports_reported_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reported_message_id_fkey FOREIGN KEY (reported_message_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- Name: reports reports_reported_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reports reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reports reports_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_resolved_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict lALDnUeyk3Ruiw0PMbbpeaFfVMBNLfMUJ6vs6VuxP0oGxfwRrb49txCQDFFn9tY

