CREATE TABLE `phone_numbers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `phone_numbers_name_unique` ON `phone_numbers` (`name`);