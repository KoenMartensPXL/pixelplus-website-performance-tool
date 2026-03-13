import Image from "next/image";

export default function BrandIconMark({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/brand/PixelplusIconLogo.png"
      alt="Pixelplus icon"
      width={size}
      height={size}
      className="object-contain"
      priority
    />
  );
}
