import { ratingColor } from "@/lib/constants";

interface RatingBadgeProps {
  rating: number;
}

export function RatingBadge({ rating }: RatingBadgeProps) {
  const color = ratingColor(rating);
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold"
      style={{ color, background: color + "18" }}
    >
      {rating}
    </span>
  );
}
