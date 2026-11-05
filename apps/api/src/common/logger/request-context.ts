import { AsyncLocalStorage } from 'async_hooks';
import * as winston from 'winston';

interface RequestContext {
  requestId: string;
}

/**
 * AsyncLocalStorage wrapper for propagating requestId through
 * the request lifecycle, including into Winston log entries.
 */
const als = new AsyncLocalStorage<RequestContext>();

export function setRequestId(requestId: string): void {
  als.enterWith({ requestId });
}

export function getRequestId(): string | undefined {
  return als.getStore()?.requestId;
}

/**
 * Custom Winston format that appends requestId from ALS to each log entry.
 */
export function requestContextFormat() {
  return winston.format((info: winston.Logform.TransformableInfo) => {
    const requestId = getRequestId();
    if (requestId) {
      info['requestId'] = requestId;
    }
    return info;
  })();
}
