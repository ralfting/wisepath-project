import { HttpException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { Cause, Effect, Exit, Layer, ManagedRuntime, Predicate, Schema, SchemaAST } from 'effect';
import type { PasswordHasher } from '../../auth/application/PasswordHasher';
import type { UserStore } from '../../auth/application/UserStore';
import { BcryptPasswordHasher } from '../../auth/infrastructure/BcryptPasswordHasher';
import { DrizzleUserStore } from '../../auth/infrastructure/DrizzleUserStore';
import type { PageFetcher } from '../../links/application/PageFetcher';
import { SafePageFetcher } from '../../links/infrastructure/SafePageFetcher';
import type { ProjectStore } from '../../projects/application/ProjectStore';
import { DrizzleProjectStore } from '../../projects/infrastructure/DrizzleProjectStore';
import type { ReviewStore } from '../../review/application/ReviewStore';
import { DrizzleReviewStore } from '../../review/infrastructure/DrizzleReviewStore';
import { DatabaseLive } from './database/Database';
import { SqlLive } from './Sql';

/** Everything the use cases need, built once for the app over one connection pool */
const AppLive = Layer.mergeAll(DrizzleProjectStore, DrizzleReviewStore, DrizzleUserStore, BcryptPasswordHasher, SafePageFetcher).pipe(
  Layer.provide(DatabaseLive),
  Layer.provide(SqlLive),
);

/** The services a use case may ask for; anything per request (like the current user) is provided by its caller */
export type AppServices = ProjectStore | ReviewStore | UserStore | PasswordHasher | PageFetcher;

/**
 * EffectRuntime
 * Runs use cases (Effect programs) for Nest's controllers and guards. A domain
 * error becomes the HTTP status it declares with its own JSON body
 * (`{ "_tag": "TitleTaken", "title": "JWT" }`), as the contract describes;
 * anything else is logged and answered with a 500.
 */
@Injectable()
export class EffectRuntime implements OnModuleDestroy {
  private readonly logger = new Logger('EffectRuntime');
  private readonly runtime = ManagedRuntime.make(AppLive);

  /** The program's result, or the HTTP error it ends in */
  async run<A, E>(program: Effect.Effect<A, E, AppServices>): Promise<A> {
    const exit = await this.runtime.runPromiseExit(program);
    if (Exit.isSuccess(exit)) return exit.value;

    const error = Cause.findErrorOption(exit.cause);
    if (error._tag === 'Some' && Predicate.hasProperty(error.value, '_tag')) {
      // A domain error's class is its schema, which says the HTTP status it is answered with
      const schema = (error.value as object).constructor as unknown as Schema.Codec<unknown, unknown>;
      const status = SchemaAST.resolve(schema.ast)?.httpApiStatus as number | undefined;
      if (status !== undefined) {
        throw new HttpException(Schema.encodeUnknownSync(schema)(error.value) as object, status);
      }
    }

    this.logger.error(Cause.pretty(exit.cause));
    throw new InternalServerErrorException();
  }

  /** The program's result as the contract's JSON, or the HTTP error it ends in */
  async respond<A, E>(program: Effect.Effect<A, E, AppServices>, success?: Schema.Codec<A, unknown>): Promise<unknown> {
    const value = await this.run(program);
    return success ? Schema.encodeUnknownSync(success)(value) : value;
  }

  async onModuleDestroy() {
    await this.runtime.dispose();
  }
}
