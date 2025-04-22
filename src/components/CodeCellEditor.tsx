import Editor, { OnMount } from "@monaco-editor/react";
import { ImmutableCodeCell } from "@nteract/commutable";
import * as monaco from "monaco-editor";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import getGlobalEnterPressManager from "./globalEnterPressManager";

type CodeCellEditorProps = {
  cell: ImmutableCodeCell;
  onChange: (cell: ImmutableCodeCell) => void;
  requiresFocus?: boolean;
  onFocus?: () => void;
  readOnly?: boolean;
};

const CodeCellEditor: FunctionComponent<CodeCellEditorProps> = ({
  cell,
  onChange,
  requiresFocus,
  onFocus,
  readOnly,
}) => {
  const [editorHeight, setEditorHeight] = useState(35); // Initial height includes scrollbar space
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      const newCell = cell.set("source", value);
      onChange(newCell);

      // Update height after content change
      if (editorRef.current) {
        const contentHeight = Math.max(
          20,
          editorRef.current.getContentHeight(),
        );
        setEditorHeight(contentHeight + 15); // Add space for horizontal scrollbar
      }
    }
  };

  const handleEditorMount: OnMount = useCallback(
    (editor) => {
      // Create and register the focused context key
      const focusedContextKey = editor.createContextKey<boolean>(
        "editorFocused",
        false,
      );

      // we need to disable the default behavior of the editor for the following key commands:
      // - Shift + Enter
      // - Ctrl + Enter
      editor.addCommand(
        monaco.KeyMod.Shift | monaco.KeyCode.Enter,
        () => {
          getGlobalEnterPressManager().shiftEnterCallbacks.forEach((cb) =>
            cb(),
          );
        },
        "editorFocused",
      );
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => {
          getGlobalEnterPressManager().ctrlEnterCallbacks.forEach((cb) => cb());
        },
        "editorFocused",
      );

      // Update context key based on focus state
      editor.onDidFocusEditorText(() => {
        focusedContextKey.set(true);
      });
      editor.onDidBlurEditorText(() => {
        focusedContextKey.set(false);
      });

      editor.onKeyDown((event) => {
        // do not propagate special key events such as "a" and "b"
        if (
          !event.ctrlKey &&
          [
            monaco.KeyCode.KeyA,
            monaco.KeyCode.KeyB,
            monaco.KeyCode.KeyD, // nbfiddle debug
            monaco.KeyCode.KeyX,
          ].includes(event.keyCode)
        ) {
          event.stopPropagation();
        }
      });

      editor.onDidFocusEditorWidget(() => {
        onFocus?.();
      });

      editorRef.current = editor;

      // Initial height calculation
      const contentHeight = Math.max(20, editor.getContentHeight());
      setEditorHeight(contentHeight + 15); // Add space for horizontal scrollbar

      // Add listener for content size changes
      editor.onDidContentSizeChange(() => {
        const newHeight = Math.max(20, editor.getContentHeight());
        setEditorHeight(newHeight + 15); // Add space for horizontal scrollbar
      });
    },
    [onFocus],
  );

  useEffect(() => {
    if (requiresFocus) {
      (async () => {
        const timer = Date.now();
        while (!editorRef.current && Date.now() - timer < 2000) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        editorRef.current?.focus();
      })();
    }
  }, [requiresFocus]);

  return (
    <div style={{ border: "2px solid #e0e0e0", padding: 3 }}>
      <Editor
        height={`${editorHeight}px`}
        defaultLanguage="python"
        value={cell.get("source")}
        onChange={handleEditorChange}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: "off",
          lineDecorationsWidth: 0,
          folding: false,
          fontSize: 14,
          renderLineHighlight: "none",
          theme: "vs",
          scrollbar: {
            vertical: "hidden",
            horizontal: "auto",
            alwaysConsumeMouseWheel: false, // very important so that the wheel events will not get consumed by the editor and we can scroll the main document
          },
          overviewRulerLanes: 0, // hide the overview ruler
          readOnly,
        }}
        onMount={handleEditorMount}
      />
    </div>
  );
};

export default CodeCellEditor;
