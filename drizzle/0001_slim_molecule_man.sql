CREATE TABLE `bldg_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phoneE164` varchar(20) NOT NULL,
	`firstName` varchar(100),
	`buildingSlug` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastLoginAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bldg_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `bldg_users_phoneE164_unique` UNIQUE(`phoneE164`)
);
