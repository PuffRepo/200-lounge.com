import Link from 'next/link';

export default function SeasonPreservingLink({ to, children }) {

  // If 'to' is not provided, don't render anything.
  if (!to) return null;

  let href = { pathname: to, query: {} };
  href.query.season = '9';

  return <Link href={href}>{children}</Link>;
}
