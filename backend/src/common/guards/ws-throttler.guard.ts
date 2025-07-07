import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {
  /**
   * Override to extract the client socket as request identifier and return dummy res
   */
  protected getRequestResponse(context: ExecutionContext): {
    req: any;
    res: any;
  } {
    const wsCtx = context.switchToWs();
    const client = wsCtx.getClient();
    return { req: client, res: { header: () => {}, setHeader: () => {} } };
  }
}
