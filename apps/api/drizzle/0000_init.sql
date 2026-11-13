CREATE TABLE `answers` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`question_id` bigint unsigned NOT NULL,
	`author_id` bigint unsigned NOT NULL,
	`body` varchar(1000) NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`actor_id` bigint unsigned,
	`entity_type` varchar(30) NOT NULL,
	`entity_id` bigint unsigned,
	`action` varchar(60) NOT NULL,
	`reason` varchar(200),
	`created_at` datetime NOT NULL,
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(6) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`business_id` bigint unsigned NOT NULL,
	`service_id` bigint unsigned NOT NULL,
	`experience_id` bigint unsigned,
	`recommender_id` bigint unsigned,
	`slot_at` datetime NOT NULL,
	`price_paise` int NOT NULL,
	`status` enum('confirmed','completed','cancelled') NOT NULL DEFAULT 'confirmed',
	`accuracy` tinyint,
	`accuracy_at` datetime,
	`completed_at` datetime,
	`cancelled_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `bk_biz_code_uq` UNIQUE(`business_id`,`code`)
);
--> statement-breakpoint
CREATE TABLE `business_members` (
	`business_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`role` enum('owner','staff') NOT NULL DEFAULT 'owner',
	`created_at` datetime NOT NULL,
	CONSTRAINT `business_members_business_id_user_id_pk` PRIMARY KEY(`business_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`slug` varchar(120) NOT NULL,
	`name` varchar(120) NOT NULL,
	`category` enum('salon','stay','wellness','activity','food') NOT NULL,
	`city` varchar(60) NOT NULL,
	`area` varchar(120),
	`description` varchar(600),
	`hours_text` varchar(200),
	`open_hour` tinyint NOT NULL DEFAULT 10,
	`close_hour` tinyint NOT NULL DEFAULT 19,
	`commission_bps` int NOT NULL DEFAULT 1200,
	`is_sample` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL,
	CONSTRAINT `businesses_id` PRIMARY KEY(`id`),
	CONSTRAINT `biz_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `commissions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`booking_id` bigint unsigned NOT NULL,
	`recommender_id` bigint unsigned NOT NULL,
	`platform_paise` int NOT NULL,
	`amount_paise` int NOT NULL,
	`status` enum('estimated','pending_settlement','payable','paid','reversed') NOT NULL DEFAULT 'estimated',
	`payout_id` bigint unsigned,
	`settle_after` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `commissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `com_booking_uq` UNIQUE(`booking_id`)
);
--> statement-breakpoint
CREATE TABLE `experiences` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`author_id` bigint unsigned NOT NULL,
	`business_id` bigint unsigned NOT NULL,
	`service_id` bigint unsigned,
	`title` varchar(160) NOT NULL,
	`story` text NOT NULL,
	`pros` text,
	`cons` text,
	`suits` varchar(200),
	`parking` varchar(160),
	`access` varchar(160),
	`price_paid` varchar(80),
	`who_for` varchar(30),
	`rating_x10` tinyint NOT NULL,
	`visited_on` date NOT NULL,
	`status` enum('pending','published','rejected') NOT NULL DEFAULT 'pending',
	`proof_type` enum('firsthand_booking','business_confirm','receipt') NOT NULL,
	`level` tinyint NOT NULL DEFAULT 0,
	`free_or_discounted` boolean NOT NULL DEFAULT false,
	`evidence_path` varchar(255),
	`reject_reason` varchar(200),
	`business_reply` text,
	`business_reply_at` datetime,
	`published_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `experiences_id` PRIMARY KEY(`id`),
	CONSTRAINT `exp_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `follows` (
	`follower_id` bigint unsigned NOT NULL,
	`followee_id` bigint unsigned NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `follows_follower_id_followee_id_pk` PRIMARY KEY(`follower_id`,`followee_id`)
);
--> statement-breakpoint
CREATE TABLE `helpful_votes` (
	`experience_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `helpful_votes_experience_id_user_id_pk` PRIMARY KEY(`experience_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`business_name` varchar(120) NOT NULL,
	`category` varchar(60) NOT NULL,
	`city` varchar(60) NOT NULL,
	`contact_name` varchar(80) NOT NULL,
	`phone` varchar(30) NOT NULL,
	`status` enum('new','contacted','closed') NOT NULL DEFAULT 'new',
	`created_at` datetime NOT NULL,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`commission_id` bigint unsigned,
	`payout_id` bigint unsigned,
	`user_id` bigint unsigned NOT NULL,
	`from_status` varchar(30),
	`to_status` varchar(30) NOT NULL,
	`amount_paise` int NOT NULL,
	`note` varchar(200),
	`created_at` datetime NOT NULL,
	CONSTRAINT `ledger_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`thread_id` bigint unsigned NOT NULL,
	`sender_id` bigint unsigned NOT NULL,
	`body` varchar(2000) NOT NULL,
	`masked` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL,
	`read_at` datetime,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `otp_codes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(191) NOT NULL,
	`code_hash` varchar(64) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`expires_at` datetime NOT NULL,
	`used_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `otp_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payouts` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`amount_paise` int NOT NULL,
	`status` enum('requested','paid','rejected') NOT NULL DEFAULT 'requested',
	`reference` varchar(40),
	`created_at` datetime NOT NULL,
	`paid_at` datetime,
	CONSTRAINT `payouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`experience_id` bigint unsigned NOT NULL,
	`asker_id` bigint unsigned NOT NULL,
	`body` varchar(600) NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`experience_id` bigint unsigned NOT NULL,
	`reporter_id` bigint unsigned NOT NULL,
	`reason` varchar(400) NOT NULL,
	`status` enum('open','dismissed','upheld') NOT NULL DEFAULT 'open',
	`created_at` datetime NOT NULL,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saves` (
	`experience_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `saves_experience_id_user_id_pk` PRIMARY KEY(`experience_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`business_id` bigint unsigned NOT NULL,
	`name` varchar(120) NOT NULL,
	`duration_min` int NOT NULL DEFAULT 60,
	`price_paise` int NOT NULL,
	`unit` varchar(30),
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` varchar(64) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`admin_until` datetime,
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `sessions_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `threads` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_a` bigint unsigned NOT NULL,
	`user_b` bigint unsigned NOT NULL,
	`experience_id` bigint unsigned,
	`last_at` datetime NOT NULL,
	CONSTRAINT `threads_id` PRIMARY KEY(`id`),
	CONSTRAINT `thread_pair_uq` UNIQUE(`user_a`,`user_b`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(191) NOT NULL,
	`name` varchar(80),
	`handle` varchar(40),
	`city` varchar(60),
	`bio` varchar(400),
	`open_for_questions` boolean NOT NULL DEFAULT false,
	`is_demo` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_uq` UNIQUE(`email`),
	CONSTRAINT `users_handle_uq` UNIQUE(`handle`)
);
--> statement-breakpoint
CREATE INDEX `a_q_idx` ON `answers` (`question_id`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `bk_user_idx` ON `bookings` (`user_id`);--> statement-breakpoint
CREATE INDEX `bk_biz_slot_idx` ON `bookings` (`business_id`,`slot_at`);--> statement-breakpoint
CREATE INDEX `bk_rec_idx` ON `bookings` (`recommender_id`);--> statement-breakpoint
CREATE INDEX `bm_user_idx` ON `business_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `biz_city_cat_idx` ON `businesses` (`city`,`category`);--> statement-breakpoint
CREATE INDEX `com_rec_status_idx` ON `commissions` (`recommender_id`,`status`);--> statement-breakpoint
CREATE INDEX `exp_status_pub_idx` ON `experiences` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `exp_author_idx` ON `experiences` (`author_id`);--> statement-breakpoint
CREATE INDEX `exp_biz_idx` ON `experiences` (`business_id`);--> statement-breakpoint
CREATE INDEX `le_user_idx` ON `ledger_entries` (`user_id`);--> statement-breakpoint
CREATE INDEX `msg_thread_idx` ON `messages` (`thread_id`);--> statement-breakpoint
CREATE INDEX `otp_email_idx` ON `otp_codes` (`email`);--> statement-breakpoint
CREATE INDEX `q_exp_idx` ON `questions` (`experience_id`);--> statement-breakpoint
CREATE INDEX `saves_user_idx` ON `saves` (`user_id`);--> statement-breakpoint
CREATE INDEX `svc_biz_idx` ON `services` (`business_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);