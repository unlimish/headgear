const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '../logs');
const KEEP_DAYS = 7;

// Store original console methods to prevent infinite loops and ensure stdout/stderr flow
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error
};

function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

/**
 * Gets the current formatted JST date and time components.
 */
function getJstDateTime() {
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  const hour = parts.find(p => p.type === 'hour').value;
  const minute = parts.find(p => p.type === 'minute').value;
  const second = parts.find(p => p.type === 'second').value;

  return {
    dateStr: `${year}-${month}-${day}`, // YYYY-MM-DD
    timeStr: `${hour}:${minute}:${second}` // HH:MM:SS
  };
}

/**
 * Format log message arguments into a single string.
 */
function formatArguments(args) {
  return args.map(arg => {
    if (arg instanceof Error) {
      return arg.stack || arg.message;
    }
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
}

/**
 * Writes a formatted log entry to the log file.
 */
function writeToLogFile(level, args) {
  try {
    ensureLogsDir();
    const { dateStr, timeStr } = getJstDateTime();
    const message = formatArguments(args);
    const logLine = `[${dateStr} ${timeStr} JST] [${level}] ${message}\n`;
    
    const logFile = path.join(LOGS_DIR, `${dateStr}.log`);
    fs.appendFileSync(logFile, logLine, 'utf8');
  } catch (error) {
    // Write directly to original console error to avoid recursion
    originalConsole.error('[Logger Error] Failed to write log to file:', error);
  }
}

/**
 * Purges logs older than keepDays (default 7 days).
 */
function purgeOldLogs(keepDays = KEEP_DAYS) {
  try {
    ensureLogsDir();
    const files = fs.readdirSync(LOGS_DIR);
    const now = new Date();
    
    // Set time to midnight JST for consistent comparison
    const jstTodayStr = getJstDateTime().dateStr;
    const todayMidnight = new Date(`${jstTodayStr}T00:00:00+09:00`);
    const cutoffTime = todayMidnight.getTime() - (keepDays * 24 * 60 * 60 * 1000);
    
    let deletedCount = 0;

    files.forEach(file => {
      // Expect YYYY-MM-DD.log
      const match = file.match(/^(\d{4}-\d{2}-\d{2})\.log$/);
      if (match) {
        const fileDateStr = match[1];
        const fileDate = new Date(`${fileDateStr}T00:00:00+09:00`);
        
        if (fileDate.getTime() < cutoffTime) {
          const filePath = path.join(LOGS_DIR, file);
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
    });

    if (deletedCount > 0) {
      originalConsole.log(`[Logger] Purged ${deletedCount} old log files older than ${keepDays} days.`);
      writeToLogFile('INFO', [`Purged ${deletedCount} old log files older than ${keepDays} days.`]);
    }
  } catch (error) {
    originalConsole.error('[Logger Error] Failed to purge old log files:', error);
  }
}

// Override global console methods
console.log = function(...args) {
  originalConsole.log.apply(console, args);
  writeToLogFile('INFO', args);
};

console.warn = function(...args) {
  originalConsole.warn.apply(console, args);
  writeToLogFile('WARN', args);
};

console.error = function(...args) {
  originalConsole.error.apply(console, args);
  writeToLogFile('ERROR', args);
};

module.exports = {
  purgeOldLogs,
  LOGS_DIR
};
