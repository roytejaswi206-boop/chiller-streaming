"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * AdSafeWrapper
 *
 * React Error Boundary for third-party advertising components.
 * Guarantees that third-party ad script errors or DOM manipulation crashes
 * never break CHILLER's primary UI, navigation, or playback.
 */
export class AdSafeWrapper extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("[CHILLER Ads] Safely isolated ad error:", error.message, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}
