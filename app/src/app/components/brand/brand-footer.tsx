"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";

//laten renderen in browser
const BrandLoader = dynamic(() => import("./brand-loader"), {
  ssr: false,
});

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black text-white">
      <div className="mx-auto max-w-[1400px] px-10 py-24">
        <div className="flex flex-col gap-16 lg:flex-row lg:items-start lg:justify-between">
          <div className="grid grid-cols-1 gap-14 text-sm text-white sm:grid-cols-3">
            <div className="space-y-1">
              <div className="text-white">Vandaag bereikbaar</div>
              <div>van 8u30 tot 17u00</div>
            </div>

            <div className="space-y-1">
              <a
                href="tel:+31452051856"
                className="block text-white hover:text-white/80 underline-offset-4 transition hover:underline"
              >
                +31 (0)45 20 518 56
              </a>

              <a
                href="mailto:info@pixelplus.nl"
                className="block hover:text-white underline-offset-4 transition hover:underline"
              >
                info@pixelplus.nl
              </a>
            </div>

            <div className="space-y-1">
              <a
                href="https://maps.app.goo.gl/hhYUwLQXkqTtjJfi6"
                target="_blank"
                className="hover:text-white underline-offset-4 transition hover:underline"
              >
                Raadhuisstraat 12
                <br />
                6191 KB Beek NL
              </a>
            </div>
          </div>

          <div className="flex items-center justify-start lg:justify-end">
            <BrandLoader />
          </div>
        </div>

        <div className="my-10 h-px w-full" />

        <div className="flex flex-wrap items-center gap-10 text-xs text-white">
          <div className="flex items-center gap-8">
            <Link
              href="/privacy"
              className="hover:text-white underline-offset-4 transition hover:underline"
            >
              Privacy
            </Link>

            <Link
              href="/cookies"
              className="hover:text-white underline-offset-4 transition hover:underline"
            >
              Cookies
            </Link>

            <Link
              href="/voorwaarden"
              className="hover:text-white underline-offset-4 transition hover:underline"
            >
              Voorwaarden
            </Link>

            <span>KvK: 5138 4175</span>
            <span>BTW: NL8232 55669 B01</span>
          </div>

          <div className="h-15 w-px bg-white/40" />

          <div className="flex items-center gap-6">
            <Link
              href="https://www.linkedin.com/company/1700056"
              target="_blank"
              className="opacity-80 hover:opacity-100 transition"
            >
              <Image
                src="/brand/socials/linkedin.svg"
                alt="LinkedIn"
                width={28}
                height={28}
                className="h-5 w-auto"
              />
            </Link>

            <Link
              href="https://www.instagram.com/pixelplus_nl/"
              target="_blank"
              className="opacity-80 hover:opacity-100 transition"
            >
              <Image
                src="/brand/socials/instagram.svg"
                alt="Instagram"
                width={28}
                height={28}
                className="h-5 w-auto"
              />
            </Link>
          </div>

          <div className="h-15 w-px bg-white/40" />

          <div className="flex items-center gap-10">
            <Image
              src="/brand/partners/google-partner.svg"
              alt="Google Partner"
              width={120}
              height={24}
              className="h-4 w-auto opacity-80"
            />

            <Image
              src="/brand/partners/leadinfo.svg"
              alt="Leadinfo"
              width={100}
              height={24}
              className="h-4 w-auto opacity-80"
            />

            <Image
              src="/brand/partners/taggrs.svg"
              alt="Taggrs"
              width={80}
              height={24}
              className="h-4 w-auto opacity-80"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
