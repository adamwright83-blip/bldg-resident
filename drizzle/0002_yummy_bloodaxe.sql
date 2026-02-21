CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bldgUserId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bldgUserId` int NOT NULL,
	`serviceType` enum('laundry','dry-cleaning','car-wash','grooming','amenity','maintenance','other') NOT NULL,
	`status` enum('pending','confirmed','in-progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`requestSummary` text,
	`requestJson` json,
	`scheduledDate` varchar(32),
	`scheduledWindow` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_requests_id` PRIMARY KEY(`id`)
);
