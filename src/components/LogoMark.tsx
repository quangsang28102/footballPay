import Image from 'next/image';

type LogoMarkProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export default function LogoMark({ size = 40, className, priority = false }: LogoMarkProps) {
  return (
    <Image
      src="/football-pay-mark.svg"
      alt="Football Pay"
      width={size}
      height={size}
      priority={priority}
      className={className}
    />
  );
}
