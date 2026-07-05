"use client";

import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import "./Button.css";

type BaseAnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

type StyledLinkProps = BaseAnchorProps &
  NextLinkProps & {
    mini?: boolean;
    fullWidth?: boolean;
    disabled?: boolean;
    children?: ReactNode;
  };

const Link = ({
  className = "",
  onClick,
  title,
  disabled = false,
  children,
  mini = false,
  fullWidth = false,
  tabIndex,
  href,
  ...props
}: StyledLinkProps) => {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onClick?.(event);
  };

  return (
    <NextLink
      href={href}
      className={`link button ${mini ? "button--mini " : ""} ${
        fullWidth ? "button--full-width" : ""
      } ${disabled ? "disabled " : ""}${className}`}
      onClick={handleClick}
      title={title}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : tabIndex}
      {...props}
    >
      {children}
    </NextLink>
  );
};

export const InvertLink = ({
  className = "",
  mini = false,
  children,
  fullWidth = false,
  ...props
}: StyledLinkProps) => {
  return (
    <Link
      className={`button button--invert ${mini ? "button--mini " : ""} ${
        fullWidth ? "button--full-width" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
};

export const PrimaryLink = ({
  className = "",
  children,
  mini = false,
  fullWidth = false,
  ...props
}: StyledLinkProps) => {
  return (
    <Link
      className={`button link button--primary ${className}`}
      mini={mini}
      fullWidth={fullWidth}
      {...props}
    >
      {children}
    </Link>
  );
};

export const PrimaryInvertLink = ({
  className = "",
  children,
  mini = false,
  fullWidth = false,
  ...props
}: StyledLinkProps) => {
  return (
    <Link
      className={`button button--primary-invert ${className}`}
      mini={mini}
      fullWidth={fullWidth}
      {...props}
    >
      {children}
    </Link>
  );
};

export const TextLink = ({
  className = "",
  children,
  mini = false,
  fullWidth = false,
  ...props
}: StyledLinkProps) => {
  return (
    <Link
      className={`button button--text ${className}`}
      mini={mini}
      fullWidth={fullWidth}
      {...props}
    >
      {children}
    </Link>
  );
};

export const TextContrastLink = ({
  className = "",
  children,
  mini = false,
  fullWidth = false,
  ...props
}: StyledLinkProps) => {
  return (
    <Link
      className={`button button--text-contrast ${className}`}
      mini={mini}
      fullWidth={fullWidth}
      {...props}
    >
      {children}
    </Link>
  );
};

export default Link;
