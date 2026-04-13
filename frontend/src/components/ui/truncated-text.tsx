import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  className?: string;
  showTooltip?: boolean;
  tooltipClassName?: string;
}

export function TruncatedText({
  text,
  maxLength = 50,
  className,
  showTooltip = true,
  tooltipClassName
}: TruncatedTextProps) {
  const [isTruncated, setIsTruncated] = useState(false);
  const [showTooltipState, setShowTooltipState] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textRef.current) {
      const element = textRef.current;
      setIsTruncated(element.scrollWidth > element.clientWidth);
    }
  }, [text]);

  const handleMouseEnter = () => {
    if (isTruncated && showTooltip) {
      setShowTooltipState(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltipState(false);
  };

  const truncatedText = text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;

  return (
    <span className="relative inline-block">
      <span
        ref={textRef}
        className={cn(
          "inline-block overflow-hidden text-ellipsis whitespace-nowrap",
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={!showTooltip ? text : undefined}
      >
        {truncatedText}
      </span>

      {showTooltipState && isTruncated && (
        <div
          ref={tooltipRef}
          className={cn(
            "fixed z-50 px-3 py-2 text-sm text-foreground bg-background border border-border rounded-md shadow-lg",
            "animate-in fade-in-0 zoom-in-95 duration-200",
            "max-w-xs break-words",
            tooltipClassName
          )}
          style={{
            left: '50%',
            top: '100%',
            transform: 'translateX(-50%) translateY(8px)',
            pointerEvents: 'none'
          }}
        >
          {text}
          {/* Arrow */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full">
            <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-background"></div>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-border"></div>
          </div>
        </div>
      )}
    </span>
  );
}

// Higher-order component for automatic truncation
export function withTruncation<P extends object>(
  Component: React.ComponentType<P>,
  truncateProps: {
    textKey: keyof P;
    maxLength?: number;
    showTooltip?: boolean;
  }
) {
  return (props: P) => {
    const { textKey, maxLength = 50, showTooltip = true } = truncateProps;
    const text = String(props[textKey] || '');

    const newProps = { ...props };
    (newProps as Record<string, unknown>)[textKey as string] = (
      <TruncatedText
        text={text}
        maxLength={maxLength}
        showTooltip={showTooltip}
      />
    );

    return <Component {...newProps} />;
  };
}