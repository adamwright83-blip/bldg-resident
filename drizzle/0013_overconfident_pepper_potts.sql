ALTER TABLE `service_requests` MODIFY COLUMN `status` enum('pending','paid','confirmed','in-progress','completed','cancelled') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `bldg_users` ADD `otpCode` varchar(6);--> statement-breakpoint
ALTER TABLE `bldg_users` ADD `otpExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `bldg_users` ADD `otpAttempts` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `bldg_users` ADD `pendingBookingIntentJson` json;--> statement-breakpoint
ALTER TABLE `service_requests` ADD `receiptUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `service_requests` ADD `orderId` int;