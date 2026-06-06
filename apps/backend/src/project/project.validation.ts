import { BadRequestException } from '@nestjs/common';

export function validateTimezone(tz: string): void {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
  } catch (e) {
    throw new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: `Invalid IANA timezone: ${tz}`,
      errorCode: 'INVALID_TIMEZONE',
      timestamp: new Date().toISOString(),
    });
  }
}

export function validateEmoji(emoji: string | null): void {
  if (emoji && emoji.length > 30) {
    throw new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Emoji or icon name must be at most 30 characters',
      errorCode: 'INVALID_EMOJI',
      timestamp: new Date().toISOString(),
    });
  }
}
