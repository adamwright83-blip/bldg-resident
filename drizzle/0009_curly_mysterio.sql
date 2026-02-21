ALTER TABLE `preferences` ADD `driftWindowLastVal` varchar(64);--> statement-breakpoint
ALTER TABLE `preferences` ADD `driftWindowCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `preferences` ADD `driftWindowLastAt` timestamp;--> statement-breakpoint
ALTER TABLE `preferences` ADD `driftTypeLastVal` varchar(64);--> statement-breakpoint
ALTER TABLE `preferences` ADD `driftTypeCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `preferences` ADD `driftTypeLastAt` timestamp;--> statement-breakpoint
ALTER TABLE `service_requests` ADD `upgradeCode` varchar(64);--> statement-breakpoint
ALTER TABLE `service_requests` ADD `upgradePriceCents` int;--> statement-breakpoint
ALTER TABLE `service_requests` ADD `upgradeLabel` varchar(255);--> statement-breakpoint
ALTER TABLE `service_requests` ADD `paymentAdjustmentDueCents` int;