--
-- PostgreSQL database dump
--

\restrict PWQsRKN2hzBXJcyefJhszR6nstvpQxyoTmfSRgwHVC9U5eUulJxPXBdhI9ESGBt

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: adaptive_difficulty; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adaptive_difficulty (
    id integer NOT NULL,
    user_id integer NOT NULL,
    challenge_type character varying(50) NOT NULL,
    previous_difficulty character varying(20) NOT NULL,
    new_difficulty character varying(20) NOT NULL,
    accuracy numeric(5,2) DEFAULT 0 NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: adaptive_difficulty_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.adaptive_difficulty_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: adaptive_difficulty_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.adaptive_difficulty_id_seq OWNED BY public.adaptive_difficulty.id;


--
-- Name: alarm_challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alarm_challenges (
    alarm_challenge_id integer NOT NULL,
    alarm_id integer,
    challenge_id integer
);


--
-- Name: alarm_challenges_alarm_challenge_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alarm_challenges_alarm_challenge_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alarm_challenges_alarm_challenge_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alarm_challenges_alarm_challenge_id_seq OWNED BY public.alarm_challenges.alarm_challenge_id;


--
-- Name: alarms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alarms (
    alarm_id integer NOT NULL,
    user_id integer,
    alarm_time time without time zone NOT NULL,
    alarm_name character varying(100),
    is_active boolean DEFAULT true,
    alarm_type character varying(40) DEFAULT 'Daily Alarm'::character varying NOT NULL,
    recurrence_days character varying(100) DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat,Sun'::character varying NOT NULL,
    alarm_date date,
    time_zone character varying(80) DEFAULT 'Asia/Kolkata'::character varying NOT NULL,
    smart_window_minutes integer DEFAULT 30 NOT NULL,
    snooze_limit integer DEFAULT 3 NOT NULL,
    snooze_count integer DEFAULT 0 NOT NULL
);


--
-- Name: alarms_alarm_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alarms_alarm_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alarms_alarm_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alarms_alarm_id_seq OWNED BY public.alarms.alarm_id;


--
-- Name: behavioral_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.behavioral_events (
    event_id integer NOT NULL,
    user_id integer NOT NULL,
    alarm_id integer,
    event_type character varying(50) NOT NULL,
    event_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: behavioral_events_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.behavioral_events_event_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: behavioral_events_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.behavioral_events_event_id_seq OWNED BY public.behavioral_events.event_id;


--
-- Name: challenge_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.challenge_attempts (
    attempt_id integer NOT NULL,
    user_id integer,
    alarm_id integer,
    challenge_id integer,
    user_answer text NOT NULL,
    is_correct boolean NOT NULL,
    attempted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: challenge_attempts_attempt_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.challenge_attempts_attempt_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: challenge_attempts_attempt_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.challenge_attempts_attempt_id_seq OWNED BY public.challenge_attempts.attempt_id;


--
-- Name: challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.challenges (
    challenge_id integer NOT NULL,
    challenge_type character varying(50) NOT NULL,
    difficulty character varying(20) NOT NULL,
    question text NOT NULL,
    correct_answer text NOT NULL
);


--
-- Name: challenges_challenge_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.challenges_challenge_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: challenges_challenge_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.challenges_challenge_id_seq OWNED BY public.challenges.challenge_id;


--
-- Name: habit_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.habit_scores (
    id integer NOT NULL,
    user_id integer NOT NULL,
    wake_up_consistency numeric(5,2) DEFAULT 0 NOT NULL,
    challenge_success numeric(5,2) DEFAULT 0 NOT NULL,
    snooze_reduction numeric(5,2) DEFAULT 0 NOT NULL,
    sleep_adherence numeric(5,2) DEFAULT 0 NOT NULL,
    overall_score numeric(5,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: habit_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.habit_scores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: habit_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.habit_scores_id_seq OWNED BY public.habit_scores.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    notification_id integer NOT NULL,
    user_id integer NOT NULL,
    notification_type character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: notifications_notification_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_notification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_notification_id_seq OWNED BY public.notifications.notification_id;


--
-- Name: recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recommendations (
    id integer NOT NULL,
    user_id integer NOT NULL,
    recommendation_type character varying(50) NOT NULL,
    recommendation_text text NOT NULL,
    priority character varying(20) DEFAULT 'Medium'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_completed boolean DEFAULT false NOT NULL
);


--
-- Name: recommendations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recommendations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recommendations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recommendations_id_seq OWNED BY public.recommendations.id;


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    profile_id integer NOT NULL,
    user_id integer,
    wake_up_time time without time zone,
    sleep_time time without time zone,
    preferred_challenge_type character varying(50),
    preferred_difficulty character varying(20),
    sleep_duration_minutes integer DEFAULT 480 NOT NULL,
    time_zone character varying(80) DEFAULT 'Asia/Kolkata'::character varying NOT NULL,
    productivity_goals text DEFAULT ''::text NOT NULL,
    habit_preferences text DEFAULT ''::text NOT NULL
);


--
-- Name: user_profiles_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_profiles_profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_profiles_profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_profiles_profile_id_seq OWNED BY public.user_profiles.profile_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'user'::character varying
);


--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: adaptive_difficulty id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_difficulty ALTER COLUMN id SET DEFAULT nextval('public.adaptive_difficulty_id_seq'::regclass);


--
-- Name: alarm_challenges alarm_challenge_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alarm_challenges ALTER COLUMN alarm_challenge_id SET DEFAULT nextval('public.alarm_challenges_alarm_challenge_id_seq'::regclass);


--
-- Name: alarms alarm_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alarms ALTER COLUMN alarm_id SET DEFAULT nextval('public.alarms_alarm_id_seq'::regclass);


--
-- Name: behavioral_events event_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.behavioral_events ALTER COLUMN event_id SET DEFAULT nextval('public.behavioral_events_event_id_seq'::regclass);


--
-- Name: challenge_attempts attempt_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_attempts ALTER COLUMN attempt_id SET DEFAULT nextval('public.challenge_attempts_attempt_id_seq'::regclass);


--
-- Name: challenges challenge_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenges ALTER COLUMN challenge_id SET DEFAULT nextval('public.challenges_challenge_id_seq'::regclass);


--
-- Name: habit_scores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_scores ALTER COLUMN id SET DEFAULT nextval('public.habit_scores_id_seq'::regclass);


--
-- Name: notifications notification_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN notification_id SET DEFAULT nextval('public.notifications_notification_id_seq'::regclass);


--
-- Name: recommendations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendations ALTER COLUMN id SET DEFAULT nextval('public.recommendations_id_seq'::regclass);


--
-- Name: user_profiles profile_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles ALTER COLUMN profile_id SET DEFAULT nextval('public.user_profiles_profile_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Name: adaptive_difficulty adaptive_difficulty_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_difficulty
    ADD CONSTRAINT adaptive_difficulty_pkey PRIMARY KEY (id);


--
-- Name: alarm_challenges alarm_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alarm_challenges
    ADD CONSTRAINT alarm_challenges_pkey PRIMARY KEY (alarm_challenge_id);


--
-- Name: alarms alarms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alarms
    ADD CONSTRAINT alarms_pkey PRIMARY KEY (alarm_id);


--
-- Name: behavioral_events behavioral_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.behavioral_events
    ADD CONSTRAINT behavioral_events_pkey PRIMARY KEY (event_id);


--
-- Name: challenge_attempts challenge_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_attempts
    ADD CONSTRAINT challenge_attempts_pkey PRIMARY KEY (attempt_id);


--
-- Name: challenges challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_pkey PRIMARY KEY (challenge_id);


--
-- Name: habit_scores habit_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_scores
    ADD CONSTRAINT habit_scores_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (notification_id);


--
-- Name: recommendations recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (profile_id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: idx_alarms_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alarms_active ON public.alarms USING btree (user_id, is_active);


--
-- Name: idx_alarms_user_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alarms_user_time ON public.alarms USING btree (user_id, alarm_time);


--
-- Name: idx_profiles_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_user ON public.user_profiles USING btree (user_id);


--
-- Name: adaptive_difficulty adaptive_difficulty_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_difficulty
    ADD CONSTRAINT adaptive_difficulty_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: alarm_challenges alarm_challenges_alarm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alarm_challenges
    ADD CONSTRAINT alarm_challenges_alarm_id_fkey FOREIGN KEY (alarm_id) REFERENCES public.alarms(alarm_id);


--
-- Name: alarm_challenges alarm_challenges_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alarm_challenges
    ADD CONSTRAINT alarm_challenges_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(challenge_id);


--
-- Name: alarms alarms_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alarms
    ADD CONSTRAINT alarms_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: behavioral_events behavioral_events_alarm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.behavioral_events
    ADD CONSTRAINT behavioral_events_alarm_id_fkey FOREIGN KEY (alarm_id) REFERENCES public.alarms(alarm_id) ON DELETE SET NULL;


--
-- Name: behavioral_events behavioral_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.behavioral_events
    ADD CONSTRAINT behavioral_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: challenge_attempts challenge_attempts_alarm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_attempts
    ADD CONSTRAINT challenge_attempts_alarm_id_fkey FOREIGN KEY (alarm_id) REFERENCES public.alarms(alarm_id);


--
-- Name: challenge_attempts challenge_attempts_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_attempts
    ADD CONSTRAINT challenge_attempts_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(challenge_id);


--
-- Name: challenge_attempts challenge_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_attempts
    ADD CONSTRAINT challenge_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: habit_scores habit_scores_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_scores
    ADD CONSTRAINT habit_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: recommendations recommendations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- PostgreSQL database dump complete
--

\unrestrict PWQsRKN2hzBXJcyefJhszR6nstvpQxyoTmfSRgwHVC9U5eUulJxPXBdhI9ESGBt
