import { PageId, ProjectId } from './Project';
import type { Page, PageColor, PageIcon, Project } from './Project';

/**
 * The sample map every account starts with: a copy of it is made once, with
 * fresh ids, and from then on it is the learner's own map like any other.
 * Pages connect only through the [[links]] in their text, so each seed page
 * lists the pages it leads to; the order of those links orders the map.
 */

const UPDATED = '2026-10-01T12:00:00.000Z';

interface Seed {
  title: string;
  text: string;
  studied?: boolean;
  module?: { color: PageColor; icon: PageIcon };
  /** Pages this one leads to, written as [[links]] at the end of its text */
  next?: Seed[];
}

const slug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function flatten(seed: Seed, out: Page[] = []): Page[] {
  const next = seed.next ?? [];
  const links = next.length ? `\n\n${next.map((n) => `- [[${n.title}]]`).join('\n')}` : '';
  out.push({
    id: PageId.make(slug(seed.title)),
    title: seed.title,
    content: seed.text + links,
    studied: seed.studied ?? false,
    updatedAt: UPDATED,
    ...(seed.module ? { module: true, ...seed.module } : {}),
  });
  for (const n of next) flatten(n, out);
  return out;
}

const nest: Seed = {
  title: 'NestJS',
  text: 'NestJS is a Node.js framework for building server-side applications, organised in modules, controllers and providers.\n\nhttps://docs.nestjs.com',
  module: { color: 'red', icon: 'server' },
  next: [
    {
      title: 'Fundamentals',
      text: 'What Nest is, how to start a project, and the shape of a Nest app.',
      studied: true,
      module: { color: 'teal', icon: 'book' },
      next: [
        { title: 'What is NestJS', text: 'A framework on top of Express (or Fastify) with TypeScript, decorators and dependency injection.', studied: true },
        { title: 'Installation and setup', text: '`npm i -g @nestjs/cli` then `nest new my-app`.', studied: true },
        { title: 'Project structure', text: '`main.ts` boots the app, `app.module.ts` is the root module, each feature gets its own folder.', studied: true },
        { title: 'CLI and commands', text: '`nest generate module users`, `nest g controller users`, `nest g service users`.', studied: true },
      ],
    },
    {
      title: 'Modules',
      text: 'Modules group controllers and providers; `imports` and `exports` decide what other modules can use.',
      module: { color: 'blue', icon: 'cube' },
      next: [
        { title: 'Module system', text: 'Every app has a root module; features live in their own modules.' },
        { title: 'Controllers', text: 'Classes with `@Controller()` that map routes to handler methods.' },
        { title: 'Dependency Injection', text: 'Nest builds and hands over instances declared as providers, so classes ask for what they need in the constructor.' },
      ],
    },
    {
      title: 'Providers',
      text: "Providers are the base of Nest's dependency injection: services, repositories and helpers shared across the app. They build on [[Dependency Injection]].",
      module: { color: 'violet', icon: 'box' },
      next: [
        { title: 'What providers are', text: "Any class with `@Injectable()` registered in a module's `providers`." },
        { title: 'Custom providers', text: '`useValue`, `useClass` and `useExisting` replace or alias what gets injected; authentication registers `JwtService` this way, see [[JWT]].' },
        { title: 'Scopes', text: 'Default (singleton), `REQUEST` and `TRANSIENT`.' },
        { title: 'Factory providers', text: '`useFactory` builds the value from other providers, e.g. a config-driven client.' },
      ],
    },
    {
      title: 'Database',
      text: 'Persisting data with an ORM, and keeping the schema in step with the code.',
      module: { color: 'orange', icon: 'database' },
      next: [
        { title: 'TypeORM / Prisma', text: 'Two common choices; Prisma generates a typed client from its schema.', studied: true },
        { title: 'Migrations', text: 'Versioned schema changes applied in order.' },
        { title: 'Entities and relations', text: 'One-to-many, many-to-many, and how to load them.' },
        { title: 'Transactions', text: 'Group writes so they all apply or none do.' },
      ],
    },
    {
      title: 'Advanced',
      text: 'Beyond a single HTTP app.',
      module: { color: 'grape', icon: 'rocket' },
      next: [
        {
          title: 'Microservices',
          text: 'Nest apps that talk over a transport instead of HTTP.',
          next: [{ title: 'Transports', text: 'TCP, Redis, NATS, RabbitMQ and Kafka, chosen per microservice.' }],
        },
        { title: 'Queues and brokers', text: 'Background jobs with BullMQ; messages with RabbitMQ or Kafka.' },
        { title: 'Cache and performance', text: '`CacheModule`, interceptors and profiling.' },
        { title: 'Deploy and production', text: 'Build, environment config, health checks.' },
      ],
    },
    {
      title: 'Authentication',
      text: 'Who the user is, and what they may do.',
      module: { color: 'indigo', icon: 'lock' },
      next: [
        {
          title: 'JWT',
          text: 'Signed tokens carrying the user id; `@nestjs/jwt` provides `JwtService`.',
          next: [{ title: 'Refresh tokens', text: 'A long-lived token that gets a new access token without logging in again.' }],
        },
        { title: 'Guards', text: 'Decide whether a request reaches the handler: `CanActivate`.' },
        { title: 'Roles and permissions', text: 'A guard that reads roles set with a custom decorator.' },
        { title: 'Passport', text: 'Strategies (local, jwt, oauth) wired through `@nestjs/passport`.' },
      ],
    },
    {
      title: 'Requests',
      text: 'The path of a request: routing, validation, transformation, errors.',
      module: { color: 'pink', icon: 'network' },
      next: [
        { title: 'HTTP and routing', text: '`@Get()`, `@Post()`, route params and query strings.', studied: true },
        { title: 'Validation (DTOs)', text: '`class-validator` decorators on DTO classes, checked by `ValidationPipe`.', studied: true },
        { title: 'Pipes', text: 'Transform or validate input before the handler runs.' },
        { title: 'Exception filters', text: 'Turn thrown errors into HTTP responses.' },
      ],
    },
    {
      title: 'Testing',
      text: 'Unit and end-to-end tests with Jest.',
      module: { color: 'yellow', icon: 'flask' },
      next: [
        { title: 'Unit tests', text: '`Test.createTestingModule` with mocked providers.' },
        { title: 'E2E tests', text: 'Boot the app and call it with supertest.' },
        { title: 'Mocks and stubs', text: 'Replace providers with `useValue` in the testing module.' },
        { title: 'Jest with NestJS', text: 'The default test runner of `nest new`.' },
      ],
    },
  ],
};

const pages = flatten(nest);
// The root links its modules; its own studied flag never counts
const { module: _module, ...root } = pages[0];
pages[0] = root;

export const sampleProject: Project = {
  id: ProjectId.make('nestjs'),
  title: 'NestJS',
  description: 'From the basics to advanced: learning the NestJS framework by building real applications.',
  pages,
  rootPageId: pages[0].id,
};
