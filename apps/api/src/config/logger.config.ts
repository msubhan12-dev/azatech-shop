import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import { requestContextFormat } from '../common/logger/request-context';

export function createWinstonLogger(): WinstonModuleOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    transports: [
      new winston.transports.Console({
        format: isProduction
          ? winston.format.combine(
              winston.format.timestamp(),
              requestContextFormat(),
              winston.format.json(),
            )
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp({ format: 'HH:mm:ss' }),
              requestContextFormat(),
              winston.format.printf(({ timestamp, level, message, context, requestId, ...meta }) => {
                const ctx = context ? `[${context}]` : '';
                const rid = requestId ? `[${requestId}]` : '';
                const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                return `${timestamp} ${level} ${ctx}${rid} ${message}${metaStr}`;
              }),
            ),
      }),
    ],
  };
}
