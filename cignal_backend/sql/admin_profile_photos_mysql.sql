-- Apply manually to the CignalCare+ LOCAL/STAGING MySQL database before uploading photos.
-- This table is separate from passwords and audit logs; photos are private to the authenticated admin.
CREATE TABLE IF NOT EXISTS `admin_profile_photos` (
  `user_id` INT NOT NULL PRIMARY KEY,
  `mime_type` VARCHAR(32) NOT NULL,
  `image_base64` MEDIUMTEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_admin_photo_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
