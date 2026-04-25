import { avatarHue, initials } from '../lib/format';

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const hue = avatarHue(name);
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold text-white shrink-0"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 30) % 360} 70% 45%))`,
        fontSize: size * 0.38,
      }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
