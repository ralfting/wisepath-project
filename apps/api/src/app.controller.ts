import { Controller, Get } from '@nestjs/common';
import { OpenApi } from 'effect/http-api';
import { WisePathApi } from '@wisepath/contract';
import { AppService } from './app.service';

/** Built once: the contract does not change while the API runs */
const openApi = OpenApi.fromApi(WisePathApi);

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /** The API described for any client (OpenAPI 3), generated from the shared contract */
  @Get('openapi.json')
  openApi() {
    return openApi;
  }
}
