import multer from 'multer';
import { Request } from 'express';
import { AppError } from '../utils/AppError';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const BOARDING_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_BOARDING_IMAGES = 8;

const storage = multer.memoryStorage();

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only JPG/JPEG/PNG images are allowed', 400));
  }
}

function boardingFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (BOARDING_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only JPEG/PNG/WebP images are allowed', 400));
  }
}

export const uploadProfileImageMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single('profileImage');

export const uploadBoardingImageMiddleware = multer({
  storage,
  fileFilter: boardingFileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).array('images', MAX_BOARDING_IMAGES);
