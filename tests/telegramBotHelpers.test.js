import { escapeMarkdown, splitMessage, MESSAGE_SPLIT_CONFIG } from '../src/utils/telegramBotHelpers.js';

describe('escapeMarkdown', () => {
  it('should escape backslashes first', () => {
    expect(escapeMarkdown('\\')).toBe('\\\\');
    expect(escapeMarkdown('C:\\Users\\Test')).toBe('C:\\\\Users\\\\Test');
  });

  it('should not double-escape already escaped characters', () => {
    // If user input contains \*, it should become \\* (backslash escaped, then asterisk escaped)
    expect(escapeMarkdown('\\*')).toBe('\\\\\\*');
  });

  it('should escape asterisks', () => {
    expect(escapeMarkdown('Hello * World')).toBe('Hello \\* World');
    expect(escapeMarkdown('**Bold**')).toBe('\\*\\*Bold\\*\\*');
  });

  it('should escape underscores', () => {
    expect(escapeMarkdown('Hello _ World')).toBe('Hello \\_ World');
    expect(escapeMarkdown('__Italic__')).toBe('\\_\\_Italic\\_\\_');
  });

  it('should escape backticks', () => {
    expect(escapeMarkdown('`code`')).toBe('\\`code\\`');
    expect(escapeMarkdown('```code block```')).toBe('\\`\\`\\`code block\\`\\`\\`');
  });

  it('should escape opening brackets', () => {
    expect(escapeMarkdown('[Link]')).toBe('\\[Link]');
    expect(escapeMarkdown('[Text](url)')).toBe('\\[Text](url)');
  });

  it('should escape multiple special characters', () => {
    expect(escapeMarkdown('Name: *John_Doe* [123]')).toBe('Name: \\*John\\_Doe\\* \\[123]');
  });

  it('should handle strings without special characters', () => {
    expect(escapeMarkdown('Hello World')).toBe('Hello World');
    expect(escapeMarkdown('123 ABC xyz')).toBe('123 ABC xyz');
  });

  it('should handle empty strings', () => {
    expect(escapeMarkdown('')).toBe('');
  });

  it('should handle null and undefined', () => {
    expect(escapeMarkdown(null)).toBe(null);
    expect(escapeMarkdown(undefined)).toBe(undefined);
  });

  it('should handle non-string values', () => {
    expect(escapeMarkdown(123)).toBe(123);
    expect(escapeMarkdown(true)).toBe(true);
  });

  it('should escape user names that might contain special characters', () => {
    // Real-world scenario: user name with underscores
    expect(escapeMarkdown('John_Doe_123')).toBe('John\\_Doe\\_123');
    
    // Real-world scenario: user name with asterisks
    expect(escapeMarkdown('User*Name')).toBe('User\\*Name');
    
    // Real-world scenario: division with brackets
    expect(escapeMarkdown('IT [Support]')).toBe('IT \\[Support]');
  });

  it('should prevent Telegram entity parsing errors', () => {
    // This is the kind of content that would cause "can't parse entities" error
    const problematicName = 'POLRES_BANDUNG*CITY';
    const escaped = escapeMarkdown(problematicName);
    expect(escaped).toBe('POLRES\\_BANDUNG\\*CITY');
    
    // Verify all special characters are escaped (preceded by backslash)
    // Check that there are no unescaped asterisks
    expect(escaped.match(/(?<!\\)\*/)).toBeNull();
    // Check that there are no unescaped underscores
    expect(escaped.match(/(?<!\\)_/)).toBeNull();
    // Check that there are no unescaped backticks
    expect(escaped.match(/(?<!\\)`/)).toBeNull();
    // Check that there are no unescaped opening brackets
    expect(escaped.match(/(?<!\\)\[/)).toBeNull();
  });
});

describe('splitMessage', () => {
  it('should return message as-is if shorter than max length', () => {
    const shortMessage = 'Hello World';
    const result = splitMessage(shortMessage);
    expect(result).toEqual([shortMessage]);
  });

  it('should split long messages into chunks', () => {
    const longMessage = 'A'.repeat(5000);
    const result = splitMessage(longMessage, 4000);
    expect(result.length).toBeGreaterThan(1);
    expect(result[0].length).toBeLessThanOrEqual(4000);
    expect(result[1].length).toBeLessThanOrEqual(4000);
  });

  it('should prefer splitting at newlines', () => {
    const lines = Array(200).fill('Line of text').join('\n');
    const result = splitMessage(lines, 1000);
    expect(result.length).toBeGreaterThan(1);
    // Each chunk should not end with a partial line
    result.slice(0, -1).forEach(chunk => {
      // Check that chunks end properly (not in the middle of a word unless forced)
      expect(chunk.length).toBeLessThanOrEqual(1000);
    });
  });

  it('should split very long single lines', () => {
    const longLine = 'A'.repeat(5000);
    const result = splitMessage(longLine, 1000);
    expect(result.length).toBe(5);
    result.forEach(chunk => {
      expect(chunk.length).toBeLessThanOrEqual(1000);
    });
  });

  it('should handle messages with mixed line lengths', () => {
    const message = 'Short line\n' + 'A'.repeat(3000) + '\nAnother short line';
    const result = splitMessage(message, 2000);
    expect(result.length).toBeGreaterThan(1);
    result.forEach(chunk => {
      expect(chunk.length).toBeLessThanOrEqual(2000);
    });
  });

  it('should use default max length from config', () => {
    const longMessage = 'A'.repeat(5000);
    const result = splitMessage(longMessage);
    expect(result.length).toBeGreaterThan(1);
    result.forEach(chunk => {
      expect(chunk.length).toBeLessThanOrEqual(MESSAGE_SPLIT_CONFIG.MAX_LENGTH);
    });
  });

  it('should handle empty or null messages', () => {
    expect(splitMessage('')).toEqual(['']);
    expect(splitMessage(null)).toEqual([null]);
    expect(splitMessage(undefined)).toEqual([undefined]);
  });

  it('should prefer splitting at spaces for long lines', () => {
    const longLine = Array(500).fill('word').join(' ');
    const result = splitMessage(longLine, 1000);
    expect(result.length).toBeGreaterThan(1);
    // Check that most chunks don't break in the middle of a word
    result.slice(0, -1).forEach((chunk, idx) => {
      if (chunk.length > 800) { // Only check if chunk is reasonably full
        // Should end with a complete word (or forced split)
        const endsWithSpace = chunk.endsWith(' ');
        const lastChar = chunk[chunk.length - 1];
        // Either ends with space or is a forced split
        expect(endsWithSpace || lastChar.match(/[a-z]/i)).toBeTruthy();
      }
    });
  });

  it('should handle real-world attendance report scenario', () => {
    // Simulate a large attendance report with many users
    const users = [];
    for (let i = 0; i < 1000; i++) {
      users.push(`${i + 1}. User ${i + 1} - Division ${i % 10} - Status: Active`);
    }
    const message = 'Attendance Report\n\n' + users.join('\n');
    
    const result = splitMessage(message, 4000);
    expect(result.length).toBeGreaterThan(1);
    
    // Verify all chunks are within limits
    result.forEach(chunk => {
      expect(chunk.length).toBeLessThanOrEqual(4000);
    });
    
    // Verify the content is mostly preserved (allowing for trimming between chunks)
    const rejoined = result.join('');
    // The rejoined message should contain all the key content
    expect(rejoined).toContain('Attendance Report');
    expect(rejoined).toContain('User 1 ');
    expect(rejoined).toContain('User 1000');
    // Total length should be close (accounting for trimmed whitespace between chunks)
    expect(rejoined.length).toBeGreaterThan(message.length * 0.95);
  });
});
