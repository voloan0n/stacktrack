"use client";

import React from "react";
import { CheckLineIcon, CloseLineIcon, PencilIcon, TrashBinIcon } from "@/shared/icons";

type ActionTone = "muted" | "brand" | "success" | "warning" | "error" | "info";

const toneClass = (tone: ActionTone, state: "base" | "hover") => {
  const prefix = state === "hover" ? "hover:" : "";
  if (tone === "brand") return `${prefix}text-brand-600`;
  if (tone === "success") return `${prefix}text-success-600`;
  if (tone === "warning") return `${prefix}text-warning-600`;
  if (tone === "error") return `${prefix}text-error-600`;
  if (tone === "info") return `${prefix}text-info-600`;
  return `${prefix}text-app-muted`;
};

export type IconAction = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  tone?: ActionTone;
};

type Props = {
  confirming?: boolean;
  extraActions?: IconAction[];
  disableExtrasWhileConfirming?: boolean;
  stopPropagation?: boolean;

  editing?: boolean;
  onCancelEdit?: () => void;
  onConfirmEdit?: () => void;
  confirmEditDisabled?: boolean;

  onEdit?: () => void;
  onRequestDelete?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;

  disabled?: boolean;
  editDisabled?: boolean;
  deleteDisabled?: boolean;
  confirmDisabled?: boolean;
};

export default function ActionIconGroup({
  confirming = false,
  extraActions = [],
  disableExtrasWhileConfirming = true,
  stopPropagation = false,

  editing = false,
  onCancelEdit,
  onConfirmEdit,
  confirmEditDisabled = false,

  onEdit,
  onRequestDelete,
  onConfirm,
  onCancel,

  disabled = false,
  editDisabled = false,
  deleteDisabled = false,
  confirmDisabled = false,
}: Props) {
  const handleClick =
    (handler?: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => {
      if (stopPropagation) e.stopPropagation();
      handler?.();
    };

  const baseButtonClass =
    "group flex h-9 w-9 items-center justify-center rounded-lg border border-app bg-app-subtle text-app-muted shadow-theme-xs transition disabled:cursor-not-allowed disabled:opacity-50";

  const extrasDisabled = disabled || (confirming && disableExtrasWhileConfirming);

  return (
    <div className="flex items-center justify-end gap-2">
      {extraActions.map((action) => {
        const tone = action.tone ?? "muted";
        const className = [baseButtonClass, toneClass(tone, "hover")].join(" ").trim();
        return (
          <button
            key={action.key}
            type="button"
            aria-label={action.label}
            title={action.title}
            className={className}
            onClick={handleClick(action.onClick)}
            disabled={extrasDisabled || Boolean(action.disabled)}
          >
            {action.icon}
          </button>
        );
      })}

      {confirming ? (
        <>
          <button
            type="button"
            aria-label="Confirm"
            className={[
              baseButtonClass,
              "border-success-500 bg-success-50 text-success-700 hover:bg-success-50 hover:text-success-700",
              "dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-50",
            ].join(" ")}
            onClick={handleClick(onConfirm)}
            disabled={disabled || confirmDisabled}
          >
            <CheckLineIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Cancel"
            className={[
              baseButtonClass,
              "border-error-500 bg-error-50 text-error-700 hover:bg-error-50 hover:text-error-700",
              "dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-50",
            ].join(" ")}
            onClick={handleClick(onCancel)}
            disabled={disabled}
          >
            <CloseLineIcon className="h-4 w-4" />
          </button>
        </>
      ) : editing ? (
        <>
          <button
            type="button"
            aria-label="Confirm edit"
            className={[
              baseButtonClass,
              "border-success-500 bg-success-50 text-success-700 hover:bg-success-50 hover:text-success-700",
              "dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-50",
            ].join(" ")}
            onClick={handleClick(onConfirmEdit)}
            disabled={disabled || confirmEditDisabled}
          >
            <CheckLineIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Cancel edit"
            className={[
              baseButtonClass,
              "border-error-500 bg-error-50 text-error-700 hover:bg-error-50 hover:text-error-700",
              "dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-50",
            ].join(" ")}
            onClick={handleClick(onCancelEdit)}
            disabled={disabled}
          >
            <CloseLineIcon className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            aria-label="Edit"
            className={[baseButtonClass, "hover:text-brand-600"].join(" ")}
            onClick={handleClick(onEdit)}
            disabled={disabled || editDisabled || editing}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Delete"
            className={[baseButtonClass, "hover:text-error-600"].join(" ")}
            onClick={handleClick(onRequestDelete)}
            disabled={disabled || deleteDisabled}
          >
            <TrashBinIcon className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
