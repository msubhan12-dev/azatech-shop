import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    const path = request.path;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (data) => {
        try {
          const duration = Date.now() - startTime;

          // Log ALL requests (except health checks)
          if (path.includes('/health')) return;

          // Skip internal routes
          if (path.includes('/_next') || path.includes('/favicon')) return;

          // Determine action from method + path
          let action = '';
          let entityType = '';
          let entityId = '';
          let description = '';

          // LOGIN/LOGOUT
          if (path.includes('/auth/login')) {
            action = 'LOGIN';
            entityType = 'Auth';
            description = `User logged in`;
          } else if (path.includes('/auth/logout')) {
            action = 'LOGOUT';
            entityType = 'Auth';
            description = `User logged out`;
          } else if (path.includes('/auth/me')) {
            action = 'READ';
            entityType = 'Auth';
            description = `Fetched current user`;
          }
          // PRODUCTS
          else if (path.includes('/products')) {
            if (method === 'GET' && !path.match(/\/products\/\d+/)) {
              action = 'READ_LIST';
              entityType = 'Product';
              description = `Listed products`;
            } else if (method === 'GET') {
              action = 'READ';
              entityType = 'Product';
              const match = path.match(/\/products\/(\d+)/);
              entityId = match ? match[1] : '';
              description = `Viewed product #${entityId}`;
            } else if (method === 'POST') {
              action = 'CREATE';
              entityType = 'Product';
              description = `Created new product`;
            } else if (method === 'PUT') {
              action = 'UPDATE';
              entityType = 'Product';
              const match = path.match(/\/products\/(\d+)/);
              entityId = match ? match[1] : '';
              description = `Updated product #${entityId}`;
            } else if (method === 'DELETE') {
              action = 'DELETE';
              entityType = 'Product';
              const match = path.match(/\/products\/(\d+)/);
              entityId = match ? match[1] : '';
              description = `Deleted product #${entityId}`;
            }
          }
          // CUSTOMERS
          else if (path.includes('/customers')) {
            if (method === 'GET' && !path.match(/\/customers\/\d+/)) {
              action = 'READ_LIST';
              entityType = 'Customer';
              description = `Listed customers`;
            } else if (method === 'GET') {
              action = 'READ';
              entityType = 'Customer';
              const match = path.match(/\/customers\/(\d+)/);
              entityId = match ? match[1] : '';
              description = `Viewed customer #${entityId}`;
            } else if (method === 'POST') {
              action = 'CREATE';
              entityType = 'Customer';
              description = `Created new customer`;
            } else if (method === 'PUT') {
              action = 'UPDATE';
              entityType = 'Customer';
              const match = path.match(/\/customers\/(\d+)/);
              entityId = match ? match[1] : '';
              description = `Updated customer #${entityId}`;
            } else if (method === 'DELETE') {
              action = 'DELETE';
              entityType = 'Customer';
              const match = path.match(/\/customers\/(\d+)/);
              entityId = match ? match[1] : '';
              description = `Deleted customer #${entityId}`;
            }
          }
          // ORDERS
          else if (path.includes('/orders')) {
            if (method === 'GET' && !path.match(/\/orders\/\d+/)) {
              action = 'READ_LIST';
              entityType = 'Order';
              description = `Listed orders`;
            } else if (method === 'GET') {
              action = 'READ';
              entityType = 'Order';
              const match = path.match(/\/orders\/(\d+)/);
              entityId = match ? match[1] : '';
              description = `Viewed order #${entityId}`;
            } else if (method === 'POST' && path.includes('/pay')) {
              action = 'ORDER_PAID';
              entityType = 'Order';
              const match = path.match(/\/orders\/(\d+)/);
              entityId = match ? match[1] : '';
              description = `Marked order #${entityId} as paid`;
            } else if (method === 'POST' && path.includes('/ship')) {
              action = 'ORDER_SHIPPED';
              entityType = 'Order';
              const match = path.match(/\/orders\/(\d+)/);
              entityId = match ? match[1] : '';
              description = `Marked order #${entityId} as shipped`;
            } else if (method === 'POST' && path.includes('/complete')) {
              action = 'ORDER_COMPLETED';
              entityType = 'Order';
              const match = path.match(/\/orders\/(\d+)/);
              entityId = match ? match[1] : '';
              description = `Marked order #${entityId} as completed`;
            } else if (method === 'POST' && !path.match(/\/orders\/\d+/)) {
              action = 'CREATE';
              entityType = 'Order';
              description = `Created new order`;
            }
          }
          // REPORTS
          else if (path.includes('/reports')) {
            action = 'QUERY';
            entityType = 'Reports';
            if (path.includes('/sales')) description = `Viewed sales report`;
            else if (path.includes('/top-products')) description = `Viewed top products report`;
            else if (path.includes('/summary')) description = `Viewed summary report`;
            else description = `Accessed reports`;
          }
          // AUDIT/MONITORING
          else if (path.includes('/audit-logs')) {
            action = 'QUERY';
            entityType = 'Audit';
            description = `Accessed audit logs`;
          }

          // Only log if we have action
          if (action && entityType) {
            // Skip logging if no user (for public endpoints like login)
            // but still allow LOGIN action to be logged if it succeeds
            if (!user && action !== 'LOGIN') return;

            // For login, we need to check if the response has user data
            let userId: number | null = null;
            if (user?.id) {
              userId = Number(user.id);
            } else if (action === 'LOGIN' && data?.user?.id) {
              userId = Number(data.user.id);
            }

            // Only create audit log if we have a valid userId
            if (userId && userId > 0) {
              await this.prisma.auditLog.create({
                data: {
                  userId,
                  action,
                  entityType,
                  entityId: entityId || '',
                  metadata: JSON.stringify({
                    path,
                    method,
                    duration,
                    statusCode: 200,
                    description,
                    userId,
                    userEmail: user?.email || data?.user?.email,
                    timestamp: new Date().toISOString(),
                  }),
                },
              });
            }
          }
        } catch (error) {
          // Silently fail - don't break the request
          console.error('Audit logging failed:', error);
        }
      }),
      catchError((error) => {
        // Log errors too
        try {
          if (!path.includes('/health')) {
            const userId = user?.id ? Number(user.id) : null;
            if (userId && userId > 0) {
              this.prisma.auditLog
                .create({
                  data: {
                    userId,
                    action: 'ERROR',
                    entityType: 'Request',
                    entityId: '',
                    metadata: JSON.stringify({
                      path,
                      method,
                      error: error.message,
                      statusCode: error.status || 500,
                      timestamp: new Date().toISOString(),
                    }),
                  },
                })
                .catch(() => {});
            }
          }
        } catch (e) {
          // Ignore
        }
        return of(error);
      }),
    );
  }
}
