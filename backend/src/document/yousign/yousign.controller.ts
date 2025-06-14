import {
    Controller,
    Post,
    Body,
    Headers,
    RawBodyRequest,
    Req,
    BadRequestException,
  } from '@nestjs/common';
  import { YousignWebhookDto } from './dto/yousign-webhook.dto';
  import { YousignService } from './yousign.service';
  import { DocumentService } from '../document.service';
  import { Request } from 'express';
  
  /**
   * Important : dans main.ts, configure le bodyParser pour fournir req.rawBody
   *   app.useBodyParser('json', { verify: (req, res, buf) => (req.rawBody = buf) })
   */
  @Controller('documents/yousign')
  export class YousignController {
    constructor(
      private readonly yousign: YousignService,
      private readonly docs: DocumentService,
    ) {}
  
    @Post('webhook')
    async handleWebhook(
      @Req() req: RawBodyRequest<Request>,
      @Body() dto: YousignWebhookDto,
      @Headers('x-yousign-hook-signature') sig: string,
    ) {
      // 1. Vérifier HMAC si secret défini
      const raw = (req as any).rawBody?.toString() ?? '';
      if (!this.yousign.verifyWebhookSignature(raw, sig)) {
        throw new BadRequestException('Invalid webhook signature');
      }
  
      // 2. Propager l’event dans DocumentService
      await this.docs.handleWebhook(dto.eventName, dto.payload);
  
      return { ok: true };
    }
  }
  