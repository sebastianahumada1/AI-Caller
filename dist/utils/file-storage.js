import fs from 'fs';
import path from 'path';
import { Logger } from './logger.js';
export class FileStorage {
    baseDir;
    constructor() {
        this.baseDir = process.env.STORAGE_BASE_DIR || './storage';
        this.ensureDirectoryExists(this.baseDir);
    }
    ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            Logger.info('[FILE_STORAGE] Created directory', { dirPath });
        }
    }
    getDateString() {
        return new Date().toISOString().split('T')[0] || '1970-01-01'; // YYYY-MM-DD
    }
    getTimestamp() {
        return new Date().toISOString();
    }
    // Save complete call data in one efficient operation (without sending notes to GHL)
    async saveCompleteCallData(callId, data) {
        try {
            const dateStr = this.getDateString();
            const dayDir = path.join(this.baseDir, dateStr);
            this.ensureDirectoryExists(dayDir);
            const fileName = `${callId}_complete.txt`;
            const filePath = path.join(dayDir, fileName);
            const timestamp = this.getTimestamp();
            const content = [
                `=== CALL COMPLETE DATA ===`,
                `Timestamp: ${timestamp}`,
                `Call ID: ${callId}`,
                `Contact ID: ${data.contactId || 'Not available'}`,
                ``,
                `=== FINAL TRANSCRIPT ===`,
                `Role: ${data.role || 'unknown'}`,
                `Is Final: ${data.isFinal ? 'YES' : 'NO'}`,
                `Content:`,
                data.transcript || 'No transcript available',
                ``,
                `=== METADATA ===`,
                JSON.stringify(data.metadata, null, 2),
                ``,
                `=== END OF CALL DATA ===`,
                ``
            ].join('\n');
            await fs.promises.writeFile(filePath, content, 'utf8');
            Logger.info('[FILE_STORAGE] Complete call data saved', {
                callId,
                contactId: data.contactId,
                filePath,
                hasTranscript: !!data.transcript,
                hasMetadata: !!data.metadata,
            });
            // Note: GHL note sending is now handled centrally by VapiWebhookHandler
            // to avoid duplicate notes and provide better summary content
        }
        catch (error) {
            Logger.error('[FILE_STORAGE] Failed to save complete call data', {
                callId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    // Save just transcript (for interim updates)
    async saveTranscript(callId, transcript, role, isFinal) {
        try {
            const dateStr = this.getDateString();
            const dayDir = path.join(this.baseDir, dateStr);
            this.ensureDirectoryExists(dayDir);
            const fileName = `${callId}_transcript.txt`;
            const filePath = path.join(dayDir, fileName);
            const timestamp = this.getTimestamp();
            const content = [
                `=== TRANSCRIPT UPDATE ===`,
                `Timestamp: ${timestamp}`,
                `Call ID: ${callId}`,
                `Role: ${role || 'unknown'}`,
                `Is Final: ${isFinal ? 'YES' : 'NO'}`,
                ``,
                transcript,
                ``,
                `=== END ===`,
                ``
            ].join('\n');
            if (isFinal) {
                await fs.promises.writeFile(filePath, content, 'utf8');
            }
            else {
                const separator = fs.existsSync(filePath) ? '\n---\n' : '';
                await fs.promises.appendFile(filePath, separator + content, 'utf8');
            }
            Logger.info('[FILE_STORAGE] Transcript saved', {
                callId,
                role,
                isFinal,
                filePath,
            });
        }
        catch (error) {
            Logger.error('[FILE_STORAGE] Failed to save transcript', {
                callId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
