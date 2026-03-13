import Image from "next/image";
import Link from "next/link";

export default function BrandHeader({
  subtitle,
  href = "/",
}: {
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Link href={href} className="inline-flex items-center gap-3">
        <Image
          src="/brand/Pixelplus+Logo.png"
          alt="Pixelplus"
          width={220}
          height={48}
          className="h-10 w-auto object-contain"
          priority
        />
      </Link>

      {subtitle ? (
        <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50 sm:block">
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}
