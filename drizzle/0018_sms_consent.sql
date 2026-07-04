CREATE TABLE `sms_consents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `bldgUserId` int,
  `phoneE164` varchar(20) NOT NULL,
  `status` enum('granted','withdrawn') NOT NULL,
  `consentedAt` timestamp NOT NULL,
  `source` varchar(64) NOT NULL,
  `method` varchar(64) NOT NULL,
  `disclosureVersion` varchar(64) NOT NULL,
  `disclosureText` text NOT NULL,
  `termsUrl` varchar(512) NOT NULL,
  `privacyUrl` varchar(512) NOT NULL,
  `requestIp` varchar(64),
  `userAgent` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `withdrawnAt` timestamp,
  CONSTRAINT `sms_consents_id` PRIMARY KEY(`id`)
);
CREATE INDEX `sms_consents_phone_status_idx` ON `sms_consents` (`phoneE164`, `status`);
