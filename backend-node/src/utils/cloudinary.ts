import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/env';

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
    return false;
  }
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
  configured = true;
  return true;
}

export async function uploadProfileImage(
  fileBuffer: Buffer,
  mimetype: string,
): Promise<string> {
  if (!ensureConfigured()) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_* environment variables.');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: config.cloudinary.uploadFolder,
        resource_type: 'image',
        format: mimetype === 'image/png' ? 'png' : 'jpg',
      },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error('Upload failed'));
        }
        resolve(result.secure_url);
      },
    );
    uploadStream.end(fileBuffer);
  });
}
