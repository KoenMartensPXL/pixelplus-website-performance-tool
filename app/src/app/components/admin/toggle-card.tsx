"use client";

import { Check } from "lucide-react";

export default function ToggleCard({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full rounded-xl border p-4 text-left transition ${
        checked
          ? "border-[#D6CEC2] bg-[#F3ECE2]"
          : "border-[#E5DED3] bg-white hover:bg-[#F8F3EC]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium text-[#1A1A1A]">{title}</div>
          <p className="mt-1 text-sm text-[#6B6B6B]">{description}</p>
        </div>

        <div
          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
            checked
              ? "border-black bg-black text-white"
              : "border-[#D6CEC2] bg-white text-transparent"
          }`}
        >
          <Check className="h-3.5 w-3.5" />
        </div>
      </div>
    </button>
  );
}
