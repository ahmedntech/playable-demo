import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { failed: boolean }

// Wraps a live preview so a Pixi/WebGL failure (e.g. a lost GL context) shows a
// fallback instead of throwing up the tree and blanking the whole app. Without
// this, one preview's error unmounts the entire React root.
export class PreviewBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch() {
    // swallow — a dead preview is not worth a console wall; recovery is the poster
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
