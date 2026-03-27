import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen flex-col px-6 py-8">
        <div>
          <Image
            src="/brand/Pixelplus-Logo.png"
            alt="Pixelplus"
            width={180}
            height={32}
            className="h-8 w-auto object-contain"
            priority
          />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="flex max-w-md flex-col items-center text-center">
            <Image
              src="/brand/brand-icon-4.svg"
              alt="Pixelplus icon"
              width={72}
              height={72}
              className="mb-6 h-[72px] w-auto object-contain"
              priority
            />

            <h1 className="text-6xl font-semibold uppercase tracking-tight text-white sm:text-7xl">
              Whoops
            </h1>

            <p className="mt-5 text-base text-white/75">
              Deze pagina bestaat niet (meer)
            </p>

            <Link
              href="/admin"
              className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#8E939D] pl-6 pr-2 py-2 text-base font-medium text-white transition hover:bg-[#9aa0aa]"
            >
              Homepage
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                <ArrowRight className="h-5 w-5" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
