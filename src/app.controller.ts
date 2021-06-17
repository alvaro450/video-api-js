import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('video')
  async getVideoThumbnail(@Query('url') url: string) {
    return await this.appService.getThumbnailFromVideo(url);
  }
}
