import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../audit/audit.service';

/**
 * Audit Interceptor
 * Captures route metadata and user context for optional audit logging
 * Can be triggered by @Audit() decorator on routes that need auditing
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, path, user, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';

    // Get metadata if decorator is used
    const auditMetadata = Reflect.getMetadata('audit', context.getHandler());

    return next.handle().pipe(
      tap(
        async (response: any) => {
          // Only log if @Audit() decorator is present
          if (auditMetadata) {
            try {
              // For login, extract user from response; for other routes, use request.user
              const userId = user?.id || response?.data?.user?.id;
              
              await this.auditService.log({
                action: auditMetadata.action,
                entityType: auditMetadata.entityType,
                entityId: auditMetadata.getEntityId?.(response) || '',
                userId: userId ? BigInt(userId.toString()) : undefined,
                details: {
                  method,
                  path,
                  statusCode: context.switchToHttp().getResponse().statusCode,
                },
                ipAddress: ip,
                userAgent,
              });
            } catch (error) {
              // Don't throw on audit error
              console.error('Failed to log audit event:', error);
            }
          }
        },
        (error) => {
          // Optionally log failed operations
          if (auditMetadata && auditMetadata.logErrors) {
            try {
              const userId = request.user?.id;
              this.auditService.log({
                action: auditMetadata.action,
                entityType: auditMetadata.entityType,
                entityId: auditMetadata.getEntityId?.() || '',
                userId: userId ? BigInt(userId.toString()) : undefined,
                details: {
                  method,
                  path,
                  error: error.message,
                },
                ipAddress: ip,
                userAgent,
              }).catch(() => {
                // Silently ignore audit log errors
              });
            } catch (e) {
              // Double catch to ensure no errors escape
            }
          }
        },
      ),
    );
  }
}
