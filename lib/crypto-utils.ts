import crypto from 'crypto';

/**
 * Tạo mã hash SHA-256 từ chuỗi nội dung văn bản.
 * Dùng để nhận diện các file PDF có nội dung trùng lặp.
 */
export function getContentHash(content: string): string {
  return crypto
    .createHash('sha256')
    .update(content)
    .digest('hex');
}
