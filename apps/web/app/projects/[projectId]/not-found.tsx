import Link from 'next/link';

export default function ProjectNotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="font-star text-3xl italic">Project not found</h1>
        <p className="text-[15px] text-muted-foreground">
          This project doesn&apos;t exist or the link is wrong. Your projects are listed on the dashboard.
        </p>
        <Link href="/dashboard" className="inline-block font-bold underline underline-offset-4">
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
