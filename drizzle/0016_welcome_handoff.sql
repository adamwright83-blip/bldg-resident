ALTER TABLE `bldg_users` ADD COLUMN `email` varchar(320);--> statement-breakpoint
ALTER TABLE `chat_messages` ADD COLUMN `idempotencyKey` varchar(191);--> statement-breakpoint
ALTER TABLE `chat_messages` ADD UNIQUE INDEX `chat_messages_idempotency_key_unique` (`idempotencyKey`);--> statement-breakpoint
DELETE duplicate_row FROM `service_requests` duplicate_row
INNER JOIN `service_requests` keeper
  ON duplicate_row.`bldgUserId` = keeper.`bldgUserId`
  AND duplicate_row.`orderId` = keeper.`orderId`
  AND duplicate_row.`id` > keeper.`id`
WHERE duplicate_row.`orderId` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `service_requests` ADD UNIQUE INDEX `service_requests_user_order_unique` (`bldgUserId`,`orderId`);
