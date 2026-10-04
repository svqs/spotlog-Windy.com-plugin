interface Design { tokens?: Record<string, unknown>; words?: Record<string, string> }
/** Installed only when the Style Lab advertises its host; returns explicit teardown. */
export function installPreviewBridge(bridge: { inspect?: () => unknown; apply(design: Design): void; goto(where: string): void }): () => void {
    const host = window as unknown as { __spotlogDesignHost?: { ready?: () => void }; __spotlogDesign?: unknown };
    if (!host.__spotlogDesignHost) {return () => undefined;}
    host.__spotlogDesign = bridge;
    host.__spotlogDesignHost.ready?.();
    return () => {if (host.__spotlogDesign === bridge) {delete host.__spotlogDesign;}};
}
