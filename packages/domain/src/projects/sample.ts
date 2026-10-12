import { PageId, ProjectId } from './Project';
import type { Page, PageColor, PageIcon, Project } from './Project';

/**
 * Sample project used until the projects API exists.
 * Flagged with isSample so the UI labels it as sample content.
 */

const UPDATED = '2026-10-01T12:00:00.000Z';

interface SeedTopic {
  title: string;
  content: string;
  studied?: boolean;
}

interface SeedModule {
  title: string;
  color: PageColor;
  icon: PageIcon;
  content: string;
  topics: SeedTopic[];
}

const slug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const page = (title: string, content: string, parentId: string | null, extra: Partial<Page> = {}): Page => ({
  id: PageId.make(slug(title)),
  title,
  content,
  studied: false,
  updatedAt: UPDATED,
  parentId: parentId === null ? null : PageId.make(parentId),
  ...extra,
});

function build(id: string, title: string, description: string, intro: string, rootLook: Pick<Page, 'color' | 'icon'>, modules: SeedModule[]): Project {
  const root = page(title, intro, null, rootLook);
  const pages: Page[] = [root];
  for (const m of modules) {
    const module = page(m.title, m.content, root.id, { color: m.color, icon: m.icon });
    pages.push(module);
    for (const t of m.topics) pages.push(page(t.title, t.content, module.id, { studied: t.studied ?? false }));
  }
  return { id: ProjectId.make(id), title, description, pages, rootPageId: root.id, isSample: true };
}

export const sampleProject: Project = build(
  'nestjs',
  'NestJS',
  'From the basics to advanced: learning the NestJS framework by building real applications.',
  'NestJS is a Node.js framework for building server-side applications, organised in modules, controllers and providers.\n\nhttps://docs.nestjs.com',
  { color: 'red', icon: 'server' },
  [
    {
      title: 'Fundamentals',
      color: 'teal',
      icon: 'book',
      content: 'What Nest is, how to start a project, and the shape of a Nest app.',
      topics: [
        { title: 'What is NestJS', content: 'A framework on top of Express (or Fastify) with TypeScript, decorators and dependency injection.', studied: true },
        { title: 'Installation and setup', content: '`npm i -g @nestjs/cli` then `nest new my-app`.', studied: true },
        { title: 'Project structure', content: '`main.ts` boots the app, `app.module.ts` is the root module, each feature gets its own folder.', studied: true },
        { title: 'CLI and commands', content: '`nest generate module users`, `nest g controller users`, `nest g service users`.', studied: true },
      ],
    },
    {
      title: 'Modules',
      color: 'blue',
      icon: 'cube',
      content: 'Modules group controllers and providers; `imports` and `exports` decide what other modules can use.',
      topics: [
        { title: 'Module system', content: 'Every app has a root module; features live in their own modules.' },
        { title: 'Controllers', content: 'Classes with `@Controller()` that map routes to handler methods.' },
        { title: 'Dependency Injection', content: 'Nest builds and hands over instances declared as providers, so classes ask for what they need in the constructor.' },
      ],
    },
    {
      title: 'Providers',
      color: 'violet',
      icon: 'box',
      content:
        'Providers are the base of Nest\'s dependency injection: services, repositories and helpers shared across the app.\n\nThey build on [[Dependency Injection]], and authentication signs tokens with a provider: see [[JWT]].',
      topics: [
        { title: 'What providers are', content: 'Any class with `@Injectable()` registered in a module\'s `providers`.' },
        { title: 'Custom providers', content: '`useValue`, `useClass` and `useExisting` replace or alias what gets injected.' },
        { title: 'Scopes', content: 'Default (singleton), `REQUEST` and `TRANSIENT`.' },
        { title: 'Factory providers', content: '`useFactory` builds the value from other providers, e.g. a config-driven client.' },
      ],
    },
    {
      title: 'Database',
      color: 'orange',
      icon: 'database',
      content: 'Persisting data with an ORM, and keeping the schema in step with the code.',
      topics: [
        { title: 'TypeORM / Prisma', content: 'Two common choices; Prisma generates a typed client from its schema.', studied: true },
        { title: 'Migrations', content: 'Versioned schema changes applied in order.' },
        { title: 'Entities and relations', content: 'One-to-many, many-to-many, and how to load them.' },
        { title: 'Transactions', content: 'Group writes so they all apply or none do.' },
      ],
    },
    {
      title: 'Advanced',
      color: 'grape',
      icon: 'rocket',
      content: 'Beyond a single HTTP app.',
      topics: [
        { title: 'Microservices', content: 'Transports such as TCP, Redis and NATS.' },
        { title: 'Queues and brokers', content: 'Background jobs with BullMQ; messages with RabbitMQ or Kafka.' },
        { title: 'Cache and performance', content: '`CacheModule`, interceptors and profiling.' },
        { title: 'Deploy and production', content: 'Build, environment config, health checks.' },
      ],
    },
    {
      title: 'Authentication',
      color: 'indigo',
      icon: 'lock',
      content: 'Who the user is, and what they may do.',
      topics: [
        { title: 'JWT', content: 'Signed tokens carrying the user id; `@nestjs/jwt` provides `JwtService`.' },
        { title: 'Guards', content: 'Decide whether a request reaches the handler: `CanActivate`.' },
        { title: 'Roles and permissions', content: 'A guard that reads roles set with a custom decorator.' },
        { title: 'Passport', content: 'Strategies (local, jwt, oauth) wired through `@nestjs/passport`.' },
      ],
    },
    {
      title: 'Requests',
      color: 'pink',
      icon: 'network',
      content: 'The path of a request: routing, validation, transformation, errors.',
      topics: [
        { title: 'HTTP and routing', content: '`@Get()`, `@Post()`, route params and query strings.', studied: true },
        { title: 'Validation (DTOs)', content: '`class-validator` decorators on DTO classes, checked by `ValidationPipe`.', studied: true },
        { title: 'Pipes', content: 'Transform or validate input before the handler runs.' },
        { title: 'Exception filters', content: 'Turn thrown errors into HTTP responses.' },
      ],
    },
    {
      title: 'Testing',
      color: 'yellow',
      icon: 'flask',
      content: 'Unit and end-to-end tests with Jest.',
      topics: [
        { title: 'Unit tests', content: '`Test.createTestingModule` with mocked providers.' },
        { title: 'E2E tests', content: 'Boot the app and call it with supertest.' },
        { title: 'Mocks and stubs', content: 'Replace providers with `useValue` in the testing module.' },
        { title: 'Jest with NestJS', content: 'The default test runner of `nest new`.' },
      ],
    },
  ],
);

export const sampleProjects: ReadonlyArray<Project> = [sampleProject];

export function findSampleProject(projectId: string): Project | undefined {
  return sampleProjects.find((p) => p.id === projectId);
}
