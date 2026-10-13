import { HttpException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { Cause, Effect, Exit, Layer, ManagedRuntime, Predicate, Schema, SchemaAST } from 'effect';
import type { UserId } from '@wisepath/domain/auth';
import { CurrentUser } from '../application/CurrentUser';
import { ProjectStore } from '../application/ProjectStore';
import { SqlProjectStore } from './SqlProjectStore';

/** Everything project use cases need, built once for the app */
const ProjectsLive = Layer.mergeAll(SqlProjectStore);

/**
 * EffectRuntime
 * Runs project use cases (Effect programs) for Nest's controllers. A domain
 * error becomes the HTTP status it declares with its own JSON body
 * (`{ "_tag": "TitleTaken", "title": "JWT" }`), as the contract describes;
 * anything else is logged and answered with a 500.
 */
@Injectable()
export class EffectRuntime implements OnModuleDestroy {
  private readonly logger = new Logger('EffectRuntime');
  private readonly runtime = ManagedRuntime.make(ProjectsLive);

  async run<A, E>(
    program: Effect.Effect<A, E, CurrentUser | ProjectStore>,
    user: { readonly id: UserId },
    success?: Schema.Codec<A, unknown>,
  ): Promise<unknown> {
    const exit = await this.runtime.runPromiseExit(program.pipe(Effect.provideService(CurrentUser, user)));
    if (Exit.isSuccess(exit)) return success ? Schema.encodeUnknownSync(success)(exit.value) : exit.value;
    const error = Cause.findErrorOption(exit.cause);
    if (error._tag === 'Some' && Predicate.hasProperty(error.value, '_tag')) {
      const schema = (error.value as object).constructor as unknown as Schema.Codec<unknown, unknown>;
      const status = SchemaAST.resolve(schema.ast)?.httpApiStatus as number | undefined;
      if (status !== undefined) throw new HttpException(Schema.encodeUnknownSync(schema)(error.value) as object, status);
    }
    this.logger.error(Cause.pretty(exit.cause));
    throw new InternalServerErrorException();
  }

  async onModuleDestroy() {
    await this.runtime.dispose();
  }
}
