ALTER TABLE `bldg_users` ADD `stripeCustomerId` varchar(100);--> statement-breakpoint
ALTER TABLE `bldg_users` ADD `paymentMethodSaved` int DEFAULT 0 NOT NULL;