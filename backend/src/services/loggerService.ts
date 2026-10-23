import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export class LoggerService {
  private logsDir: string;

  constructor() {
    this.logsDir = process.env.LOGS_DIR
      ? path.resolve(process.env.LOGS_DIR)
      : path.resolve(process.cwd(), 'logs');

    this.ensureLogsDirectory();
  }

  private ensureLogsDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Generates the daily log filename based on the current date: YYYY-MM-DD.log
   */
  public getTodayLogFileName(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}.log`;
  }

  /**
   * Returns the absolute path to the current day's log file.
   */
  public getTodayLogPath(): string {
    this.ensureLogsDirectory();
    return path.join(this.logsDir, this.getTodayLogFileName());
  }

  /**
   * Extracts the client IP address from the Express request.
   */
  public getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',');
      const candidate = ips[0].trim();
      if (candidate) return this.normalizeIp(candidate);
    }

    const socketIp = req.socket?.remoteAddress || req.ip || 'unknown';
    return this.normalizeIp(socketIp);
  }

  /**
   * Normalizes IPv6 loopback and mapped IPv4 addresses.
   */
  private normalizeIp(ip: string): string {
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
      return '127.0.0.1';
    }
    if (ip.startsWith('::ffff:')) {
      return ip.slice(7);
    }
    return ip;
  }

  /**
   * Writes a line to today's log file and the console.
   */
  public writeLog(level: LogLevel, message: string, clientIp: string = 'N/A'): void {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [IP: ${clientIp}] [${level}] ${message}\n`;

    // Console output for development visibility
    const consolePrefix = `[${timestamp}] [IP: ${clientIp}] [${level}]`;
    if (level === 'ERROR') {
      console.error(consolePrefix, message);
    } else if (level === 'WARN') {
      console.warn(consolePrefix, message);
    } else {
      console.log(consolePrefix, message);
    }

    // Append to current day's log file
    const logFilePath = this.getTodayLogPath();
    fs.appendFile(logFilePath, logLine, 'utf8', err => {
      if (err) {
        console.error('[LoggerService] Failed to write to log file:', err);
      }
    });
  }

  /**
   * Formats and logs an HTTP request completion.
   */
  public logHttpRequest(req: Request, res: Response, durationMs: number): void {
    const ip = this.getClientIp(req);
    const method = req.method;
    const url = req.originalUrl || req.url;
    const statusCode = res.statusCode;
    const user = (req as any).user?.username ? `(User: ${(req as any).user.username}) ` : '';

    const level: LogLevel = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
    const message = `${method} ${url} ${statusCode} - ${durationMs}ms ${user}`.trim();

    this.writeLog(level, message, ip);
  }

  public info(message: string, clientIp?: string): void {
    this.writeLog('INFO', message, clientIp);
  }

  public warn(message: string, clientIp?: string): void {
    this.writeLog('WARN', message, clientIp);
  }

  public error(message: string, clientIp?: string, error?: Error): void {
    const errDetails = error ? ` - ${error.stack || error.message}` : '';
    this.writeLog('ERROR', `${message}${errDetails}`, clientIp);
  }

  /**
   * Read contents of today's log file.
   */
  public readTodayLogs(): string {
    const filePath = this.getTodayLogPath();
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    return '';
  }
}

export const loggerService = new LoggerService();

