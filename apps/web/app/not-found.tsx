import Link from "next/link";
export default function NotFound() {
  return <div className="wrap py-24 flex flex-col items-center text-center gap-4"><span className="eyebrow">404</span><h1 className="h-display text-4xl">We couldn’t find that page</h1><p className="text-muted">It may have been moved, or the review isn’t published.</p><Link href="/explore" className="btn btn-primary">Explore verified experiences</Link></div>;
}
