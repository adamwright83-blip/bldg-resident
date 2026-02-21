CREATE TABLE `onboarding_flags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bldgUserId` int NOT NULL,
	`serviceCategory` enum('laundry','car-wash','cleaning','grooming','amenity','maintenance') NOT NULL,
	`shownAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `onboarding_flags_id` PRIMARY KEY(`id`)
);
