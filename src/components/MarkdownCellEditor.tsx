import Editor, { OnMount } from "@monaco-editor/react";
import { ImmutableMarkdownCell } from "@nteract/commutable";
import * as monaco from "monaco-editor";
import { FunctionComponent, useCallback, useEffect, useRef } from "react";

type MarkdownCellEditorProps = {
  width: number;
  cell: ImmutableMarkdownCell;
  onChange: (cell: ImmutableMarkdownCell) => void;
  onShiftEnter: () => void;
  onCtrlEnter: () => void;
  requiresFocus?: boolean;
};

// we need to do it this way because of some annoying issues with the monaco editor

const globalEnterPressManager = {
  shiftEnterCallbacks: [] as (() => void)[],
  ctrlEnterCallbacks: [] as (() => void)[],
  registerShiftEnterCallback: (callback: () => void) => {
    globalEnterPressManager.shiftEnterCallbacks.push(callback);
  },
  registerCtrlEnterCallback: (callback: () => void) => {
    globalEnterPressManager.ctrlEnterCallbacks.push(callback);
  },
  unregisterShiftEnterCallback: (callback: () => void) => {
    globalEnterPressManager.shiftEnterCallbacks =
      globalEnterPressManager.shiftEnterCallbacks.filter(
        (cb) => cb !== callback,
      );
  },
  unregisterCtrlEnterCallback: (callback: () => void) => {
    globalEnterPressManager.ctrlEnterCallbacks =
      globalEnterPressManager.ctrlEnterCallbacks.filter(
        (cb) => cb !== callback,
      );
  },
};

const MarkdownCellEditor: FunctionComponent<MarkdownCellEditorProps> = ({
  width,
  cell,
  onChange,
  onShiftEnter,
  onCtrlEnter,
  requiresFocus,
}) => {
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      const newCell = cell.set("source", value);
      onChange(newCell);
    }
  };

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    globalEnterPressManager.registerShiftEnterCallback(onShiftEnter);
    globalEnterPressManager.registerCtrlEnterCallback(onCtrlEnter);

    return () => {
      globalEnterPressManager.unregisterShiftEnterCallback(onShiftEnter);
      globalEnterPressManager.unregisterCtrlEnterCallback(onCtrlEnter);
    };
  }, [onShiftEnter, onCtrlEnter]);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      globalEnterPressManager.shiftEnterCallbacks.forEach((cb) => cb());
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      globalEnterPressManager.ctrlEnterCallbacks.forEach((cb) => cb());
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
