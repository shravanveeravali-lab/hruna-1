import Image from "next/image";
import Link from "next/link";

export function AuthShell({
  children,
  image = "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&q=80",
  imageAlt = "Editorial fashion photography — fabric and craftsmanship detail",
  quote = "“Every garment begins as a private conversation between vision and craft.”",
}: {
  children: React.ReactNode;
  image?: string;
  imageAlt?: string;
  quote?: string;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 md:px-20 py-16">
        <Link href="/" className="font-display text-2xl mb-16">LILIRVE</Link>
        <div className="w-full max-w-sm mx-auto lg:mx-0">{children}</div>
      </div>
      <div className="relative hidden lg:block">
        <Image src={image} alt={imageAlt} fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
        <p className="absolute bottom-16 left-16 right-16 text-white font-display text-2xl italic leading-snug">
          {quote}
        </p>
      </div>
    </div>
  );
}
