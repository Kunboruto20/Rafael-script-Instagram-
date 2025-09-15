/**
 * Logger Utility
 * Provides structured logging with different levels and formatting
 */

const fs = require('fs');
const path = require('path');

class Logger {
    constructor(module = 'Yowsup2', level = 'info') {
        this.module = module;
        this.level = level;
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        this.colors = {
            error: '\x1b[31m', // Red
            warn: '\x1b[33m',  // Yellow
            info: '\x1b[36m',  // Cyan
            debug: '\x1b[90m', // Gray
            reset: '\x1b[0m'   // Reset
        };
        
        // Create logs directory if it doesn't exist
        this.logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
        
        // Set up log file
        this.logFile = path.join(this.logsDir, `yowsup2-${new Date().toISOString().split('T')[0]}.log`);
    }
    
    /**
     * Log a message with specified level
     */
    log(level, message, ...args) {
        if (this.levels[level] > this.levels[this.level]) {
            return;
        }
        
        const timestamp = new Date().toISOString();
        const formattedMessage = this.formatMessage(level, timestamp, message, ...args);
        
        // Console output with colors
        console.log(formattedMessage);
        
        // File output without colors
        this.writeToFile(this.formatMessage(level, timestamp, message, ...args, true));
    }
    
    /**
     * Format log message
     */
    formatMessage(level, timestamp, message, ...args) {
        const levelUpper = level.toUpperCase().padEnd(5);
        const moduleStr = `[${this.module}]`.padEnd(15);
        const timeStr = timestamp.split('T')[1].split('.')[0];
        
        let formatted = `${timeStr} ${levelUpper} ${moduleStr} ${message}`;
        
        if (args.length > 0) {
            formatted += ' ' + args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
        }
        
        return formatted;
    }
    
    /**
     * Write to log file
     */
    writeToFile(message) {
        try {
            fs.appendFileSync(this.logFile, message + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    
    /**
     * Error level logging
     */
    error(message, ...args) {
        this.log('error', message, ...args);
    }
    
    /**
     * Warning level logging
     */
    warn(message, ...args) {
        this.log('warn', message, ...args);
    }
    
    /**
     * Info level logging
     */
    info(message, ...args) {
        this.log('info', message, ...args);
    }
    
    /**
     * Debug level logging
     */
    debug(message, ...args) {
        this.log('debug', message, ...args);
    }
    
    /**
     * Set log level
     */
    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.level = level;
        } else {
            throw new Error(`Invalid log level: ${level}`);
        }
    }
    
    /**
     * Get current log level
     */
    getLevel() {
        return this.level;
    }
    
    /**
     * Check if level is enabled
     */
    isLevelEnabled(level) {
        return this.levels[level] <= this.levels[this.level];
    }
    
    /**
     * Create child logger with module name
     */
    child(module) {
        return new Logger(module, this.level);
    }
    
    /**
     * Get log file path
     */
    getLogFile() {
        return this.logFile;
    }
    
    /**
     * Clear log file
     */
    clearLogFile() {
        try {
            fs.writeFileSync(this.logFile, '');
        } catch (error) {
            console.error('Failed to clear log file:', error);
        }
    }
    
    /**
     * Get log file size
     */
    getLogFileSize() {
        try {
            const stats = fs.statSync(this.logFile);
            return stats.size;
        } catch (error) {
            return 0;
        }
    }
    
    /**
     * Rotate log file if it's too large
     */
    rotateLogFile(maxSize = 10 * 1024 * 1024) { // 10MB
        try {
            if (this.getLogFileSize() > maxSize) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const rotatedFile = path.join(this.logsDir, `yowsup2-${timestamp}.log`);
                fs.renameSync(this.logFile, rotatedFile);
                this.logFile = path.join(this.logsDir, `yowsup2-${new Date().toISOString().split('T')[0]}.log`);
                this.info('Log file rotated');
            }
        } catch (error) {
            console.error('Failed to rotate log file:', error);
        }
    }
}

module.exports = Logger;