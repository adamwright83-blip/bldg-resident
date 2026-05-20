import { useState, type MutableRefObject, type PointerEvent } from "react";

type PenCharmProps = {
  hitboxRef: MutableRefObject<HTMLButtonElement | null>;
  onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  penAssetSrc: string;
  shadowRef: MutableRefObject<HTMLSpanElement | null>;
  visualRef: MutableRefObject<HTMLElement | null>;
};

export function PenCharm({
  hitboxRef,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  penAssetSrc,
  shadowRef,
  visualRef,
}: PenCharmProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <button
      ref={(node) => {
        hitboxRef.current = node;
      }}
      aria-label="Pull pen to tell the building"
      className="absolute left-0 top-0 z-40 flex items-center justify-center rounded-full border-0 bg-transparent p-0 text-[#2C2824] outline-none focus-visible:ring-2 focus-visible:ring-[#C9A96E]/65"
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        willChange: "transform",
      }}
      type="button"
    >
      <span
        ref={(node) => {
          shadowRef.current = node;
        }}
        className="pointer-events-none absolute left-1/2 top-1/2 rounded-full bg-black/30 blur-[5px]"
        style={{ willChange: "transform, opacity" }}
      />
      {imageFailed ? (
        <span
          ref={(node) => {
            visualRef.current = node;
          }}
          className="pointer-events-none absolute left-1/2 top-1/2 block overflow-hidden rounded-full bg-current"
          style={{
            transformOrigin: "50% 8%",
            willChange: "transform, opacity, filter",
          }}
        />
      ) : (
        <img
          ref={(node) => {
            visualRef.current = node;
          }}
          alt=""
          className="pointer-events-none absolute left-1/2 top-1/2 select-none"
          draggable={false}
          onError={() => setImageFailed(true)}
          src={penAssetSrc}
          style={{
            objectFit: "fill",
            transformOrigin: "50% 8%",
            willChange: "transform, opacity, filter",
          }}
        />
      )}
    </button>
  );
}
