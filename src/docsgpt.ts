// DocsGPT assistant for the Docs pages. Paste the API host and agent API key from your
// DocsGPT instance to switch it on; empty keeps it off and the ask box falls back to search.
// apiHost is the DocsGPT API URL (self-hosted default http://localhost:7091), not the web app URL.
export const DOCSGPT_API_HOST = "https://ask-api.uor.foundation";
export const DOCSGPT_API_KEY = "160d2f26-8781-43d0-b664-3ba1a8442e83";

export const docsgptEnabled = () => DOCSGPT_API_HOST.length > 0 && DOCSGPT_API_KEY.length > 0;

// The subset of the widget's controller ref this site uses (the package does not export the type).
export type DocsGPTController = {
  open: () => void;
  ask: (question: string, options?: { send?: boolean }) => void;
};
