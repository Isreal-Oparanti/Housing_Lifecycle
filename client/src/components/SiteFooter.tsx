import { Logo } from "./SiteHeader";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-muted sm:px-6 md:grid-cols-[1fr_2fr]">
        <div className="space-y-3">
          <Logo />
          <p>The real monthly cost of a rental, before you commit.</p>
        </div>
        <div className="space-y-3 text-xs leading-relaxed">
          <p>
            Council tax rates: Ministry of Housing, Communities and Local Government and Welsh Government, published
            annually, Open Government Licence v3.0. Postcode lookups via postcodes.io and street search via Ordnance Survey: contains OS data © Crown copyright
            and database right; contains Royal Mail data © Royal Mail copyright and database right; source: Office for
            National Statistics, Open Government Licence v3.0.
          </p>
          <p>
            TrueCost figures are guidance. Your council&apos;s bill is the final word. We are not affiliated with any
            council, government body or property portal.
          </p>
        </div>
      </div>
    </footer>
  );
}
