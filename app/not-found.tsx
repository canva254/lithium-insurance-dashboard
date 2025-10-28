export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/10 px-6">
      <div className="text-center">
        <h1 className="text-4xl font-semibold text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">The page you are looking for could not be found.</p>
      </div>
    </div>
  );
}
