import { escapeMarkdown } from '../src/utils/telegramBotHelpers.js';

describe('escapeMarkdown', () => {
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
