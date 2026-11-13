"use client";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="wrap py-24 flex flex-col items-center text-center gap-4"><h1 className="h-display text-4xl">Something went wrong</h1><p className="text-muted max-w-md">{error.message?.length < 160 ? error.message : "Please try again in a moment."}</p><button className="btn btn-primary" onClick={reset}>Try again</button></div>;
}
