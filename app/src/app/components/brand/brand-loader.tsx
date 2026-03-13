"use client";

import Image from "next/image";

export default function BrandLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5">
      <div className="flex items-center gap-3">
        <div className="animate-[fadeIn_0.45s_ease-out_forwards]">
          <Image
            src="/brand/brand-icon-1.svg"
            alt="Brand icon 1"
            width={60}
            height={60}
          />
        </div>

        <div className="opacity-0 animate-[fadeIn_0.45s_ease-out_0.2s_forwards]">
          <Image
            src="/brand/brand-icon-2.svg"
            alt="Brand icon 2"
            width={52}
            height={52}
          />
        </div>

        <div className="opacity-0 animate-[fadeIn_0.45s_ease-out_0.4s_forwards]">
          <Image
            src="/brand/brand-icon-3.svg"
            alt="Brand icon 3"
            width={60}
            height={60}
          />
        </div>

        <div className="opacity-0 animate-[fadeIn_0.45s_ease-out_0.6s_forwards]">
          <div className="inline-block animate-[halfSpin_0.6s_ease-out_0.9s_forwards]">
            <Image
              src="/brand/brand-icon-4.svg"
              alt="Brand icon 4"
              width={60}
              height={60}
            />
          </div>
        </div>
        {label ? <p className="text-sm text-white/45">{label}</p> : null}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes halfSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(180deg);
          }
        }
      `}</style>
    </div>
  );
}
