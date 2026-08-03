export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // body is `h-full overflow-hidden flex flex-col`, so the marketing shell must
  // be its own scroll container for the page to scroll at all.
  return (
    <div className="marketing-scroll min-h-0 flex-1 overflow-y-auto">
      {children}
    </div>
  );
}
