/* eslint-disable @typescript-eslint/no-explicit-any */
import * as executePythonCode from "./tools/executePythonCode";
import * as replaceActiveCell from "./tools/replaceActiveCell";

import { ORFunctionDescription } from "../pages/HomePage/openRouterTypes";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ToolExecutionContext {}

interface NCTool {
  toolFunction: ORFunctionDescription;
  execute: (params: any, o: ToolExecutionContext) => Promise<string>;
  detailedDescription: string;
  requiresPermission: boolean;
}

const staticTools: NCTool[] = [executePythonCode, replaceActiveCell];

export const getAllTools = async () => {
  return [...staticTools] as const;
};

// For backward compatibility with existing imports
export default staticTools;
