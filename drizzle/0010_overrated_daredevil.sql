ALTER TABLE `service_requests` ADD `scheduledStartUtc` varchar(32);--> statement-breakpoint
ALTER TABLE `service_requests` ADD `scheduledEndUtc` varchar(32);--> statement-breakpoint
ALTER TABLE `service_requests` ADD `scheduledStartLocal` varchar(32);--> statement-breakpoint
ALTER TABLE `service_requests` ADD `scheduledEndLocal` varchar(32);--> statement-breakpoint
ALTER TABLE `service_requests` ADD `timezone` varchar(64);