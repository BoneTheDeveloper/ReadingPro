--
-- PostgreSQL database dump
--

\restrict pzdWF6rjlODlUEiQDYTSitZZwa9Hkl3gXzkaJoifz5YD0qqjoobiCTCjWl2c5yF

-- Dumped from database version 17.12
-- Dumped by pg_dump version 17.12

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

--
-- Name: CEFRLevel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CEFRLevel" AS ENUM (
    'A1',
    'A2',
    'B1',
    'B2',
    'C1',
    'C2'
);


--
-- Name: PartOfSpeech; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PartOfSpeech" AS ENUM (
    'NOUN',
    'VERB',
    'ADJECTIVE',
    'ADVERB',
    'PREPOSITION',
    'CONJUNCTION',
    'PHRASE',
    'OTHER'
);


--
-- Name: ProcessingStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProcessingStatus" AS ENUM (
    'pending',
    'completed',
    'failed'
);


--
-- Name: ReviewRating; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReviewRating" AS ENUM (
    'AGAIN',
    'HARD',
    'GOOD',
    'EASY'
);


--
-- Name: SourceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SourceType" AS ENUM (
    'TEXT',
    'PDF',
    'YOUTUBE'
);


--
-- Name: StudioArtifactType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StudioArtifactType" AS ENUM (
    'QUESTION',
    'FLASHCARD'
);


--
-- Name: VocabularyStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."VocabularyStatus" AS ENUM (
    'NEW',
    'LEARNING',
    'REVIEW',
    'RELEARNING'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ChatMessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ChatMessage" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "userId" text NOT NULL,
    "passageId" uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Passage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Passage" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "userId" text NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    "cefrLevel" public."CEFRLevel",
    "wordCount" integer DEFAULT 0 NOT NULL,
    "sourceType" public."SourceType" NOT NULL,
    "filePath" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "youtubeUrl" text,
    status public."ProcessingStatus" DEFAULT 'pending'::public."ProcessingStatus" NOT NULL
);


--
-- Name: ReviewLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReviewLog" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "userId" text NOT NULL,
    "vocabularyItemId" uuid NOT NULL,
    "sessionId" uuid,
    "clientReviewId" uuid NOT NULL,
    rating public."ReviewRating" NOT NULL,
    status public."VocabularyStatus" NOT NULL,
    "dueAt" timestamp(3) without time zone NOT NULL,
    stability double precision NOT NULL,
    difficulty double precision NOT NULL,
    "elapsedDays" integer NOT NULL,
    "scheduledDays" integer NOT NULL,
    "learningSteps" integer NOT NULL,
    "durationMs" integer,
    "reviewedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ReviewSession; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReviewSession" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "userId" text NOT NULL,
    "vocabularySetId" uuid,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endedAt" timestamp(3) without time zone,
    "cardsReviewed" integer DEFAULT 0 NOT NULL
);


--
-- Name: StudioArtifact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StudioArtifact" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "passageId" uuid NOT NULL,
    "userId" text NOT NULL,
    type public."StudioArtifactType" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    content jsonb,
    progress jsonb,
    status public."ProcessingStatus" DEFAULT 'pending'::public."ProcessingStatus" NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "emailVerified" boolean DEFAULT false NOT NULL,
    image text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    tier text DEFAULT 'FREE'::text
);


--
-- Name: UserProfile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserProfile" (
    id text NOT NULL,
    bio text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "desiredRetention" double precision DEFAULT 0.9 NOT NULL,
    "fsrsParams" jsonb,
    timezone text DEFAULT 'Asia/Bangkok'::text NOT NULL
);


--
-- Name: VocabularyItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VocabularyItem" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "userId" text NOT NULL,
    term text NOT NULL,
    "targetLanguage" text NOT NULL,
    translation text NOT NULL,
    "sourceLanguage" text NOT NULL,
    "partofSpeech" public."PartOfSpeech" NOT NULL,
    "savedCount" integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "contextSentence" text,
    difficulty double precision DEFAULT 0 NOT NULL,
    "dueAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    lapses integer DEFAULT 0 NOT NULL,
    "lastReviewAt" timestamp(3) without time zone,
    "learningSteps" integer DEFAULT 0 NOT NULL,
    "passageId" uuid,
    reps integer DEFAULT 0 NOT NULL,
    "scheduledDays" integer DEFAULT 0 NOT NULL,
    stability double precision DEFAULT 0 NOT NULL,
    status public."VocabularyStatus" DEFAULT 'NEW'::public."VocabularyStatus" NOT NULL,
    "vocabularySetId" uuid NOT NULL
);


--
-- Name: VocabularySet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VocabularySet" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "userId" text NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "dailyNewLimit" integer DEFAULT 10 NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp(3) without time zone,
    "refreshTokenExpiresAt" timestamp(3) without time zone,
    scope text,
    password text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    id text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL
);


--
-- Name: verification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ChatMessage ChatMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_pkey" PRIMARY KEY (id);


--
-- Name: Passage Passage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Passage"
    ADD CONSTRAINT "Passage_pkey" PRIMARY KEY (id);


--
-- Name: ReviewLog ReviewLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReviewLog"
    ADD CONSTRAINT "ReviewLog_pkey" PRIMARY KEY (id);


--
-- Name: ReviewSession ReviewSession_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReviewSession"
    ADD CONSTRAINT "ReviewSession_pkey" PRIMARY KEY (id);


