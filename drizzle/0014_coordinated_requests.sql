ALTER TABLE `service_requests` MODIFY COLUMN `status` enum('pending','paid','confirmed','in-progress','completed','cancelled','new','contacting-vendor','awaiting-vendor','scheduled','closed') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `service_requests` ADD `buildingId` varchar(20);--> statement-breakpoint
ALTER TABLE `service_requests` ADD `buildingLabel` varchar(100);--> statement-breakpoint
ALTER TABLE `service_requests` ADD `residentName` varchar(200);--> statement-breakpoint
ALTER TABLE `service_requests` ADD `residentPhone` varchar(20);--> statement-breakpoint
ALTER TABLE `service_requests` ADD `source` varchar(50);
