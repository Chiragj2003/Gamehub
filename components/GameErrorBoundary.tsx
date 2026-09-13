"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  /** Called when the player asks to restart after a crash. */
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

/**
 * Contains a crash inside a single game so the page around it — HUD, score
 * modal, navigation — keeps working, and gives the player a way back in.
 * Error boundaries must be class components; hooks cannot catch render errors.
 */
export default class GameErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Game crashed:", error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        className="flex h-full w-full flex-col items-center justify-center gap-4 bg-zinc-950 p-8 text-center"
      >
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight text-white">
            The game hit an error
          </h3>
          <p className="mt-1 max-w-xs text-xs text-zinc-500">
            Your progress in this run is lost, but nothing else is. Restart to try again.
          </p>
        </div>
        <button
          onClick={this.reset}
          className="h-10 cursor-pointer rounded-full bg-white px-6 text-xs font-bold uppercase tracking-wider text-black transition-opacity hover:opacity-90"
        >
          Restart game
        </button>
        {process.env.NODE_ENV !== "production" && (
          <pre className="mt-2 max-w-full overflow-x-auto rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-left text-[10px] text-rose-300">
            {this.state.error.message}
          </pre>
        )}
      </div>
    );
  }
}
