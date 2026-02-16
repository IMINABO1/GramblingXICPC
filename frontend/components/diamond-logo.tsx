import Image from "next/image";
import Link from "next/link";

export function DiamondLogo() {
  return (
    <Link href="/" className="group flex-shrink-0" aria-label="Home">
      <Image
        src="/logo.svg"
        alt="Gravenger"
        width={36}
        height={36}
        className="rounded transition-all group-hover:shadow-[0_0_14px_rgba(224,170,15,0.3)]"
        priority
      />
    </Link>
  );
}
