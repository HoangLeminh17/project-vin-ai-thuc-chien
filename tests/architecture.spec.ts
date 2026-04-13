import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Helper function to get all files in a directory recursively
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;

  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

describe('Architecture & Standard Enforcement Tests', () => {
  const rootDir = process.cwd();

  describe('1. Clean Architecture: Core Rules', () => {
    const useCaseDir = path.join(rootDir, 'core', 'use-cases');
    const useCaseFiles = getAllFiles(useCaseDir);

    it('core/use-cases should not import infrastructure, app, or external specific libs', () => {
      const forbiddenImports = [
        'from \'infrastructure/',
        'from "@/infrastructure/',
        'from \'app/',
        'from "@/app/',
        'from "infrastructure/',
        'from "@/infrastructure/',
        'from "app/',
        'from "@/app/',
        'firebase',
        'axios'
      ];

      for (const file of useCaseFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        
        for (const forbidden of forbiddenImports) {
          const regex = new RegExp(`import.*${forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
          if (regex.test(content)) {
            throw new Error(`Clean Architecture Violation in ${file}:\nUse Case is not allowed to import: ${forbidden}`);
          }
        }
      }
    });

    it('core/ports should not import from use-cases or infrastructure', () => {
      const portsDir = path.join(rootDir, 'core', 'ports');
      const portFiles = getAllFiles(portsDir);
      
      const forbiddenImports = [
        'from \'infrastructure/',
        'from "@/infrastructure/',
        'from \'core/use-cases/',
        'from "@/core/use-cases/'
      ];

      for (const file of portFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        for (const forbidden of forbiddenImports) {
          if (content.includes(forbidden)) {
            throw new Error(`Clean Architecture Violation in ${file}:\nPort should not depend on concrete implementations like: ${forbidden}`);
          }
        }
      }
    });
  });

  describe('2. Centralized Logging & Monitoring Enforcement', () => {
    const useCaseDir = path.join(rootDir, 'core', 'use-cases');
    const useCaseFiles = getAllFiles(useCaseDir);
    
    it('core/use-cases should NOT contain manual console.log, logger, or monitoring calls', () => {
      // Use cases should be pure, logging is handled by proxy at di.ts
      const manualLoggingPatterns = [
        /console\.(log|error|warn|info)/g,
        /logger\.(info|error|warn|debug)/g,
        /monitoring\.capture/g
      ];

      for (const file of useCaseFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        
        for (const pattern of manualLoggingPatterns) {
          if (pattern.test(content)) {
            throw new Error(`Centralized Logging Violation in ${file}:\nUse Case must be pure and should NOT call console.* or logger.* manually. Use the 'withUseCaseLogging' proxy instead.`);
          }
        }
      }
    });

    const apiRouteDir = path.join(rootDir, 'app', 'api');
    const apiFiles = getAllFiles(apiRouteDir);

    it('API Routes should NOT contain manual console.log, use withApiLogging instead', () => {
      const manualLoggingPatterns = [
        /console\.(log|error|warn|info)/g
      ];

      for (const file of apiFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        for (const pattern of manualLoggingPatterns) {
          if (pattern.test(content)) {
            throw new Error(`Centralized Logging Violation in ${file}:\nAPI Route contains manual console.* logging. Please remove it and ensure the handler is wrapped with 'withApiLogging'.`);
          }
        }
      }
    });
  });
});
