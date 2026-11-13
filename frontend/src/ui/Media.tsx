import { useState, type HTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { renderIcon, type IconLike } from "./icon";
import { pick, type Loose } from "./props";
import { cover, type ImageTopic } from "./imagery";

type Ratio = "16x9" | "4x3" | "square" | "free";

const ratioClass: Record<Ratio, string> = {
  "16x9": "media-16x9",
  "4x3": "media-4x3",
  square: "media-square",
  free: "",
};

/**
 * Extends the frame's own div attributes, so a photo can be made a control.
 *
 * A closed prop list made `<RemoteImage onClick={...}>` a type error, and a
 * clickable thumbnail opening a detail view is an ordinary thing to build.
 * Card and the Field controls already forward their element's attributes;
 * this follows them rather than being the exception.
 */
export interface RemoteImageProps extends HTMLAttributes<HTMLDivElement> {
  /** Nullable: an absent image falls back to the frame's own gradient. */
  src: string | null | undefined;
  alt: string;
  ratio?: Loose<Ratio>;
  /** Laid over the photo behind a readability scrim — a title, a badge row. */
  overlay?: ReactNode;
  /**
   * A mark shown in the frame when there is no photo to show.
   *
   * Accepted for the same reason every other surface accepts `icon`, and
   * genuinely useful here: a product with no image reads better as a frame
   * holding a package glyph than as an empty gradient.
   */
  icon?: IconLike;
  representative?: boolean;
  representativeNote?: string;
}

/**
 * A photograph that cannot break the page.
 *
 * The frame reserves its space from the first paint and carries a gradient of
 * its own, so a slow network shows a tinted panel and a dead URL keeps showing
 * one — never a torn icon, and never a layout shift.
 */
export function RemoteImage({
  src,
  alt,
  ratio = "16x9",
  overlay,
  icon,
  representative = false,
  representativeNote = "Representative image — not the actual item",
  className = "",
  ...rest
}: RemoteImageProps) {
  const [loaded, setLoaded] = useState<{src: typeof src; status: "ready" | "failed"} | null>(null);
  const state = loaded && loaded.src === src ? loaded.status : "loading";
  const blank = !src || state === "failed";

  // A frame with a click handler is a control: it gets the pointer and the
  // hover lift, and it gets them from the handler being there rather than
  // from the caller remembering to pass a class as well.
  const classes = [
    "media",
    pick(ratioClass, ratio, "16x9"),
    rest.onClick ? "media-interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} data-image-state={!src ? "missing" : state} {...rest}>
      {blank && icon ? <span className="media-mark">{renderIcon(icon, 28)}</span> : null}
      {blank && alt ? <span className="media-fallback" role="img" aria-label={`${alt} — image unavailable`}>Image unavailable</span> : null}
      {src && state !== "failed" && (
        <img
          key={src}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          data-loading={state === "loading" ? "true" : undefined}
          onLoad={() => setLoaded({src, status: "ready"})}
          onError={() => setLoaded({src, status: "failed"})}
        />
      )}
      {overlay && <div className="media-overlay">{overlay}</div>}
      {representative && !blank && <span className="media-representative">{representativeNote}</span>}
    </div>
  );
}

/** Deterministic hue from a name, so one person is one colour everywhere. */
function hue(name: string): number {
  let total = 0;
  for (let i = 0; i < name.length; i += 1) total = (total + name.charCodeAt(i) * 31) % 360;
  return total;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

/**
 * A face, or its initials on a colour derived from the name. Always renders
 * something, so a user row never has a hole in it.
 */
export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** Nullable: an unnamed record still gets a placeholder rather than a hole. */
  name: string | null | undefined;
  src?: string | null;
  size?: Loose<"sm" | "md" | "lg">;
}

const avatarSize: Record<"sm" | "md" | "lg", string> = {
  sm: "avatar avatar-sm",
  md: "avatar",
  lg: "avatar avatar-lg",
};

export function Avatar({ name, src, size = "md", className = "", style, ...rest }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const cls = [pick(avatarSize, size, "md"), className].filter(Boolean).join(" ");
  name = name?.trim() || "?";

  if (src && !failed) {
    return (
      <span className={cls} title={name} style={style} {...rest}>
        <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} />
      </span>
    );
  }

  const h = hue(name);
  return (
    <span
      className={cls}
      title={name}
      style={{ background: `hsl(${h} 70% 92%)`, color: `hsl(${h} 55% 32%)`, ...style }}
      aria-label={name}
      {...rest}
    >
      {initials(name)}
    </span>
  );
}

export interface AvatarStackProps extends HTMLAttributes<HTMLDivElement> {
  names: (string | null | undefined)[];
}

export function AvatarStack({ names, className = "", ...rest }: AvatarStackProps) {
  return (
    <div className={`avatar-stack ${className}`.trim()} {...rest}>
      {names.map((name, i) => (
        <Avatar key={`${name ?? "?"}-${i}`} name={name} size="sm" />
      ))}
    </div>
  );
}

/**
 * The banner a screen opens with: a colour mesh, a film of grain, and room
 * for a headline, a sentence and a couple of actions.
 */
/** `title` is this component's own node, so the section's string title is dropped. */
export interface HeroProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** A mark above the headline — a lucide component or an element. */
  icon?: IconLike;
  /**
   * Put a photograph of the application's subject behind the banner.
   *
   * A topic name (`"restaurant"`) is the usual form and is resolved through
   * the curated library; a URL is accepted too, for an image the user gave
   * you. The text stays readable either way — the photo sits under a scrim
   * built from the theme's own ground, so the banner works in both themes.
   */
  image?: Loose<ImageTopic>;
  children?: ReactNode;
}

export function Hero({
  title,
  subtitle,
  actions,
  icon,
  image,
  className = "",
  style,
  children,
  ...rest
}: HeroProps) {
  // A bare word is a topic; anything with a scheme or a slash is already a
  // URL. Accepting both means a caller never has to know which one they hold.
  const src = image ? (/^(https?:|\/|data:)/.test(image) ? image : cover(image)) : undefined;
  const classes = ["hero", src ? "hero-photo" : "mesh noise", "animate-in", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={classes}
      style={src ? ({ "--hero-image": `url("${src}")`, ...style } as CSSProperties) : style}
      {...rest}
    >
      {icon ? <div className="hero-icon">{renderIcon(icon, 24)}</div> : null}
      <h1 className="hero-title">{title}</h1>
      {subtitle && <p className="hero-body">{subtitle}</p>}
      {actions && <div className="row-wrap">{actions}</div>}
      {children}
    </section>
  );
}
