import type { TeamLite } from "@/lib/worldcup-types";
import { cn } from "@/lib/utils";

interface Props {
  team: TeamLite;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  align?: "left" | "right";
  dimmed?: boolean;
  className?: string;
}

export function TeamBadge({
  team,
  size = "md",
  showName = true,
  align = "left",
  dimmed = false,
  className,
}: Props) {
  const px = size === "sm" ? 18 : size === "lg" ? 28 : 22;
  const isPlaceholder = !!team.placeholder;
  const label = isPlaceholder ? team.placeholder! : team.name;

  return (
    <div
      className={cn(
        "flex items-center gap-2 min-w-0",
        align === "right" && "flex-row-reverse text-right",
        dimmed && "opacity-60",
        className,
      )}
    >
      <span
        className="inline-flex items-center justify-center rounded-full bg-paper-deep shrink-0 overflow-hidden border border-border"
        style={{ width: px, height: px }}
        aria-hidden
      >
        {team.logo ? (
          <img
            src={team.logo}
            alt=""
            width={px}
            height={px}
            className="object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-[10px] font-semibold text-ink-soft">
            {team.abbreviation.slice(0, 2)}
          </span>
        )}
      </span>
      {showName && (
        <span
          className={cn(
            "truncate font-medium",
            size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm",
            isPlaceholder && "text-ink-soft italic font-normal",
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}