--
-- Name: StudioArtifact StudioArtifact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudioArtifact"
    ADD CONSTRAINT "StudioArtifact_pkey" PRIMARY KEY (id);


--
-- Name: UserProfile UserProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserProfile"
    ADD CONSTRAINT "UserProfile_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: VocabularyItem VocabularyItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VocabularyItem"
    ADD CONSTRAINT "VocabularyItem_pkey" PRIMARY KEY (id);


--
-- Name: VocabularySet VocabularySet_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VocabularySet"
    ADD CONSTRAINT "VocabularySet_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: ChatMessage_userId_passageId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChatMessage_userId_passageId_createdAt_idx" ON public."ChatMessage" USING btree ("userId", "passageId", "createdAt");


--
-- Name: Passage_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Passage_createdAt_idx" ON public."Passage" USING btree ("createdAt");


--
-- Name: Passage_filePath_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Passage_filePath_key" ON public."Passage" USING btree ("filePath");


--
-- Name: Passage_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Passage_status_idx" ON public."Passage" USING btree (status);


--
-- Name: Passage_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Passage_userId_idx" ON public."Passage" USING btree ("userId");


--
-- Name: ReviewLog_clientReviewId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ReviewLog_clientReviewId_key" ON public."ReviewLog" USING btree ("clientReviewId");


--
-- Name: ReviewLog_userId_reviewedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReviewLog_userId_reviewedAt_idx" ON public."ReviewLog" USING btree ("userId", "reviewedAt");


--
-- Name: ReviewLog_vocabularyItemId_reviewedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReviewLog_vocabularyItemId_reviewedAt_idx" ON public."ReviewLog" USING btree ("vocabularyItemId", "reviewedAt");


--
-- Name: ReviewSession_userId_startedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReviewSession_userId_startedAt_idx" ON public."ReviewSession" USING btree ("userId", "startedAt" DESC);


--
-- Name: StudioArtifact_passageId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudioArtifact_passageId_createdAt_idx" ON public."StudioArtifact" USING btree ("passageId", "createdAt" DESC);


--
-- Name: StudioArtifact_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudioArtifact_status_idx" ON public."StudioArtifact" USING btree (status);


--
-- Name: StudioArtifact_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudioArtifact_userId_createdAt_idx" ON public."StudioArtifact" USING btree ("userId", "createdAt" DESC);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: VocabularyItem_userId_dueAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "VocabularyItem_userId_dueAt_idx" ON public."VocabularyItem" USING btree ("userId", "dueAt");


--
-- Name: VocabularyItem_userId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "VocabularyItem_userId_status_idx" ON public."VocabularyItem" USING btree ("userId", status);


--
-- Name: VocabularyItem_userId_term_translation_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VocabularyItem_userId_term_translation_key" ON public."VocabularyItem" USING btree ("userId", term, translation);


--
-- Name: VocabularyItem_vocabularySetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "VocabularyItem_vocabularySetId_idx" ON public."VocabularyItem" USING btree ("vocabularySetId");


--
-- Name: VocabularySet_userId_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VocabularySet_userId_name_key" ON public."VocabularySet" USING btree ("userId", name);


--
-- Name: account_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "account_userId_idx" ON public.account USING btree ("userId");


--
-- Name: session_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX session_token_key ON public.session USING btree (token);


--
-- Name: session_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "session_userId_idx" ON public.session USING btree ("userId");


--
-- Name: verification_identifier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX verification_identifier_idx ON public.verification USING btree (identifier);


--
-- Name: ChatMessage ChatMessage_passageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES public."Passage"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Passage Passage_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Passage"
    ADD CONSTRAINT "Passage_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."UserProfile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReviewLog ReviewLog_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReviewLog"
    ADD CONSTRAINT "ReviewLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public."ReviewSession"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ReviewLog ReviewLog_vocabularyItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReviewLog"
    ADD CONSTRAINT "ReviewLog_vocabularyItemId_fkey" FOREIGN KEY ("vocabularyItemId") REFERENCES public."VocabularyItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReviewSession ReviewSession_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReviewSession"
    ADD CONSTRAINT "ReviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."UserProfile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReviewSession ReviewSession_vocabularySetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReviewSession"
    ADD CONSTRAINT "ReviewSession_vocabularySetId_fkey" FOREIGN KEY ("vocabularySetId") REFERENCES public."VocabularySet"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StudioArtifact StudioArtifact_passageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudioArtifact"
    ADD CONSTRAINT "StudioArtifact_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES public."Passage"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserProfile UserProfile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserProfile"
    ADD CONSTRAINT "UserProfile_id_fkey" FOREIGN KEY (id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: VocabularyItem VocabularyItem_passageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VocabularyItem"
    ADD CONSTRAINT "VocabularyItem_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES public."Passage"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: VocabularyItem VocabularyItem_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VocabularyItem"
    ADD CONSTRAINT "VocabularyItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."UserProfile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: VocabularyItem VocabularyItem_vocabularySetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VocabularyItem"
    ADD CONSTRAINT "VocabularyItem_vocabularySetId_fkey" FOREIGN KEY ("vocabularySetId") REFERENCES public."VocabularySet"(id) ON UPDATE CASCADE;


--
-- Name: VocabularySet VocabularySet_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VocabularySet"
    ADD CONSTRAINT "VocabularySet_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."UserProfile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: session session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict pzdWF6rjlODlUEiQDYTSitZZwa9Hkl3gXzkaJoifz5YD0qqjoobiCTCjWl2c5yF

