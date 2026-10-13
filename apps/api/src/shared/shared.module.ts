import { Global, Module } from '@nestjs/common';
import { EffectRuntime } from './infrastructure/EffectRuntime';

/** The Effect runtime every module's controllers and guards run their use cases on */
@Global()
@Module({
  providers: [EffectRuntime],
  exports: [EffectRuntime],
})
export class SharedModule {}
