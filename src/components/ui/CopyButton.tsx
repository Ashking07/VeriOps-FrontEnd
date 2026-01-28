import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

type CopyButtonProps = {
  value: string;
  copiedMessage?: string;
  className?: string;
  iconSize?: number;
  ariaLabel?: string;
};

export const CopyButton: React.FC<CopyButtonProps> = ({
  value,
  copiedMessage = "Copied",
  className = "",
  iconSize = 14,
  ariaLabel = "Copy to clipboard",
}) => {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(copiedMessage);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onCopy}
      className={className}
    >
      {copied ? (
        <Check size={iconSize} className="text-emerald-500" />
      ) : (
        <Copy size={iconSize} />
      )}
    </button>
  );
};
