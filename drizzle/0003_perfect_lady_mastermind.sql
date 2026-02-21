CREATE TABLE `preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bldgUserId` int NOT NULL,
	`serviceCategory` enum('laundry','car-wash','cleaning','grooming','amenity','maintenance') NOT NULL,
	`autoSchedule` enum('enabled','disabled') NOT NULL DEFAULT 'enabled',
	`preferredDay` varchar(32),
	`preferredWindow` varchar(64),
	`lastBookedDate` varchar(32),
	`recurrenceInterval` varchar(32),
	`vendorId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `preferences_id` PRIMARY KEY(`id`)
);
