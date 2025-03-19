import Editor, { OnMount } from "@monaco-editor/react";
import { ImmutableMarkdownCell } from "@nteract/commutable";
import * as monaco from "monaco-editor";
import { FunctionComponent, useCallback, useEffect, useRef } from "react";
import getGlobalEnterPressManager from "./globalEnterPressManager";

type MarkdownCellEditorProps = {
  width: number;
  cell: ImmutableMarkdownCell;
  onChange: (cell: ImmutableMarkdownCell) => void;
  requiresFocus?: boolean;
};

const MarkdownCellEditor: FunctionComponent<MarkdownCellEditorProps> = ({
  width,
  cell,
  onChange,
  requiresFocus,
}) => {
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      const newCell = cell.set("source", value);
      onChange(newCell);
    }
  };

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = useCallback((editor) => {
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
        getGlobalEnterPressManager().shiftEnterCallbacks.forEach((cb) => cb());
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
      if (
        [
          monaco.KeyCode.KeyA,
          monaco.KeyCode.KeyB,
          monaco.KeyCode.KeyX,
        ].includes(event.keyCode)
      ) {
        event.stopPropagation();
      }
    });

    editorRef.current = editor;
  }, []);

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
    <div style={{ border: "2px solid #e0e0e0", padding: 3, width }}>
      <Editor
        height={`${Math.max(1, cell.get("source").split("\n").length) * 20}px`}
        defaultLanguage="markdown"
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
          wordWrap: "on",
        }}
        onMount={handleEditorMount}
      />
    </div>
  );
};

export default MarkdownCellEditor;
