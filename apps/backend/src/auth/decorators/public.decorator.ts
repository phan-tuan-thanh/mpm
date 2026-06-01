import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key cho @Public() decorator
 * Guard sử dụng key này qua Reflector để xác định endpoint public
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() decorator — đánh dấu endpoint không yêu cầu authentication
 *
 * Khi endpoint được đánh dấu @Public(), JWT Auth Guard sẽ bỏ qua
 * xác thực Access Token và cho phép request đi qua.
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('health')
 * healthCheck() { return { status: 'ok' }; }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
