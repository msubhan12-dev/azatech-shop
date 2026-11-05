import { SetMetadata } from '@nestjs/common';
import type { AuditAction } from '@prisma/client';

export interface AuditDecoratorOptions {
  action: AuditAction;
  entityType: string;
  getEntityId?: (response: any) => string;
  logErrors?: boolean;
}

/**
 * @Audit() decorator for marking routes that should log audit events
 * 
 * Usage:
 * @Audit({
 *   action: AuditAction.DELETE,
 *   entityType: 'Product',
 *   getEntityId: (response) => response.id.toString(),
 * })
 * @Delete(':id')
 * deleteProduct(@Param('id') id: string) { ... }
 */
export const Audit = (options: AuditDecoratorOptions) =>
  SetMetadata('audit', options);
