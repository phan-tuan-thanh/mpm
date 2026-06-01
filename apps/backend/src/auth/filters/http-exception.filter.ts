import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Optional,
} from '@nestjs/common';
import { Request, Response } from 'express';
import type { ErrorResponse } from '@mpm/shared-types';
import { AuditService } from '../../audit/audit.service';
import { AuthEvent } from '../constants/auth-events';

/**
 * HTTP status code → default error code mapping
 * Sử dụng khi exception response không chứa errorCode
 */
const STATUS_TO_ERROR_CODE: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.GONE]: 'GONE',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
  [HttpStatus.BAD_GATEWAY]: 'BAD_GATEWAY',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
};

/**
 * Interface cho exception response object từ NestJS HttpException
 */
interface ExceptionResponseObject {
  message?: string | string[];
  error?: string;
  errorCode?: string;
  statusCode?: number;
}

/**
 * Global Exception Filter — xử lý tập trung tất cả HttpException
 *
 * Chức năng:
 * - Format error response theo ErrorResponse interface thống nhất
 * - Trigger audit log cho 401/403 responses (non-blocking)
 * - Ẩn stack trace trong production, hiển thị trong development
 *
 * Đăng ký global trong AppModule hoặc main.ts:
 *   app.useGlobalFilters(new HttpExceptionFilter(auditService));
 *
 * Requirements: 1.7, 8.3, 8.8
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly isProduction: boolean;

  constructor(
    @Optional() @Inject(AuditService) private readonly auditService: AuditService | null,
  ) {
    this.isProduction = process.env['NODE_ENV'] === 'production';
  }

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Extract thông tin từ exception response
    const { message, error, errorCode } = this.extractResponseDetails(
      exceptionResponse,
      statusCode,
    );

    // Xây dựng ErrorResponse theo interface thống nhất
    const errorResponse: ErrorResponse = {
      statusCode,
      error,
      message,
      errorCode,
      timestamp: new Date().toISOString(),
    };

    // Trong development: thêm stack trace để debug
    if (!this.isProduction) {
      (errorResponse as ErrorResponse & { stack?: string }).stack =
        exception.stack ?? undefined;
    }

    // Trigger audit log cho 401/403 (non-blocking)
    if (statusCode === HttpStatus.UNAUTHORIZED || statusCode === HttpStatus.FORBIDDEN) {
      this.triggerAuditLog(request, statusCode, errorCode);
    }

    // Set Retry-After header cho 429 responses
    if (statusCode === HttpStatus.TOO_MANY_REQUESTS) {
      const retryAfter = typeof exceptionResponse === 'object'
        ? (exceptionResponse as { retryAfter?: number }).retryAfter
        : undefined;
      if (retryAfter) {
        response.setHeader('Retry-After', String(retryAfter));
      }
    }

    response.status(statusCode).json(errorResponse);
  }

  /**
   * Extract message, error text, và errorCode từ exception response
   *
   * NestJS HttpException có thể trả về:
   * - string: dùng làm message
   * - object: có thể chứa message, error, errorCode
   */
  private extractResponseDetails(
    exceptionResponse: string | object,
    statusCode: number,
  ): { message: string; error: string; errorCode: string } {
    // Trường hợp response là string đơn giản
    if (typeof exceptionResponse === 'string') {
      return {
        message: exceptionResponse,
        error: this.getHttpStatusText(statusCode),
        errorCode: this.getDefaultErrorCode(statusCode),
      };
    }

    // Trường hợp response là object (phổ biến nhất)
    const responseObj = exceptionResponse as ExceptionResponseObject;

    // Message: có thể là string hoặc array (validation errors)
    let message: string;
    if (Array.isArray(responseObj.message)) {
      message = responseObj.message.join('; ');
    } else {
      message = responseObj.message ?? this.getHttpStatusText(statusCode);
    }

    // Error text: HTTP status text
    const error = responseObj.error ?? this.getHttpStatusText(statusCode);

    // ErrorCode: ưu tiên từ exception response, fallback sang default
    const errorCode = responseObj.errorCode ?? this.getDefaultErrorCode(statusCode);

    return { message, error, errorCode };
  }

  /**
   * Trigger audit log cho 401/403 responses — NON-BLOCKING
   *
   * Ghi audit log với event type ACCESS_DENIED.
   * Không block error response — fire-and-forget.
   */
  private triggerAuditLog(
    request: Request,
    statusCode: number,
    errorCode: string,
  ): void {
    if (!this.auditService) {
      return;
    }

    // Extract user ID từ request nếu có (đã được guard gắn vào)
    const user = (request as Request & { user?: { id?: string } }).user;
    const userId = user?.id ?? null;

    const ipAddress =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      request.ip ??
      'unknown';
    const userAgent = (request.headers['user-agent'] as string) ?? 'unknown';

    // Non-blocking audit log
    this.auditService.log(
      AuthEvent.ACCESS_DENIED,
      userId,
      ipAddress,
      userAgent,
      {
        statusCode,
        errorCode,
        method: request.method,
        path: request.path,
      },
    );
  }

  /**
   * Lấy HTTP status text từ status code
   */
  private getHttpStatusText(statusCode: number): string {
    const statusTexts: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Bad Request',
      [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
      [HttpStatus.FORBIDDEN]: 'Forbidden',
      [HttpStatus.NOT_FOUND]: 'Not Found',
      [HttpStatus.CONFLICT]: 'Conflict',
      [HttpStatus.GONE]: 'Gone',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
      [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
      [HttpStatus.BAD_GATEWAY]: 'Bad Gateway',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
    };

    return statusTexts[statusCode] ?? 'Error';
  }

  /**
   * Lấy default error code từ status code
   * Sử dụng khi exception response không chứa errorCode riêng
   */
  private getDefaultErrorCode(statusCode: number): string {
    return STATUS_TO_ERROR_CODE[statusCode] ?? `HTTP_${statusCode}`;
  }
}
