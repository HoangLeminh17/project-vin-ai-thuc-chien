import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Filesystem & Build Sanity', () => {
  const root = process.cwd();

  it('should have a public directory (required for Docker build)', () => {
    const publicPath = path.join(root, 'public');
    expect(fs.existsSync(publicPath)).toBe(true);
    expect(fs.statSync(publicPath).isDirectory()).toBe(true);
  });

  it('should have a .gitkeep in public folder if it would otherwise be empty', () => {
    const publicPath = path.join(root, 'public');
    const files = fs.readdirSync(publicPath);
    if (files.length === 0 || (files.length === 1 && files[0] === 'uploads')) {
      // If it only contains 'uploads', check if uploads is also empty
      const uploadsPath = path.join(publicPath, 'uploads');
      if (fs.existsSync(uploadsPath) && fs.readdirSync(uploadsPath).length === 0) {
         expect(files).toContain('.gitkeep');
      }
    }
  });

  it('should have required config files for production build', () => {
    const requiredFiles = [
      'next.config.ts',
      'package.json',
      'tsconfig.json',
      'Dockerfile'
    ];
    requiredFiles.forEach(file => {
      expect(fs.existsSync(path.join(root, file))).toBe(true);
    });
  });
});
