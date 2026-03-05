ALTER TABLE `service_requests` ADD `receiptUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `service_requests` ADD `orderId` int;--> statement-breakpoint
ALTER TABLE `service_requests` MODIFY COLUMN `status` enum('pending','paid','confirmed','in-progress','completed','cancelled') DEFAULT 'pending' NOT NULL;
