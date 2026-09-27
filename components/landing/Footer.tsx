import Image from "next/image";
import Link from "next/link";
import { ArrowRight01Icon, ArrowUpRight01Icon } from "hugeicons-react";
import "./footer.css";

const sections = [
  { title: "Explore & connect", links: [
    ["Your feed", "/feed"], ["Find a Pro", "/find-a-pro"], ["Groups", "/groups"],
    ["Pro Network", "/pro-networks"], ["Pro Talks", "/pro-talks"], ["Pro Hub", "/pro-hub"],
  ] },
  { title: "Learn & grow", links: [
    ["Courses", "/courses"], ["Toolkits", "/toolkits"], ["Practice bundles", "/toolkits#bundles"],
    ["My courses", "/my-courses"], ["Pro Marketing", "/pro-marketing"], ["Ask Atlas AI", "https://alwaysaskatlas.com/"],
  ] },
  { title: "For your practice", links: [
    ["Marketplace", "/marketplace"], ["Pricing & plans", "/upgrade"], ["Get listed", "/upgrade"],
    ["Seller dashboard", "/seller-dashboard"], ["My purchases", "/marketplace-purchases"],
    ["Become an affiliate", "https://affiliate.taxcomppro.com"],
  ] },
  { title: "Company & support", links: [
    ["About us", "/about"], ["Contact us", "/contact"], ["My profile", "/my-profile"],
    ["Security", "/security"], ["Community guidelines", "/community-guidelines"],
  ] },
] as const;

export default function PublicFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-intro">
          <div>
            <p className="site-footer-eyebrow">Your next step starts here</p>
            <h2>Build your expertise. <span>Grow your circle.</span></h2>
            <p>Learning, resources, and connections for every stage of your tax career.</p>
          </div>
          <Link href="/upgrade" className="site-footer-cta">Explore membership <ArrowRight01Icon size={19} aria-hidden="true" /></Link>
        </div>

        <div className="site-footer-directory">
          <div className="site-footer-brand">
            <Link href="/" aria-label="Tax Compliance Pro home" className="site-footer-logo">
              <Image src="/logo.webp" alt="Tax Compliance Pro" width={240} height={80} className="site-footer-logo-light" />
              <Image src="/logo_dark.webp" alt="Tax Compliance Pro" width={240} height={80} className="site-footer-logo-dark" />
            </Link>
            <p>The professional community for tax experts across America.</p>
            <Link href="/contact" className="site-footer-contact">Let’s connect <ArrowUpRight01Icon size={18} aria-hidden="true" /></Link>
          </div>
          <nav className="site-footer-navigation" aria-label="Footer navigation">
            {sections.map((section) => (
              <section key={section.title} className="site-footer-section" aria-label={section.title}>
                <h3>{section.title}</h3>
                <ul>
                  {section.links.map(([label, href]) => (
                    <li key={label}>
                      <Link href={href} {...(href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                        {label}{href.startsWith("https://") && <ArrowUpRight01Icon size={14} aria-label="Opens in a new tab" />}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </nav>
        </div>

        <div className="site-footer-bottom">
          <p>© {new Date().getFullYear()} TaxCompPro. All rights reserved.</p>
          <nav aria-label="Legal information">
            <Link href="/terms">Terms of service</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/cookie-policy">Cookie policy</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
