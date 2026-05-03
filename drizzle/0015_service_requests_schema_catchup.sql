ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `bldgUserId` int;--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `serviceType` enum('laundry','dry-cleaning','car-wash','cleaning','grooming','amenity','maintenance','other');--> statement-breakpoint
ALTER TABLE `service_requests` MODIFY COLUMN `serviceType` enum('laundry','dry-cleaning','car-wash','cleaning','grooming','amenity','maintenance','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `status` enum('pending','paid','confirmed','in-progress','completed','cancelled','new','contacting-vendor','awaiting-vendor','scheduled','closed') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `service_requests` MODIFY COLUMN `status` enum('pending','paid','confirmed','in-progress','completed','cancelled','new','contacting-vendor','awaiting-vendor','scheduled','closed') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `requestSummary` text;--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `requestJson` json;--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `scheduledDate` varchar(32);--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `scheduledWindow` varchar(64);--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `scheduledStartUtc` varchar(32);--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `scheduledEndUtc` varchar(32);--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `scheduledStartLocal` varchar(32);--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `scheduledEndLocal` varchar(32);--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `timezone` varchar(64);--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `upgradeCode` varchar(64);--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `upgradePriceCents` int;--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `upgradeLabel` varchar(255);--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `paymentAdjustmentDueCents` int;--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `receiptUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `orderId` int;--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `buildingId` varchar(20);--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `buildingLabel` varchar(100);--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `residentName` varchar(200);--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `residentPhone` varchar(20);--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `source` varchar(50);--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `service_requests` ADD COLUMN IF NOT EXISTS `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
