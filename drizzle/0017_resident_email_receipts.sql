ALTER TABLE `bldg_users` ADD COLUMN `emailReceiptsEnabled` int NOT NULL DEFAULT 0;
ALTER TABLE `bldg_users` ADD COLUMN `emailReceiptPromptedAt` timestamp NULL;
