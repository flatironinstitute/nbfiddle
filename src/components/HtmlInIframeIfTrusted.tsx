import DOMPurify from "dompurify";
import { FunctionComponent, useMemo } from "react";
import "./html-content-in-cell-output.css";

const HtmlInIframeIfTrusted: FunctionComponent<{
  htmlUnsafeUnlessInsideATrustedIframe: string;
  notebookIsTrusted: boolean;
  setNotebookIsTrusted: (trusted: boolean) => void;
}> = ({
  htmlUnsafeUnlessInsideATrustedIframe,
  notebookIsTrusted,
  setNotebookIsTrusted,
}) => {
  // Generate unique ID for this iframe instance to ensure messages are handled
  // by the correct iframe when multiple instances exist on the page
  const iframeId = useMemo(() => crypto.randomUUID(), []);

  if (
    !htmlUnsafeUnlessInsideATrustedIframe.includes("<script") &&
    !htmlUnsafeUnlessInsideATrustedIframe.includes("<iframe")
  ) {
    // If it doesn't contain any <script> tags (e.g., pandas), then we're going to just sanitize it

    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
        node.setAttribute("rel", "noopener noreferrer"); // when using target="_blank", always add rel="noopener noreferrer" to prevent tabnabbing
      }
    });
    const sanitizedHtml = DOMPurify.sanitize(
      htmlUnsafeUnlessInsideATrustedIframe,
      {
        ADD_ATTR: ["target"], // allow target="_blank" links
      },
    );
    return (
      <div
        className="html-content-in-cell-output"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
  }

  // Otherwise, we'll only display it if the notebook is trusted
  let trustedHtml: string;
  if (notebookIsTrusted) {
    if (htmlUnsafeUnlessInsideATrustedIframe.trim().startsWith("<iframe")) {
      const htmlSafe = DOMPurify.sanitize(
        htmlUnsafeUnlessInsideATrustedIframe,
        { ADD_TAGS: ["iframe"] },
      );
      return <div dangerouslySetInnerHTML={{ __html: htmlSafe }} />;
    }
    trustedHtml = htmlUnsafeUnlessInsideATrustedIframe;
  } else {
    return (
      <div
        style={{
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "5px",
          margin: "10px 0",
        }}
      >
        <p style={{ margin: "0 0 10px 0" }}>
          This notebook contains HTML content that will only be displayed if you
          trust the notebook.
        </p>
        <button
          onClick={() => setNotebookIsTrusted(true)}
          style={{
            padding: "8px 16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Click to trust notebook
        </button>
      </div>
    );
  }

  // Wrap HTML content with base styles and create a sandboxed iframe
  // Doing this without an iframe doesn't work if the html contains scripts to be executed (e.g., Altair)
  const wrappedHtml = `
  <!DOCTYPE html>
  <html>
    <body>${trustedHtml}</body>
  </html>`;
  // Security Note: We want to resize the iframe to fit its content, but we can't use
  // contentWindow.document directly without 'allow-same-origin' in sandbox.
  // Instead, we use a more secure approach with postMessage communication.

  // We inject a resize observer script into the iframe that will monitor content size
  // changes and communicate them back to the parent using postMessage.
  // This avoids needing 'allow-same-origin' while still getting dynamic sizing.
  const wrappedHtmlWithResizeScript = wrappedHtml.replace(
    "</body>",
    `<script>
        const resizeObserver = new ResizeObserver(entries => {
          // Get the full content height and send it to parent
          const height = document.documentElement.scrollHeight;
          // Use postMessage to safely communicate between iframe and parent
          // Include unique iframeId to ensure message is handled by correct instance
          window.parent.postMessage({
            type: 'resize',
            height,
            iframeId: '${iframeId}'
          }, '*'); // '*' is safe here as we verify message origin through iframeId
        });
        resizeObserver.observe(document.body);
      </script>
      </body>`,
  );

  return (
    <iframe
      srcDoc={wrappedHtmlWithResizeScript}
      style={{
        width: "100%",
        border: "none",
        overflow: "hidden",
      }}
      onLoad={(e) => {
        const iframe = e.target as HTMLIFrameElement;

        // Set up message listener for resize events from our iframe
        // We use the unique iframeId to ensure we only handle messages
        // from this specific iframe instance
        const handleMessage = (event: MessageEvent) => {
          if (
            event.data?.type === "resize" &&
            event.data?.iframeId === iframeId
          ) {
            if (event.data.height) {
              iframe.style.height = `${event.data.height}px`;
            }
          }
        };
        window.addEventListener("message", handleMessage);

        // Clean up listener when iframe is unmounted
        return () => window.removeEventListener("message", handleMessage);
      }}
      // Security: We only allow scripts (for resize observer) and downloads
      // We intentionally exclude 'allow-same-origin' to prevent direct DOM access
      // from iframe content to parent window
      // allow opening new tabs with target="_blank" links
      sandbox="allow-scripts allow-downloads"
    />
  );
};

export default HtmlInIframeIfTrusted;
